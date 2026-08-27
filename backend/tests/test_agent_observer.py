import json
from decimal import Decimal
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, get_db

from app.config import settings
from app.models.payment import Payment
from app.models.recovery_attempt import RecoveryAttempt
from app.models.audit_log import AuditLog
from app.services.agent.observer import PaymentObserver, AttributionResult
from app.services.razorpay.webhook_signature import generate_webhook_signature


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


# 1. Agent Revenue Recovery Attribution Test
def test_valid_payment_captured_observer_with_agent_recovery_attribution(test_db):
    payment = Payment(
        razorpay_payment_id="pay_rec_001",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
    )
    test_db.add(payment)
    test_db.commit()

    attempt = RecoveryAttempt(
        payment_id=payment.id,
        attempt_number=1,
        strategy="PAYMENT_LINK",
        payment_link_id="plink_test_001",
        payment_link_url="https://rzp.io/i/test001",
        status="created",
    )
    test_db.add(attempt)
    test_db.commit()

    observer = PaymentObserver()
    result = observer.process_capture(
        rzp_payment_id="pay_rec_001",
        amount_paise=15000,
        currency="INR",
        db=test_db,
    )

    assert isinstance(result, AttributionResult)
    assert result.payment_id == payment.id
    assert result.is_agent_recovered is True
    assert result.amount_captured == Decimal("150.00")
    assert result.recovery_attempt_id == attempt.id
    assert result.status == "captured"
    assert "Agent recovery attribution verified" in result.summary

    # Assert RecoveryAttempt updated to "recovered"
    test_db.refresh(attempt)
    assert attempt.status == "recovered"

    # Assert AuditLog entry
    audits = test_db.query(AuditLog).filter_by(payment_id=payment.id, event="revenue.recovered").all()
    assert len(audits) == 1
    assert audits[0].decision == "recovered"


# 2. Organic Capture Without Agent Recovery Attempt Test
def test_payment_captured_organic_without_agent_recovery_attempt(test_db):
    payment = Payment(
        razorpay_payment_id="pay_org_001",
        amount=Decimal("250.00"),
        currency="INR",
        status="failed",
    )
    test_db.add(payment)
    test_db.commit()

    observer = PaymentObserver()
    result = observer.process_capture(
        rzp_payment_id="pay_org_001",
        amount_paise=25000,
        currency="INR",
        db=test_db,
    )

    assert result.is_agent_recovered is False
    assert result.amount_captured == Decimal("250.00")
    assert result.recovery_attempt_id is None
    assert "Organic payment captured" in result.summary

    audits = test_db.query(AuditLog).filter_by(payment_id=payment.id, event="payment.captured").all()
    assert len(audits) == 1
    assert audits[0].decision == "captured"


# 3. Duplicate Webhook Idempotency Test
def test_duplicate_payment_captured_webhook_idempotency(test_db):
    payment = Payment(
        razorpay_payment_id="pay_dup_cap",
        amount=Decimal("100.00"),
        currency="INR",
        status="captured",
    )
    test_db.add(payment)
    test_db.commit()

    observer = PaymentObserver()
    result = observer.process_capture(
        rzp_payment_id="pay_dup_cap",
        amount_paise=10000,
        currency="INR",
        db=test_db,
    )

    assert result.status == "duplicate"
    assert result.is_agent_recovered is False

    audits = test_db.query(AuditLog).filter_by(payment_id=payment.id, event="payment.captured").all()
    assert len(audits) == 1
    assert audits[0].decision == "duplicate"


# 4. Unknown Unrecorded Payment Capture Test
def test_unknown_unrecorded_payment_captured(test_db):
    observer = PaymentObserver()
    result = observer.process_capture(
        rzp_payment_id="pay_unrecorded_999",
        amount_paise=50000,
        currency="INR",
        db=test_db,
    )

    assert result.status == "unknown_payment"
    assert result.is_agent_recovered is False
    assert result.amount_captured == Decimal("500.00")

    payment = test_db.query(Payment).filter_by(razorpay_payment_id="pay_unrecorded_999").first()
    assert payment is not None
    assert payment.status == "captured"


# 5. Decimal Money Contract Test
def test_decimal_amount_conversion_paise_to_inr(test_db):
    observer = PaymentObserver()
    result = observer.process_capture(
        rzp_payment_id="pay_decimal_test",
        amount_paise=123456,
        currency="INR",
        db=test_db,
    )

    assert isinstance(result.amount_captured, Decimal)
    assert result.amount_captured == Decimal("1234.56")


# 6. Webhook Endpoint payment.captured End-to-End Test
def test_webhook_route_payment_captured_end_to_end(test_db):
    settings.razorpay_webhook_secret = "test_webhook_secret_phase8"

    payment = Payment(
        razorpay_payment_id="pay_web_cap_001",
        amount=Decimal("300.00"),
        currency="INR",
        status="failed",
    )
    test_db.add(payment)
    test_db.commit()

    test_db.add(
        RecoveryAttempt(
            payment_id=payment.id,
            attempt_number=1,
            strategy="PAYMENT_LINK",
            payment_link_id="plink_web_001",
            payment_link_url="https://rzp.io/i/web001",
            status="created",
        )
    )
    test_db.commit()

    payload_dict = {
        "entity": "event",
        "account_id": "acc_001",
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_web_cap_001",
                    "amount": 30000,
                    "currency": "INR",
                    "status": "captured",
                }
            }
        },
    }

    raw_body_bytes = json.dumps(payload_dict).encode("utf-8")
    valid_signature = generate_webhook_signature(raw_body_bytes, settings.razorpay_webhook_secret)

    app.dependency_overrides[get_db] = lambda: test_db
    try:
        client = TestClient(app)
        response = client.post(
            "/webhooks/razorpay",
            content=raw_body_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Razorpay-Signature": valid_signature,
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200

    res_data = response.json()
    assert res_data["status"] == "ok"
    assert res_data["attribution"]["is_agent_recovered"] is True
    assert Decimal(str(res_data["attribution"]["amount_captured"])) == Decimal("300.00")

