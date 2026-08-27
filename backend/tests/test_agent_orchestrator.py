from decimal import Decimal
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.payment import Payment
from app.models.recovery_attempt import RecoveryAttempt
from app.models.audit_log import AuditLog
from app.services.agent.orchestrator import RecoveryWorkflowOrchestrator, RecoveryWorkflowResult
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
def daytime_now():
    return datetime(2026, 8, 26, 14, 0, tzinfo=timezone.utc)


@pytest.fixture
def quiet_hours_now():
    return datetime(2026, 8, 26, 23, 0, tzinfo=timezone.utc)


# 1. Complete detection -> diagnosis -> strategy -> guardrail flow (execute_allowed=False)
def test_orchestrator_complete_flow_execute_false(test_db, daytime_now):
    payment = Payment(
        razorpay_payment_id="pay_orch_001",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    orchestrator = RecoveryWorkflowOrchestrator()

    with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
        result = orchestrator.run_workflow(
            payment_id=payment.id,
            db=test_db,
            current_time=daytime_now,
            execute_allowed=False,
        )

        assert isinstance(result, RecoveryWorkflowResult)
        assert result.payment_id == payment.id
        assert result.status == "skipped"
        assert result.is_at_risk is True
        assert result.root_cause == "INSUFFICIENT_FUNDS"
        assert result.strategy == "PAYMENT_LINK"
        assert result.guardrail_decision == "ALLOW"
        assert result.executed is False
        assert result.execution_status == "skipped"
        mock_link_api.assert_not_called()


# 2. Guardrail ALLOW + execute_allowed=True (executor is called)
def test_orchestrator_allow_execute_true(test_db, daytime_now):
    payment = Payment(
        razorpay_payment_id="pay_orch_002",
        amount=Decimal("200.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    orchestrator = RecoveryWorkflowOrchestrator()

    with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
        mock_link_api.return_value = {
            "id": "plink_orch_002",
            "short_url": "https://rzp.io/i/orch002",
            "status": "created",
        }

        result = orchestrator.run_workflow(
            payment_id=payment.id,
            db=test_db,
            current_time=daytime_now,
            execute_allowed=True,
        )

        assert result.status == "completed"
        assert result.executed is True
        assert result.execution_status == "executed"
        assert result.payment_link_id == "plink_orch_002"
        assert result.short_url == "https://rzp.io/i/orch002"
        mock_link_api.assert_called_once()


# 3. Guardrail BLOCK (quiet hours -> executor not called)
def test_orchestrator_guardrail_block_quiet_hours(test_db, quiet_hours_now):
    payment = Payment(
        razorpay_payment_id="pay_orch_block",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    orchestrator = RecoveryWorkflowOrchestrator()

    with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
        result = orchestrator.run_workflow(
            payment_id=payment.id,
            db=test_db,
            current_time=quiet_hours_now,
            execute_allowed=True,
        )

        assert result.status == "blocked"
        assert result.guardrail_decision == "BLOCK"
        assert result.executed is False
        mock_link_api.assert_not_called()


# 4. Guardrail STOP (non-recoverable -> executor not called)
def test_orchestrator_guardrail_stop_non_recoverable(test_db, daytime_now):
    payment = Payment(
        razorpay_payment_id="pay_orch_stop",
        amount=Decimal("100.00"),
        currency="INR",
        status="failed",
        failure_reason="Transaction flagged as fraud and blocked",


    )
    test_db.add(payment)
    test_db.commit()

    orchestrator = RecoveryWorkflowOrchestrator()

    with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
        result = orchestrator.run_workflow(
            payment_id=payment.id,
            db=test_db,
            current_time=daytime_now,
            execute_allowed=True,
        )

        assert result.status == "stopped"
        assert result.guardrail_decision == "STOP"
        assert result.executed is False
        mock_link_api.assert_not_called()


# 5. Guardrail HUMAN_APPROVAL (high value -> executor not called)
def test_orchestrator_guardrail_human_approval_high_value(test_db, daytime_now):
    payment = Payment(
        razorpay_payment_id="pay_orch_high_val",
        amount=Decimal("15000.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    orchestrator = RecoveryWorkflowOrchestrator()

    with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
        result = orchestrator.run_workflow(
            payment_id=payment.id,
            db=test_db,
            current_time=daytime_now,
            execute_allowed=True,
        )

        assert result.status == "blocked"
        assert result.guardrail_decision == "HUMAN_APPROVAL"
        assert result.executed is False
        mock_link_api.assert_not_called()


# 6. UNKNOWN diagnosis (human approval required -> executor not called)
def test_orchestrator_unknown_diagnosis_no_execution(test_db, daytime_now):
    payment = Payment(
        razorpay_payment_id="pay_orch_unknown",
        amount=Decimal("100.00"),
        currency="INR",
        status="failed",
        failure_reason="XYZ_UNRECOGNIZED_CODE_999",
    )
    test_db.add(payment)
    test_db.commit()

    orchestrator = RecoveryWorkflowOrchestrator()

    with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
        result = orchestrator.run_workflow(
            payment_id=payment.id,
            db=test_db,
            current_time=daytime_now,
            execute_allowed=True,
        )

        assert result.root_cause == "UNKNOWN"
        assert result.guardrail_decision == "HUMAN_APPROVAL"
        assert result.executed is False
        mock_link_api.assert_not_called()


# 7. Unsupported strategy (DELAYED_RETRY -> executor not called)
def test_orchestrator_unsupported_strategy_no_execution(test_db, daytime_now):
    payment = Payment(
        razorpay_payment_id="pay_orch_retry",
        amount=Decimal("100.00"),
        currency="INR",
        status="failed",
        failure_reason="Temporary gateway timeout",
    )
    test_db.add(payment)
    test_db.commit()

    orchestrator = RecoveryWorkflowOrchestrator()

    with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
        result = orchestrator.run_workflow(
            payment_id=payment.id,
            db=test_db,
            current_time=daytime_now,
            execute_allowed=True,
        )

        assert result.strategy == "DELAYED_RETRY"
        assert result.executed is False
        mock_link_api.assert_not_called()


# 8. Captured payment (recovery does not execute)
def test_orchestrator_captured_payment_safety(test_db, daytime_now):
    payment = Payment(
        razorpay_payment_id="pay_orch_cap",
        amount=Decimal("100.00"),
        currency="INR",
        status="captured",
    )
    test_db.add(payment)
    test_db.commit()

    orchestrator = RecoveryWorkflowOrchestrator()

    with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
        result = orchestrator.run_workflow(
            payment_id=payment.id,
            db=test_db,
            current_time=daytime_now,
            execute_allowed=True,
        )

        assert result.status == "stopped"
        assert result.is_at_risk is False
        assert result.executed is False
        mock_link_api.assert_not_called()


# 9. Missing payment (safe failure)
def test_orchestrator_missing_payment_safe_failure(test_db):
    orchestrator = RecoveryWorkflowOrchestrator()

    with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
        result = orchestrator.run_workflow(
            payment_id=99999,
            db=test_db,
            execute_allowed=True,
        )

        assert result.status == "failed"
        assert result.is_at_risk is False
        assert result.executed is False
        mock_link_api.assert_not_called()


# 10. Unexpected component failure (fails closed)
def test_orchestrator_unexpected_component_failure(test_db):
    payment = Payment(
        razorpay_payment_id="pay_orch_crash",
        amount=Decimal("100.00"),
        currency="INR",
        status="failed",
    )
    test_db.add(payment)
    test_db.commit()

    orchestrator = RecoveryWorkflowOrchestrator()

    with patch("app.services.agent.orchestrator.PaymentDiagnostician") as mock_diag:
        mock_diag.side_effect = RuntimeError("Simulated unexpected crash")

        result = orchestrator.run_workflow(
            payment_id=payment.id,
            db=test_db,
            execute_allowed=True,
        )

        assert result.status == "failed"
        assert result.executed is False


# 11. Existing Phase 7 executor idempotency remains intact
def test_orchestrator_phase7_idempotency_reuse(test_db, daytime_now):
    payment = Payment(
        razorpay_payment_id="pay_orch_idem",
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
            payment_link_id="plink_existing_999",
            payment_link_url="https://rzp.io/i/exist999",
            status="created",
        )
    )
    test_db.commit()

    orchestrator = RecoveryWorkflowOrchestrator()

    with patch("app.services.agent.orchestrator.PaymentDiagnostician.diagnose") as mock_diag:
        from app.services.agent.diagnostician import DiagnosisResult
        mock_diag.return_value = DiagnosisResult(
            payment_id=payment.id,
            root_cause="INSUFFICIENT_FUNDS",
            recoverability="RECOVERABLE",
            confidence=0.95,
            explanation="Simulated single attempt retry",
        )
        with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
            result = orchestrator.run_workflow(
                payment_id=payment.id,
                db=test_db,
                current_time=daytime_now,
                execute_allowed=True,
            )

            assert result.executed is False
            assert result.execution_status == "reused"
            assert result.payment_link_id == "plink_existing_999"
            mock_link_api.assert_not_called()



# 12. Existing Phase 8 recovery attribution remains intact
def test_orchestrator_phase8_recovery_attribution_compatibility(test_db, daytime_now):
    payment = Payment(
        razorpay_payment_id="pay_orch_attr",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    orchestrator = RecoveryWorkflowOrchestrator()

    with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
        mock_link_api.return_value = {
            "id": "plink_attr_999",
            "short_url": "https://rzp.io/i/attr999",
            "status": "created",
        }

        # Step 1: Run orchestrator to create Payment Link
        wf_res = orchestrator.run_workflow(
            payment_id=payment.id,
            db=test_db,
            current_time=daytime_now,
            execute_allowed=True,
        )
        assert wf_res.executed is True

        # Step 2: Simulate Razorpay payment capture webhook
        obs_res = PaymentObserver().process_capture(
            rzp_payment_id="pay_orch_attr",
            amount_paise=15000,
            currency="INR",
            db=test_db,
        )

        assert obs_res.is_agent_recovered is True
        assert obs_res.amount_captured == Decimal("150.00")

        # Step 3: Re-run orchestrator on now-captured payment -> stops safely
        wf_res_after = orchestrator.run_workflow(
            payment_id=payment.id,
            db=test_db,
            current_time=daytime_now,
            execute_allowed=True,
        )
        assert wf_res_after.status == "stopped"
        assert wf_res_after.recovered is True
