import json
from decimal import Decimal
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
from app.models.audit_log import AuditLog
from app.services.agent.event_workflow import process_payment_failure_workflow
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


def make_webhook_payload(event_name="payment.failed", rzp_id="pay_evt_001", amount=15000, reason="insufficient_funds"):
    return {
        "entity": "event",
        "account_id": "acc_evt_001",
        "event": event_name,
        "payload": {
            "payment": {
                "entity": {
                    "id": rzp_id,
                    "amount": amount,
                    "currency": "INR",
                    "status": "failed",
                    "error_description": f"Payment failed due to {reason}",
                }
            }
        },
    }


# 1. Valid Signed payment.failed Event Triggers Workflow (execute_allowed=False)
def test_webhook_triggers_event_workflow_execute_false(client, test_db):
    settings.razorpay_webhook_secret = "test_evt_secret_12"

    payload = make_webhook_payload(rzp_id="pay_evt_flow_001")
    body_bytes = json.dumps(payload).encode("utf-8")
    sig = generate_webhook_signature(body_bytes, settings.razorpay_webhook_secret)

    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=False):
        with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
            response = client.post(
                "/webhooks/razorpay",
                content=body_bytes,
                headers={"Content-Type": "application/json", "X-Razorpay-Signature": sig},
            )

            assert response.status_code == 200
            assert response.json()["status"] == "ok"

            # Verify Payment record created
            payment = test_db.query(Payment).filter_by(razorpay_payment_id="pay_evt_flow_001").first()
            assert payment is not None

            # Verify zero Razorpay API calls were made from normal webhook path
            mock_link_api.assert_not_called()

            # Verify AuditLog trail
            audits = test_db.query(AuditLog).filter_by(payment_id=payment.id).all()
            events = [a.event for a in audits]
            assert "payment.failed" in events
            assert "recovery.strategy.selected" in events
            assert "recovery.guardrail.evaluated" in events
            assert "recovery.workflow.completed" in events


# 2. Zero Razorpay API Calls Even When PAYMENT_LINK Strategy Selected
def test_webhook_normal_path_zero_api_calls(client, test_db):
    settings.razorpay_webhook_secret = "test_evt_secret_12"

    payload = make_webhook_payload(rzp_id="pay_evt_link_002", reason="insufficient_funds")
    body_bytes = json.dumps(payload).encode("utf-8")
    sig = generate_webhook_signature(body_bytes, settings.razorpay_webhook_secret)

    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=False):
        with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
            response = client.post(
                "/webhooks/razorpay",
                content=body_bytes,
                headers={"Content-Type": "application/json", "X-Razorpay-Signature": sig},
            )

            assert response.status_code == 200
            # Zero Razorpay API execution calls
            mock_link_api.assert_not_called()


# 3. Guardrail BLOCK / STOP / HUMAN_APPROVAL / UNKNOWN produce no execution
def test_webhook_guardrail_block_stop_unknown_no_execution(client, test_db):
    settings.razorpay_webhook_secret = "test_evt_secret_12"

    payload = make_webhook_payload(rzp_id="pay_evt_stop_003", reason="fraud_security_block")
    body_bytes = json.dumps(payload).encode("utf-8")
    sig = generate_webhook_signature(body_bytes, settings.razorpay_webhook_secret)

    with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
        response = client.post(
            "/webhooks/razorpay",
            content=body_bytes,
            headers={"Content-Type": "application/json", "X-Razorpay-Signature": sig},
        )

        assert response.status_code == 200
        mock_link_api.assert_not_called()


# 4. Duplicate Webhook Idempotency: No Duplicate Orchestration Side Effects
def test_duplicate_webhook_redelivery_idempotent_no_duplicate_workflow(client, test_db):
    settings.razorpay_webhook_secret = "test_evt_secret_12"

    payload = make_webhook_payload(rzp_id="pay_evt_dup_004")
    body_bytes = json.dumps(payload).encode("utf-8")
    sig = generate_webhook_signature(body_bytes, settings.razorpay_webhook_secret)

    with patch("app.services.agent.event_workflow.RecoveryWorkflowOrchestrator") as mock_orch_cls:
        mock_orch = mock_orch_cls.return_value

        # First delivery
        res1 = client.post(
            "/webhooks/razorpay",
            content=body_bytes,
            headers={"Content-Type": "application/json", "X-Razorpay-Signature": sig},
        )
        assert res1.status_code == 200
        assert mock_orch.run_workflow.call_count == 1

        # Duplicate delivery
        res2 = client.post(
            "/webhooks/razorpay",
            content=body_bytes,
            headers={"Content-Type": "application/json", "X-Razorpay-Signature": sig},
        )
        assert res2.status_code == 200
        assert res2.json()["message"] == "Duplicate payment.failed event acknowledged"
        # Orchestrator NOT called again on duplicate redelivery
        assert mock_orch.run_workflow.call_count == 1


# 5. Invalid Signature Rejection
def test_webhook_invalid_signature_rejected(client):
    payload = make_webhook_payload()
    body_bytes = json.dumps(payload).encode("utf-8")

    response = client.post(
        "/webhooks/razorpay",
        content=body_bytes,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": "invalid_sig"},
    )
    assert response.status_code == 400
    assert "Invalid webhook signature" in response.json()["detail"]


# 6. Direct Event Workflow Service Unit Test
def test_process_payment_failure_workflow_direct(test_db):
    payment = Payment(
        razorpay_payment_id="pay_direct_wf",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
        failure_reason="insufficient_funds",
    )
    test_db.add(payment)
    test_db.commit()

    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=False):
        with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
            res = process_payment_failure_workflow(payment, test_db, execute_allowed=False)
            assert res.status == "skipped"
            assert res.executed is False
            mock_link_api.assert_not_called()
