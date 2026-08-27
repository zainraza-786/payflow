from decimal import Decimal
from unittest.mock import patch
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.payment import Payment
from app.models.audit_log import AuditLog
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
    RecoveryStrategySelector,
    RecoveryStrategyChoice,
    STRATEGY_DELAYED_RETRY,
    STRATEGY_PAYMENT_LINK,
    STRATEGY_ESCALATE,
    STRATEGY_STOP,
    STRATEGY_REVIEW,
    ALL_STRATEGIES,
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


def test_strategy_temporary_gateway_failure():
    diag = DiagnosisResult(
        payment_id=1,
        root_cause=ROOT_CAUSE_TEMPORARY_GATEWAY,
        recoverability=RECOVERABILITY_RECOVERABLE,
        confidence=0.90,
        explanation="Temporary gateway timeout",
    )
    choice = RecoveryStrategySelector().select(diag)

    assert isinstance(choice, RecoveryStrategyChoice)
    assert choice.strategy == STRATEGY_DELAYED_RETRY
    assert choice.strategy in ALL_STRATEGIES
    assert choice.requires_human_approval is False
    assert 0.0 <= choice.confidence <= 1.0
    assert len(choice.rationale) > 0


def test_strategy_payment_method_issue():
    diag = DiagnosisResult(
        payment_id=2,
        root_cause=ROOT_CAUSE_PAYMENT_METHOD,
        recoverability=RECOVERABILITY_POSSIBLY_RECOVERABLE,
        confidence=0.90,
        explanation="Card expired",
    )
    choice = RecoveryStrategySelector().select(diag)

    assert choice.strategy == STRATEGY_PAYMENT_LINK
    assert choice.strategy in ALL_STRATEGIES
    assert choice.requires_human_approval is False
    assert 0.0 <= choice.confidence <= 1.0


def test_strategy_insufficient_funds():
    diag = DiagnosisResult(
        payment_id=3,
        root_cause=ROOT_CAUSE_INSUFFICIENT_FUNDS,
        recoverability=RECOVERABILITY_RECOVERABLE,
        confidence=0.95,
        explanation="Low account balance",
    )
    choice = RecoveryStrategySelector().select(diag)

    assert choice.strategy == STRATEGY_PAYMENT_LINK
    assert choice.strategy in ALL_STRATEGIES
    assert choice.requires_human_approval is False
    assert 0.0 <= choice.confidence <= 1.0


def test_strategy_authentication_failure():
    diag = DiagnosisResult(
        payment_id=4,
        root_cause=ROOT_CAUSE_AUTHENTICATION,
        recoverability=RECOVERABILITY_RECOVERABLE,
        confidence=0.90,
        explanation="OTP verification failed",
    )
    choice = RecoveryStrategySelector().select(diag)

    assert choice.strategy == STRATEGY_REVIEW
    assert choice.strategy in ALL_STRATEGIES
    assert choice.requires_human_approval is True
    assert 0.0 <= choice.confidence <= 1.0


def test_strategy_repeated_failure():
    diag = DiagnosisResult(
        payment_id=5,
        root_cause=ROOT_CAUSE_REPEATED,
        recoverability=RECOVERABILITY_POSSIBLY_RECOVERABLE,
        confidence=0.85,
        explanation="Prior attempts failed",
    )
    choice = RecoveryStrategySelector().select(diag)

    assert choice.strategy == STRATEGY_ESCALATE
    assert choice.strategy in ALL_STRATEGIES
    assert choice.requires_human_approval is True
    assert 0.0 <= choice.confidence <= 1.0


def test_strategy_non_recoverable():
    diag = DiagnosisResult(
        payment_id=6,
        root_cause=ROOT_CAUSE_NON_RECOVERABLE,
        recoverability=RECOVERABILITY_NON_RECOVERABLE,
        confidence=0.95,
        explanation="Stolen card decline",
    )
    choice = RecoveryStrategySelector().select(diag)

    assert choice.strategy == STRATEGY_STOP
    assert choice.strategy in ALL_STRATEGIES
    assert choice.requires_human_approval is False
    assert 0.0 <= choice.confidence <= 1.0


def test_strategy_unknown_root_cause():
    diag = DiagnosisResult(
        payment_id=7,
        root_cause=ROOT_CAUSE_UNKNOWN,
        recoverability=RECOVERABILITY_UNKNOWN,
        confidence=0.30,
        explanation="Unrecognized error code",
    )
    choice = RecoveryStrategySelector().select(diag)

    assert choice.strategy == STRATEGY_REVIEW
    assert choice.strategy in ALL_STRATEGIES
    assert choice.requires_human_approval is True
    assert 0.0 <= choice.confidence <= 1.0


def test_strategy_unknown_recoverability():
    diag = DiagnosisResult(
        payment_id=8,
        root_cause=ROOT_CAUSE_PAYMENT_METHOD,
        recoverability=RECOVERABILITY_UNKNOWN,
        confidence=0.30,
        explanation="Recoverability unknown",
    )
    choice = RecoveryStrategySelector().select(diag)

    assert choice.strategy == STRATEGY_REVIEW
    assert choice.requires_human_approval is True


def test_no_razorpay_api_calls_during_strategy_selection():
    diag = DiagnosisResult(
        payment_id=9,
        root_cause=ROOT_CAUSE_INSUFFICIENT_FUNDS,
        recoverability=RECOVERABILITY_RECOVERABLE,
        confidence=0.95,
        explanation="Low balance",
    )
    with patch("razorpay.Client") as mock_client:
        choice = RecoveryStrategySelector().select(diag)
        mock_client.assert_not_called()
        assert choice.strategy == STRATEGY_PAYMENT_LINK


def test_strategy_selection_pipeline_audit_trail(test_db):
    payment = Payment(
        razorpay_payment_id="pay_strat_audit_001",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    signal, diagnosis, choice, verdict, _ = process_payment_full_pipeline(payment, db=test_db)



    assert signal.is_at_risk is True
    assert diagnosis.root_cause == ROOT_CAUSE_INSUFFICIENT_FUNDS
    assert choice.strategy == STRATEGY_PAYMENT_LINK

    audits = test_db.query(AuditLog).filter_by(payment_id=payment.id).all()
    assert len(audits) == 4


    events = [a.event for a in audits]
    assert "revenue.risk.detected" in events
    assert "payment.diagnosed" in events
    assert "recovery.strategy.selected" in events

    strat_audit = next(a for a in audits if a.event == "recovery.strategy.selected")
    assert strat_audit.decision == STRATEGY_PAYMENT_LINK
    assert strat_audit.guardrail_result is None
    assert "Insufficient funds" in strat_audit.reason


def test_invalid_diagnosis_input():
    with pytest.raises(ValueError):
        RecoveryStrategySelector().select(None)
