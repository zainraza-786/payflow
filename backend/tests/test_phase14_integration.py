import json
from decimal import Decimal
from datetime import datetime, timezone
from unittest.mock import patch
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
from app.models.approval import RecoveryApproval
from app.models.audit_log import AuditLog
from app.services.agent.approval import RecoveryApprovalService
from app.services.agent.guardrails import GuardrailVerdict
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


@pytest.fixture
def client(test_db):
    app.dependency_overrides[get_db] = lambda: test_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def daytime_now():
    return datetime(2026, 8, 26, 14, 0, tzinfo=timezone.utc)


def make_failed_payload(rzp_id="pay_e2e_001", amount=1500000):  # ₹15,000.00
    return {
        "entity": "event",
        "account_id": "acc_e2e_001",
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": rzp_id,
                    "amount": amount,
                    "currency": "INR",
                    "status": "failed",
                    "error_description": "Payment failed due to insufficient funds",
                }
            }
        },
    }


def make_captured_payload(rzp_id="pay_e2e_001", amount=1500000):
    return {
        "entity": "event",
        "account_id": "acc_e2e_001",
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": rzp_id,
                    "amount": amount,
                    "currency": "INR",
                    "status": "captured",
                }
            }
        },
    }


# 1. Complete End-to-End Recovery Lifecycle Integration Test
def test_e2e_payment_failure_to_recovery_attribution_lifecycle(client, test_db, daytime_now):
    settings.razorpay_webhook_secret = "secret_phase14_e2e"

    # Step 1: Webhook payment.failed arrives -> persisted -> workflow run (execute_allowed=False)
    fail_payload = make_failed_payload("pay_e2e_lifecycle", amount=1500000)  # ₹15,000 -> HUMAN_APPROVAL
    fail_bytes = json.dumps(fail_payload).encode("utf-8")
    fail_sig = generate_webhook_signature(fail_bytes, settings.razorpay_webhook_secret)

    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=False):
        res1 = client.post(
            "/webhooks/razorpay",
            content=fail_bytes,
            headers={"Content-Type": "application/json", "X-Razorpay-Signature": fail_sig},
        )
        assert res1.status_code == 200

        payment = test_db.query(Payment).filter_by(razorpay_payment_id="pay_e2e_lifecycle").first()
        assert payment is not None
        assert payment.amount == Decimal("15000.00")

        # Step 2: Verify PENDING approval created automatically by HUMAN_APPROVAL guardrail
        approval = test_db.query(RecoveryApproval).filter_by(payment_id=payment.id).first()
        assert approval is not None
        assert approval.approval_status == "PENDING"

        # Step 3: Human explicitly approves via API
        res2 = client.post(f"/recovery/approval/{approval.id}/approve", json={"reason": "Approved by CFO"})
        assert res2.status_code == 200
        assert res2.json()["approval_status"] == "APPROVED"

        # Step 4: Execute approved recovery (patch guardrail evaluate to return ALLOW for approved high-value recovery)
        with patch("app.services.agent.approval.RecoveryGuardrailEngine.evaluate") as mock_eval:
            mock_eval.return_value = GuardrailVerdict(
                payment_id=payment.id,
                allowed=True,
                decision="ALLOW",
                reason="High-value payment approved by human operator",
                guardrails_checked=["high_value_check"],
            )
            with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
                mock_link_api.return_value = {
                    "id": "plink_e2e_exec_001",
                    "short_url": "https://rzp.io/i/e2eexec001",
                    "status": "created",
                }

                res3 = client.post(f"/recovery/approval/{approval.id}/execute")
                assert res3.status_code == 200
                assert res3.json()["executed"] is True
                assert res3.json()["payment_link_id"] == "plink_e2e_exec_001"

        # Step 5: Webhook payment.captured arrives -> Observer attributes recovery
        cap_payload = make_captured_payload("pay_e2e_lifecycle", amount=1500000)
        cap_bytes = json.dumps(cap_payload).encode("utf-8")
        cap_sig = generate_webhook_signature(cap_bytes, settings.razorpay_webhook_secret)

        res4 = client.post(
            "/webhooks/razorpay",
            content=cap_bytes,
            headers={"Content-Type": "application/json", "X-Razorpay-Signature": cap_sig},
        )
        assert res4.status_code == 200
        attr_data = res4.json()["attribution"]
        assert attr_data["is_agent_recovered"] is True
        assert Decimal(str(attr_data["amount_captured"])) == Decimal("15000.00")

        # Step 6: Verify revenue.recovered audit event present
        audits = test_db.query(AuditLog).filter_by(payment_id=payment.id, event="revenue.recovered").all()
        assert len(audits) == 1


# 2. Security: Raw Body HMAC & Secret Redaction Test
def test_security_raw_body_hmac_and_secret_redaction(client):
    settings.razorpay_webhook_secret = "secret_raw_body_test"

    raw_payload = make_failed_payload("pay_sec_001", amount=100000)
    raw_body = json.dumps(raw_payload).encode("utf-8")
    sig = generate_webhook_signature(raw_body, settings.razorpay_webhook_secret)

    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=False):
        response = client.post(
            "/webhooks/razorpay",
            content=raw_body,
            headers={"Content-Type": "application/json", "X-Razorpay-Signature": sig},
        )
        assert response.status_code == 200

    # Test invalid signature redaction
    bad_res = client.post(
        "/webhooks/razorpay",
        content=raw_body,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": "invalid_sig_value"},
    )
    assert bad_res.status_code == 400
    assert settings.razorpay_webhook_secret not in bad_res.text
    assert settings.razorpay_key_secret not in bad_res.text


# 3. Security: Webhook & Approval Cannot Bypass Guardrails Test
def test_security_approval_cannot_bypass_guardrails(test_db):
    payment = Payment(
        razorpay_payment_id="pay_sec_bypass",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
        failure_reason="Transaction flagged as fraud and blocked",
    )
    test_db.add(payment)
    test_db.commit()

    service = RecoveryApprovalService()
    app_res = service.create_pending_approval(test_db, payment.id, "PAYMENT_LINK")
    service.approve(test_db, app_res.id)

    # Even though approval is APPROVED, fraud failure_reason triggers guardrail STOP -> 0 API calls!
    with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
        exec_res = service.execute_approved_recovery(test_db, app_res.id)
        assert exec_res.executed is False
        assert exec_res.status == "blocked"
        mock_link_api.assert_not_called()


# 4. Idempotency: Duplicate Webhooks and Organic Captures
def test_idempotency_duplicate_webhooks_and_organic_captures(client, test_db):
    settings.razorpay_webhook_secret = "secret_idem_phase14"

    # Organic capture without agent attempt -> is_agent_recovered is False
    cap_payload = make_captured_payload("pay_organic_001", amount=50000)
    cap_bytes = json.dumps(cap_payload).encode("utf-8")
    cap_sig = generate_webhook_signature(cap_bytes, settings.razorpay_webhook_secret)

    res1 = client.post(
        "/webhooks/razorpay",
        content=cap_bytes,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": cap_sig},
    )
    assert res1.status_code == 200
    assert res1.json()["attribution"]["is_agent_recovered"] is False

    # Redelivery duplicate organic capture -> idempotent
    res2 = client.post(
        "/webhooks/razorpay",
        content=cap_bytes,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": cap_sig},
    )
    assert res2.status_code == 200
    assert res2.json()["attribution"]["is_agent_recovered"] is False


# 5. Money Safety: Decimal Precision & Paise Conversion
def test_money_safety_decimal_precision(client, test_db):
    settings.razorpay_webhook_secret = "secret_money_phase14"

    payload = make_failed_payload("pay_money_001", amount=15050)  # ₹150.50
    body_bytes = json.dumps(payload).encode("utf-8")
    sig = generate_webhook_signature(body_bytes, settings.razorpay_webhook_secret)

    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=False):
        res = client.post(
            "/webhooks/razorpay",
            content=body_bytes,
            headers={"Content-Type": "application/json", "X-Razorpay-Signature": sig},
        )
        assert res.status_code == 200

        payment = test_db.query(Payment).filter_by(razorpay_payment_id="pay_money_001").first()
        assert payment.amount == Decimal("150.50")
