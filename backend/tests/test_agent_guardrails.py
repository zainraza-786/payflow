from decimal import Decimal
from datetime import datetime, timezone
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
from app.services.agent.detector import RevenueRiskSignal
from app.services.agent.diagnostician import (
    DiagnosisResult,
    ROOT_CAUSE_TEMPORARY_GATEWAY,
    ROOT_CAUSE_PAYMENT_METHOD,
    ROOT_CAUSE_INSUFFICIENT_FUNDS,
    ROOT_CAUSE_AUTHENTICATION,
    ROOT_CAUSE_REPEATED,
    ROOT_CAUSE_NON_RECOVERABLE,
    ROOT_CAUSE_UNKNOWN,
    RECOVERABILITY_RECOVERABLE,
    RECOVERABILITY_POSSIBLY_RECOVERABLE,
    RECOVERABILITY_NON_RECOVERABLE,
    RECOVERABILITY_UNKNOWN,
)

from app.services.agent.strategy import (
    RecoveryStrategyChoice,
    STRATEGY_DELAYED_RETRY,
    STRATEGY_PAYMENT_LINK,
    STRATEGY_ESCALATE,
    STRATEGY_STOP,
    STRATEGY_REVIEW,
)
from app.services.agent.guardrails import (
    RecoveryGuardrailEngine,
    GuardrailVerdict,
    DECISION_ALLOW,
    DECISION_BLOCK,
    DECISION_HUMAN_APPROVAL,
    DECISION_STOP,
    is_quiet_hours,
)
from app.services.agent.pipeline import process_payment_full_pipeline


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
    # 14:00 UTC = 19:30 IST (outside 22:00-08:00 IST quiet hours)
    return datetime(2026, 8, 26, 14, 0, 0, tzinfo=timezone.utc)


@pytest.fixture
def nighttime_now():
    # 18:00 UTC = 23:30 IST (inside 22:00-08:00 IST quiet hours)
    return datetime(2026, 8, 26, 18, 0, 0, tzinfo=timezone.utc)


# A. Maximum Attempts Tests
def test_guardrail_max_attempts_exceeded(daytime_now):
    payment = Payment(id=1, razorpay_payment_id="pay_attempts", amount=Decimal("100.00"), status="failed")
    payment.recovery_attempts = [
        RecoveryAttempt(id=101, payment_id=1, attempt_number=1, strategy="retry", status="failed"),
        RecoveryAttempt(id=102, payment_id=1, attempt_number=2, strategy="retry", status="failed"),
    ]
    diag = DiagnosisResult(payment_id=1, root_cause=ROOT_CAUSE_TEMPORARY_GATEWAY, recoverability=RECOVERABILITY_RECOVERABLE, confidence=0.9, explanation="Gateway timeout")
    choice = RecoveryStrategyChoice(payment_id=1, strategy=STRATEGY_DELAYED_RETRY, rationale="Retry", confidence=0.9, requires_human_approval=False)

    verdict = RecoveryGuardrailEngine().evaluate(payment, diag, choice, current_time=daytime_now)
    assert verdict.allowed is False
    assert verdict.decision == DECISION_STOP
    assert "Maximum recovery attempts limit" in verdict.reason


# B. High Value Tests
def test_guardrail_high_value_transaction(daytime_now):
    payment_high = Payment(id=2, razorpay_payment_id="pay_high", amount=Decimal("15000.00"), status="failed")
    diag = DiagnosisResult(payment_id=2, root_cause=ROOT_CAUSE_INSUFFICIENT_FUNDS, recoverability=RECOVERABILITY_RECOVERABLE, confidence=0.95, explanation="Low balance")
    choice = RecoveryStrategyChoice(payment_id=2, strategy=STRATEGY_PAYMENT_LINK, rationale="Link", confidence=0.9, requires_human_approval=False)

    verdict = RecoveryGuardrailEngine().evaluate(payment_high, diag, choice, current_time=daytime_now)
    assert verdict.allowed is False
    assert verdict.decision == DECISION_HUMAN_APPROVAL
    assert "High-value transaction" in verdict.reason


# C. Already Captured Tests
def test_guardrail_already_captured(daytime_now):
    payment = Payment(id=3, razorpay_payment_id="pay_captured", amount=Decimal("100.00"), status="captured")
    diag = DiagnosisResult(payment_id=3, root_cause=ROOT_CAUSE_TEMPORARY_GATEWAY, recoverability=RECOVERABILITY_RECOVERABLE, confidence=0.9, explanation="Gateway timeout")
    choice = RecoveryStrategyChoice(payment_id=3, strategy=STRATEGY_DELAYED_RETRY, rationale="Retry", confidence=0.9, requires_human_approval=False)

    verdict = RecoveryGuardrailEngine().evaluate(payment, diag, choice, current_time=daytime_now)
    assert verdict.allowed is False
    assert verdict.decision == DECISION_STOP
    assert "already successful/captured" in verdict.reason


# D. Non-recoverable Tests
def test_guardrail_non_recoverable(daytime_now):
    payment = Payment(id=4, razorpay_payment_id="pay_fraud", amount=Decimal("100.00"), status="failed")
    diag = DiagnosisResult(payment_id=4, root_cause=ROOT_CAUSE_NON_RECOVERABLE, recoverability=RECOVERABILITY_NON_RECOVERABLE, confidence=0.95, explanation="Stolen card")
    choice = RecoveryStrategyChoice(payment_id=4, strategy=STRATEGY_STOP, rationale="Stop", confidence=0.95, requires_human_approval=False)

    verdict = RecoveryGuardrailEngine().evaluate(payment, diag, choice, current_time=daytime_now)
    assert verdict.allowed is False
    assert verdict.decision == DECISION_STOP


# E. Unknown / Review Tests
def test_guardrail_unknown_diagnosis(daytime_now):
    payment = Payment(id=5, razorpay_payment_id="pay_unknown", amount=Decimal("100.00"), status="failed")
    diag = DiagnosisResult(payment_id=5, root_cause=ROOT_CAUSE_UNKNOWN, recoverability=RECOVERABILITY_UNKNOWN, confidence=0.3, explanation="Unknown reason")
    choice = RecoveryStrategyChoice(payment_id=5, strategy=STRATEGY_REVIEW, rationale="Review", confidence=0.3, requires_human_approval=True)

    verdict = RecoveryGuardrailEngine().evaluate(payment, diag, choice, current_time=daytime_now)
    assert verdict.allowed is False
    assert verdict.decision == DECISION_HUMAN_APPROVAL


# F. Repeated Failure Tests
def test_guardrail_repeated_failure(daytime_now):
    payment = Payment(id=6, razorpay_payment_id="pay_rep", amount=Decimal("100.00"), status="failed")
    diag = DiagnosisResult(payment_id=6, root_cause=ROOT_CAUSE_REPEATED, recoverability=RECOVERABILITY_POSSIBLY_RECOVERABLE, confidence=0.85, explanation="Repeated failure")
    choice = RecoveryStrategyChoice(payment_id=6, strategy=STRATEGY_ESCALATE, rationale="Escalate", confidence=0.85, requires_human_approval=True)

    verdict = RecoveryGuardrailEngine().evaluate(payment, diag, choice, current_time=daytime_now)
    assert verdict.allowed is False
    assert verdict.decision == DECISION_HUMAN_APPROVAL


# G. Quiet Hours Tests
def test_quiet_hours_evaluation(daytime_now, nighttime_now):
    # Daytime (19:30 IST): outside quiet hours -> is_quiet_hours returns False
    assert is_quiet_hours(daytime_now, start_hour=22, end_hour=8, tz_name="Asia/Kolkata") is False

    # Nighttime (23:30 IST): inside quiet hours -> is_quiet_hours returns True
    assert is_quiet_hours(nighttime_now, start_hour=22, end_hour=8, tz_name="Asia/Kolkata") is True


def test_guardrail_quiet_hours_blocks_payment_link(nighttime_now):
    payment = Payment(id=7, razorpay_payment_id="pay_link_quiet", amount=Decimal("500.00"), status="failed")
    diag = DiagnosisResult(payment_id=7, root_cause=ROOT_CAUSE_PAYMENT_METHOD, recoverability=RECOVERABILITY_RECOVERABLE, confidence=0.9, explanation="Card expired")
    choice = RecoveryStrategyChoice(payment_id=7, strategy=STRATEGY_PAYMENT_LINK, rationale="Link", confidence=0.9, requires_human_approval=False)

    verdict = RecoveryGuardrailEngine().evaluate(payment, diag, choice, current_time=nighttime_now)
    assert verdict.allowed is False
    assert verdict.decision == DECISION_BLOCK
    assert "quiet hours restriction" in verdict.reason


# H. Valid Allow Evaluation
def test_guardrail_valid_allow(daytime_now):
    payment = Payment(id=8, razorpay_payment_id="pay_allow", amount=Decimal("500.00"), status="failed")
    diag = DiagnosisResult(payment_id=8, root_cause=ROOT_CAUSE_TEMPORARY_GATEWAY, recoverability=RECOVERABILITY_RECOVERABLE, confidence=0.9, explanation="Timeout")
    choice = RecoveryStrategyChoice(payment_id=8, strategy=STRATEGY_DELAYED_RETRY, rationale="Delayed Retry", confidence=0.9, requires_human_approval=False)

    verdict = RecoveryGuardrailEngine().evaluate(payment, diag, choice, current_time=daytime_now)
    assert verdict.allowed is True
    assert verdict.decision == DECISION_ALLOW


# I. Full Pipeline Integration & Audit Trail Test
def test_full_pipeline_guardrail_audit_trail(test_db, daytime_now):
    payment = Payment(
        razorpay_payment_id="pay_pipeline_audit_001",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    signal, diagnosis, choice, verdict, _ = process_payment_full_pipeline(
        payment, db=test_db, current_time=daytime_now
    )


    assert signal.is_at_risk is True
    assert diagnosis.root_cause == ROOT_CAUSE_INSUFFICIENT_FUNDS
    assert choice.strategy == STRATEGY_PAYMENT_LINK
    assert verdict.allowed is True
    assert verdict.decision == DECISION_ALLOW

    # Verify AuditLog entries created by full pipeline
    audits = test_db.query(AuditLog).filter_by(payment_id=payment.id).all()
    assert len(audits) == 4

    events = [a.event for a in audits]
    assert "revenue.risk.detected" in events
    assert "payment.diagnosed" in events
    assert "recovery.strategy.selected" in events
    assert "recovery.guardrail.evaluated" in events

    guard_audit = next(a for a in audits if a.event == "recovery.guardrail.evaluated")
    assert guard_audit.decision == DECISION_ALLOW
    assert guard_audit.guardrail_result == DECISION_ALLOW
    assert "Guardrail evaluation passed" in guard_audit.reason


# J. Safety: Zero External API Calls or Customer Communication
def test_guardrail_engine_zero_external_api_calls(daytime_now):
    payment = Payment(id=9, razorpay_payment_id="pay_no_api", amount=Decimal("100.00"), status="failed")
    diag = DiagnosisResult(payment_id=9, root_cause=ROOT_CAUSE_TEMPORARY_GATEWAY, recoverability=RECOVERABILITY_RECOVERABLE, confidence=0.9, explanation="Timeout")
    choice = RecoveryStrategyChoice(payment_id=9, strategy=STRATEGY_DELAYED_RETRY, rationale="Retry", confidence=0.9, requires_human_approval=False)

    with patch("razorpay.Client") as mock_razorpay, patch("httpx.Client") as mock_httpx:
        verdict = RecoveryGuardrailEngine().evaluate(payment, diag, choice, current_time=daytime_now)
        mock_razorpay.assert_not_called()
        mock_httpx.assert_not_called()
        assert verdict.allowed is True
