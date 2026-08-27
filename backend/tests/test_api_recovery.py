import json
from decimal import Decimal
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
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
from app.services.agent.observer import PaymentObserver


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


# 1. Valid Workflow Request with Default execute_allowed=False
def test_api_valid_workflow_request_defaults_execute_false(client, test_db):
    payment = Payment(
        razorpay_payment_id="pay_api_001",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=False):
        with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
            response = client.post(f"/recovery/workflow/{payment.id}", json={})
            assert response.status_code == 200
            data = response.json()

            assert data["payment_id"] == payment.id
            assert data["status"] == "skipped"
            assert data["executed"] is False
            assert data["execution_status"] == "skipped"
            assert data["strategy"] == "PAYMENT_LINK"
            mock_link_api.assert_not_called()


# 2. Payment Not Found -> HTTP 404
def test_api_payment_not_found_returns_404(client):
    response = client.post("/recovery/workflow/99999", json={})
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# 3. Invalid payment_id Zero -> HTTP 400
def test_api_invalid_payment_id_zero_returns_400(client):
    response = client.post("/recovery/workflow/0", json={})
    assert response.status_code == 400
    assert "must be greater than 0" in response.json()["detail"].lower()


# 4. Invalid payment_id Negative -> HTTP 400
def test_api_invalid_payment_id_negative_returns_400(client):
    response = client.post("/recovery/workflow/-5", json={})
    assert response.status_code == 400


# 5. Explicit execute_allowed=false -> Zero Razorpay API Calls
def test_api_execute_allowed_false_zero_api_calls(client, test_db):
    payment = Payment(
        razorpay_payment_id="pay_api_false",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=False):
        with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
            response = client.post(
                f"/recovery/workflow/{payment.id}",
                json={"execute_allowed": False},
            )
            assert response.status_code == 200
            assert response.json()["executed"] is False
            mock_link_api.assert_not_called()


# 6. Guardrail BLOCK -> Zero Razorpay API Calls
def test_api_guardrail_block_zero_api_calls(client, test_db):
    payment = Payment(
        razorpay_payment_id="pay_api_block",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=True):
        with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
            response = client.post(
                f"/recovery/workflow/{payment.id}",
                json={"execute_allowed": True},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["guardrail_decision"] == "BLOCK"
            assert data["executed"] is False
            mock_link_api.assert_not_called()


# 7. Guardrail HUMAN_APPROVAL -> Zero Razorpay API Calls
def test_api_guardrail_human_approval_zero_api_calls(client, test_db):
    payment = Payment(
        razorpay_payment_id="pay_api_high_val",
        amount=Decimal("15000.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=False):
        with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
            response = client.post(
                f"/recovery/workflow/{payment.id}",
                json={"execute_allowed": True},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["guardrail_decision"] == "HUMAN_APPROVAL"
            assert data["executed"] is False
            mock_link_api.assert_not_called()


# 8. Guardrail STOP -> Zero Razorpay API Calls
def test_api_guardrail_stop_zero_api_calls(client, test_db):
    payment = Payment(
        razorpay_payment_id="pay_api_stop",
        amount=Decimal("100.00"),
        currency="INR",
        status="failed",
        failure_reason="Transaction flagged as fraud and blocked",
    )
    test_db.add(payment)
    test_db.commit()

    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=False):
        with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
            response = client.post(
                f"/recovery/workflow/{payment.id}",
                json={"execute_allowed": True},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["guardrail_decision"] == "STOP"
            assert data["executed"] is False
            mock_link_api.assert_not_called()


# 9. Guardrail ALLOW + execute_allowed=true -> Reaches Executor
def test_api_guardrail_allow_execute_true_reaches_executor(client, test_db):
    payment = Payment(
        razorpay_payment_id="pay_api_exec_true",
        amount=Decimal("200.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=False):
        with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
            mock_link_api.return_value = {
                "id": "plink_api_exec_001",
                "short_url": "https://rzp.io/i/apiexec001",
                "status": "created",
            }

            response = client.post(
                f"/recovery/workflow/{payment.id}",
                json={"execute_allowed": True},
            )
            assert response.status_code == 200
            data = response.json()

            assert data["status"] == "completed"
            assert data["executed"] is True
            assert data["payment_link_id"] == "plink_api_exec_001"
            assert data["short_url"] == "https://rzp.io/i/apiexec001"
            mock_link_api.assert_called_once()


# 10. Phase 7 Idempotency Remains Intact via API
def test_api_phase7_idempotency_remains_intact(client, test_db):
    payment = Payment(
        razorpay_payment_id="pay_api_idem",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    test_db.add(
        RecoveryAttempt(
            payment_id=payment.id,
            attempt_number=1,
            strategy="PAYMENT_LINK",
            payment_link_id="plink_existing_api",
            payment_link_url="https://rzp.io/i/existapi",
            status="created",
        )
    )
    test_db.commit()

    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=False):
        with patch("app.services.agent.orchestrator.PaymentDiagnostician.diagnose") as mock_diag:
            from app.services.agent.diagnostician import DiagnosisResult
            mock_diag.return_value = DiagnosisResult(
                payment_id=payment.id,
                root_cause="INSUFFICIENT_FUNDS",
                recoverability="RECOVERABLE",
                confidence=0.95,
                explanation="Single attempt retry",
            )
            with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
                response = client.post(
                    f"/recovery/workflow/{payment.id}",
                    json={"execute_allowed": True},
                )
                assert response.status_code == 200
                data = response.json()

                assert data["executed"] is False
                assert data["execution_status"] == "reused"
                assert data["payment_link_id"] == "plink_existing_api"
                mock_link_api.assert_not_called()


# 11. Phase 8 Attribution Compatibility via API
def test_api_phase8_recovery_attribution_compatibility(client, test_db):
    payment = Payment(
        razorpay_payment_id="pay_api_attr",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=False):
        with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
            mock_link_api.return_value = {
                "id": "plink_api_attr",
                "short_url": "https://rzp.io/i/apiattr",
                "status": "created",
            }

            # Step 1: Run workflow to execute Payment Link
            res1 = client.post(f"/recovery/workflow/{payment.id}", json={"execute_allowed": True})
            assert res1.status_code == 200
            assert res1.json()["executed"] is True

            # Step 2: Observe payment capture
            obs_res = PaymentObserver().process_capture(
                rzp_payment_id="pay_api_attr",
                amount_paise=15000,
                currency="INR",
                db=test_db,
            )
            assert obs_res.is_agent_recovered is True

            # Step 3: Trigger API workflow again on now-captured payment -> stops cleanly
            res2 = client.post(f"/recovery/workflow/{payment.id}", json={"execute_allowed": True})
            assert res2.status_code == 200
            assert res2.json()["status"] == "stopped"
            assert res2.json()["recovered"] is True


# 12. Unexpected Orchestrator Failure -> Safe HTTP 500
def test_api_unexpected_orchestrator_failure_returns_500(client, test_db):
    payment = Payment(
        razorpay_payment_id="pay_api_crash",
        amount=Decimal("100.00"),
        currency="INR",
        status="failed",
    )
    test_db.add(payment)
    test_db.commit()

    with patch("app.api.routes.recovery.RecoveryWorkflowOrchestrator") as mock_orch_cls:
        mock_orch = MagicMock()
        mock_orch.run_workflow.side_effect = RuntimeError("Database connection failure")
        mock_orch_cls.return_value = mock_orch

        response = client.post(f"/recovery/workflow/{payment.id}", json={})
        assert response.status_code == 500
        assert "Internal error" in response.json()["detail"]


# 13. Truthful Response Schema & Secret Protection
def test_api_truthful_response_schema_and_no_secrets(client, test_db):
    payment = Payment(
        razorpay_payment_id="pay_api_secrets",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=False):
        response = client.post(f"/recovery/workflow/{payment.id}", json={})
        assert response.status_code == 200
        res_str = response.text

        assert settings.razorpay_key_secret not in res_str
        assert "RAZORPAY_KEY_SECRET" not in res_str
        data = response.json()
        assert "payment_id" in data
        assert "status" in data
        assert "is_at_risk" in data
        assert "summary" in data
