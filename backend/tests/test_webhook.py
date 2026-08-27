import json
import hashlib
import hmac
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from sqlalchemy.pool import StaticPool
from app.main import app
from app.config import settings
from app.database import Base, get_db
from app.models.payment import Payment
from app.models.audit_log import AuditLog
from app.services.razorpay.webhook_signature import verify_webhook_signature

TEST_SECRET = "whsec_test_secret_key_12345"


def generate_signature(body_bytes: bytes, secret: str = TEST_SECRET) -> str:
    return hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()


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



@pytest.fixture
def client(test_db, monkeypatch):
    monkeypatch.setattr(settings, "razorpay_webhook_secret", TEST_SECRET)

    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.clear()


def make_failed_payment_payload(
    payment_id="pay_test_failed_001",
    amount=10000,
    currency="INR",
    error_reason="insufficient_funds",
):
    return {
        "entity": "event",
        "account_id": "acc_test_123",
        "event": "payment.failed",
        "contains": ["payment"],
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "entity": "payment",
                    "amount": amount,
                    "currency": currency,
                    "status": "failed",
                    "method": "card",
                    "error_code": "BAD_REQUEST_ERROR",
                    "error_description": "Payment failed due to insufficient funds.",
                    "error_reason": error_reason,
                    "created_at": 1600000000,
                }
            }
        },
        "created_at": 1600000000,
    }


def test_signature_verification_unit():
    raw_body = b'{"event":"test"}'
    valid_sig = generate_signature(raw_body, TEST_SECRET)

    assert verify_webhook_signature(raw_body, valid_sig, TEST_SECRET) is True
    assert verify_webhook_signature(raw_body, "invalid_signature", TEST_SECRET) is False
    assert verify_webhook_signature(raw_body, None, TEST_SECRET) is False
    assert verify_webhook_signature(raw_body, valid_sig, None) is False
    assert verify_webhook_signature(raw_body, valid_sig, "wrong_secret") is False


def test_webhook_missing_signature_header(client):
    body_bytes = json.dumps(make_failed_payment_payload()).encode("utf-8")
    response = client.post("/webhooks/razorpay", content=body_bytes)
    assert response.status_code == 400
    assert "Missing X-Razorpay-Signature header" in response.json()["detail"]


def test_webhook_invalid_signature(client):
    body_bytes = json.dumps(make_failed_payment_payload()).encode("utf-8")
    headers = {"X-Razorpay-Signature": "invalid_sig_abc"}
    response = client.post("/webhooks/razorpay", content=body_bytes, headers=headers)
    assert response.status_code == 400
    assert "Invalid webhook signature" in response.json()["detail"]


def test_webhook_malformed_json(client):
    body_bytes = b"not_valid_json{{{"
    sig = generate_signature(body_bytes, TEST_SECRET)
    headers = {"X-Razorpay-Signature": sig}
    response = client.post("/webhooks/razorpay", content=body_bytes, headers=headers)
    assert response.status_code == 400
    assert "Malformed JSON payload" in response.json()["detail"]


def test_webhook_unsupported_event(client):
    payload = make_failed_payment_payload()
    payload["event"] = "order.paid"

    body_bytes = json.dumps(payload).encode("utf-8")
    sig = generate_signature(body_bytes, TEST_SECRET)
    headers = {"X-Razorpay-Signature": sig}

    response = client.post("/webhooks/razorpay", content=body_bytes, headers=headers)
    assert response.status_code == 400
    assert "Unsupported webhook event type" in response.json()["detail"]


def test_webhook_missing_payment_id(client):
    payload = make_failed_payment_payload()
    payload["payload"]["payment"]["entity"]["id"] = None
    body_bytes = json.dumps(payload).encode("utf-8")
    sig = generate_signature(body_bytes, TEST_SECRET)
    headers = {"X-Razorpay-Signature": sig}

    response = client.post("/webhooks/razorpay", content=body_bytes, headers=headers)
    assert response.status_code == 400
    assert "Missing required payment fields" in response.json()["detail"]


def test_webhook_valid_payment_failed_persisted(client, test_db):
    payload = make_failed_payment_payload(
        payment_id="pay_fail_999",
        amount=15050,  # ₹150.50
        currency="INR",
        error_reason="insufficient_funds",
    )
    body_bytes = json.dumps(payload).encode("utf-8")
    sig = generate_signature(body_bytes, TEST_SECRET)
    headers = {"X-Razorpay-Signature": sig}

    response = client.post("/webhooks/razorpay", content=body_bytes, headers=headers)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["status"] == "ok"

    # Verify Payment persisted
    payment = test_db.query(Payment).filter_by(razorpay_payment_id="pay_fail_999").first()
    assert payment is not None
    assert payment.amount == Decimal("150.50")
    assert payment.currency == "INR"
    assert payment.status == "failed"
    assert "insufficient" in payment.failure_reason.lower()

    # Verify AuditLog created
    audit = test_db.query(AuditLog).filter_by(payment_id=payment.id).first()
    assert audit is not None
    assert audit.event == "payment.failed"
    assert audit.decision == "detected"
    assert "Revenue risk detected" in audit.reason


def test_webhook_idempotency_duplicate_redelivery(client, test_db):
    payload = make_failed_payment_payload(payment_id="pay_dup_webhook_001", amount=5000)
    body_bytes = json.dumps(payload).encode("utf-8")
    sig = generate_signature(body_bytes, TEST_SECRET)
    headers = {"X-Razorpay-Signature": sig}

    # First delivery
    res1 = client.post("/webhooks/razorpay", content=body_bytes, headers=headers)
    assert res1.status_code == 200
    assert res1.json()["message"] == "payment.failed event processed and recorded"

    # Second delivery (duplicate webhook)
    res2 = client.post("/webhooks/razorpay", content=body_bytes, headers=headers)
    assert res2.status_code == 200
    assert res2.json()["message"] == "Duplicate payment.failed event acknowledged"

    # Verify no duplicate Payment record created
    payments = test_db.query(Payment).filter_by(razorpay_payment_id="pay_dup_webhook_001").all()
    assert len(payments) == 1

    # Verify audit logs: initial detected, workflow events, and duplicate redelivery entry
    audits = test_db.query(AuditLog).filter_by(payment_id=payments[0].id).all()
    assert len(audits) == 5
    decisions = [a.decision for a in audits]

    assert "detected" in decisions
    assert "duplicate" in decisions


def test_webhook_secret_not_logged_on_error(client, monkeypatch):
    # Verify that secret never appears in error messages
    monkeypatch.setattr(settings, "razorpay_webhook_secret", TEST_SECRET)
    body_bytes = json.dumps(make_failed_payment_payload()).encode("utf-8")
    headers = {"X-Razorpay-Signature": "invalid"}

    response = client.post("/webhooks/razorpay", content=body_bytes, headers=headers)
    assert response.status_code == 400
    assert TEST_SECRET not in response.text
