from decimal import Decimal
from unittest.mock import patch
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.config import settings
from app.models.payment import Payment
from app.models.recovery_attempt import RecoveryAttempt
from app.models.audit_log import AuditLog
from app.services.agent.guardrails import (
    GuardrailVerdict,
    DECISION_ALLOW,
    DECISION_BLOCK,
    DECISION_HUMAN_APPROVAL,
    DECISION_STOP,
)
from app.services.agent.strategy import (
    RecoveryStrategyChoice,
    STRATEGY_PAYMENT_LINK,
    STRATEGY_DELAYED_RETRY,
    STRATEGY_ESCALATE,
    STRATEGY_STOP,
    STRATEGY_REVIEW,
)
from app.services.agent.executor import RecoveryExecutor, ExecutionResult
from app.services.razorpay.exceptions import RazorpayAPIError


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
def allowed_verdict():
    return GuardrailVerdict(
        payment_id=1,
        allowed=True,
        decision=DECISION_ALLOW,
        reason="Guardrail passed",
        guardrails_checked=["all"],
    )


@pytest.fixture
def payment_link_choice():
    return RecoveryStrategyChoice(
        payment_id=1,
        strategy=STRATEGY_PAYMENT_LINK,
        rationale="Send Payment Link",
        confidence=0.9,
        requires_human_approval=False,
    )


# A. Successful Execution Test
def test_executor_successful_payment_link_creation(test_db, allowed_verdict, payment_link_choice):
    payment = Payment(
        razorpay_payment_id="pay_exec_001",
        amount=Decimal("150.50"),
        currency="INR",
        status="failed",
    )
    test_db.add(payment)
    test_db.commit()

    allowed_verdict.payment_id = payment.id
    payment_link_choice.payment_id = payment.id

    mock_pl_response = {
        "id": "plink_test_999",
        "short_url": "https://rzp.io/i/test999",
        "status": "created",
        "amount": 15050,
    }

    with patch("app.services.agent.executor.create_payment_link", return_value=mock_pl_response) as mock_create:
        executor = RecoveryExecutor()
        result = executor.execute(payment, allowed_verdict, payment_link_choice, db=test_db)

        mock_create.assert_called_once_with(
            amount=Decimal("150.50"),
            currency="INR",
            reference_id=f"rec_{payment.id}_1",
            description=f"Payment recovery link for invoice payment #{payment.razorpay_payment_id}",
        )

        assert isinstance(result, ExecutionResult)
        assert result.executed is True
        assert result.status == "executed"
        assert result.attempt_number == 1
        assert result.payment_link_id == "plink_test_999"
        assert result.short_url == "https://rzp.io/i/test999"

        # Verify RecoveryAttempt DB record
        attempts = test_db.query(RecoveryAttempt).filter_by(payment_id=payment.id).all()
        assert len(attempts) == 1
        assert attempts[0].attempt_number == 1
        assert attempts[0].payment_link_id == "plink_test_999"
        assert attempts[0].payment_link_url == "https://rzp.io/i/test999"


        # Verify AuditLog entries
        audits = test_db.query(AuditLog).filter_by(payment_id=payment.id).all()
        events = [a.event for a in audits]
        assert "recovery.execution.started" in events
        assert "recovery.payment_link.created" in events


# B. Guardrail Bypass Protection Tests
@pytest.mark.parametrize(
    "verdict_input",
    [
        None,
        GuardrailVerdict(payment_id=1, allowed=False, decision=DECISION_BLOCK, reason="Blocked"),
        GuardrailVerdict(payment_id=1, allowed=False, decision=DECISION_STOP, reason="Stopped"),
        GuardrailVerdict(payment_id=1, allowed=False, decision=DECISION_HUMAN_APPROVAL, reason="Approval needed"),
        GuardrailVerdict(payment_id=1, allowed=True, decision="SOME_OTHER_DECISION", reason="Mismatch"),
    ],
)
def test_executor_guardrail_bypass_protection(test_db, payment_link_choice, verdict_input):
    payment = Payment(id=1, razorpay_payment_id="pay_block", amount=Decimal("100.00"), status="failed")
    test_db.add(payment)
    test_db.commit()

    with patch("app.services.agent.executor.create_payment_link") as mock_create:
        executor = RecoveryExecutor()
        result = executor.execute(payment, verdict_input, payment_link_choice, db=test_db)

        mock_create.assert_not_called()
        assert result.executed is False
        assert result.status == "blocked"

        attempts = test_db.query(RecoveryAttempt).filter_by(payment_id=payment.id).all()
        assert len(attempts) == 0


# C. Unsupported Strategy Tests
@pytest.mark.parametrize(
    "unsupported_strat",
    [STRATEGY_DELAYED_RETRY, STRATEGY_ESCALATE, STRATEGY_REVIEW, STRATEGY_STOP],
)
def test_executor_unsupported_strategies(test_db, allowed_verdict, unsupported_strat):
    payment = Payment(id=1, razorpay_payment_id="pay_strat", amount=Decimal("100.00"), status="failed")
    test_db.add(payment)
    test_db.commit()

    choice = RecoveryStrategyChoice(payment_id=1, strategy=unsupported_strat, rationale="Unapplied")

    with patch("app.services.agent.executor.create_payment_link") as mock_create:
        executor = RecoveryExecutor()
        result = executor.execute(payment, allowed_verdict, choice, db=test_db)

        mock_create.assert_not_called()
        assert result.executed is False
        assert result.status == "skipped"


# D. Captured Payment Safety Test
def test_executor_captured_payment_safety(test_db, allowed_verdict, payment_link_choice):
    payment = Payment(id=1, razorpay_payment_id="pay_cap", amount=Decimal("100.00"), status="captured")
    test_db.add(payment)
    test_db.commit()

    with patch("app.services.agent.executor.create_payment_link") as mock_create:
        executor = RecoveryExecutor()
        result = executor.execute(payment, allowed_verdict, payment_link_choice, db=test_db)

        mock_create.assert_not_called()
        assert result.executed is False
        assert result.status == "skipped"


# E. Maximum Attempts Safety Test
def test_executor_max_attempts_safety(test_db, allowed_verdict, payment_link_choice):
    payment = Payment(id=1, razorpay_payment_id="pay_max", amount=Decimal("100.00"), status="failed")
    test_db.add(payment)
    test_db.commit()

    # Pre-insert 2 attempts
    test_db.add(RecoveryAttempt(payment_id=payment.id, attempt_number=1, strategy="PAYMENT_LINK", status="failed"))
    test_db.add(RecoveryAttempt(payment_id=payment.id, attempt_number=2, strategy="PAYMENT_LINK", status="failed"))
    test_db.commit()

    with patch("app.services.agent.executor.create_payment_link") as mock_create:
        executor = RecoveryExecutor()
        result = executor.execute(payment, allowed_verdict, payment_link_choice, db=test_db)

        mock_create.assert_not_called()
        assert result.executed is False
        assert result.status == "blocked"
        assert "Maximum recovery attempts limit" in result.error


# F. Idempotency & Duplicate Execution Test
def test_executor_duplicate_execution_reuse(test_db, allowed_verdict, payment_link_choice):
    payment = Payment(id=1, razorpay_payment_id="pay_dup", amount=Decimal("100.00"), status="failed")
    test_db.add(payment)
    test_db.commit()

    # Pre-insert existing successful PAYMENT_LINK attempt
    test_db.add(
        RecoveryAttempt(
            payment_id=payment.id,
            attempt_number=1,
            strategy="PAYMENT_LINK",
            payment_link_id="plink_existing_123",
            payment_link_url="https://rzp.io/i/exist123",
            status="created",
        )

    )
    test_db.commit()

    with patch("app.services.agent.executor.create_payment_link") as mock_create:
        executor = RecoveryExecutor()
        result = executor.execute(payment, allowed_verdict, payment_link_choice, db=test_db)

        mock_create.assert_not_called()
        assert result.executed is False
        assert result.status == "reused"
        assert result.payment_link_id == "plink_existing_123"
        assert result.short_url == "https://rzp.io/i/exist123"


# G. Razorpay API Failure Handling & Atomic DB Rollback
def test_executor_api_failure_rollback(test_db, allowed_verdict, payment_link_choice):
    payment = Payment(id=1, razorpay_payment_id="pay_err", amount=Decimal("100.00"), status="failed")
    test_db.add(payment)
    test_db.commit()

    secret = "secret_key_super_top_secret"
    settings.razorpay_key_secret = secret

    with patch(
        "app.services.agent.executor.create_payment_link",
        side_effect=RazorpayAPIError(f"Razorpay server 500 error with secret {secret}"),
    ):
        executor = RecoveryExecutor()
        result = executor.execute(payment, allowed_verdict, payment_link_choice, db=test_db)

        assert result.executed is False
        assert result.status == "failed"
        assert secret not in result.error
        assert "[REDACTED]" in result.error

        # Verify no successful RecoveryAttempt record was created
        attempts = test_db.query(RecoveryAttempt).filter_by(payment_id=payment.id).all()
        assert len(attempts) == 0

        # Verify audit record for failure
        audits = test_db.query(AuditLog).filter_by(payment_id=payment.id, event="recovery.execution.failed").all()
        assert len(audits) == 1
