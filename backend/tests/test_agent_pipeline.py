from decimal import Decimal
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.payment import Payment
from app.models.audit_log import AuditLog
from app.services.agent.pipeline import process_payment_risk_and_diagnosis
from app.services.agent.detector import RevenueRiskSignal
from app.services.agent.diagnostician import DiagnosisResult


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


def test_pipeline_execution_and_audit_trail(test_db):
    payment = Payment(
        razorpay_payment_id="pay_pipe_001",
        amount=Decimal("250.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    signal, diagnosis = process_payment_risk_and_diagnosis(payment, db=test_db)

    assert isinstance(signal, RevenueRiskSignal)
    assert signal.is_at_risk is True

    assert isinstance(diagnosis, DiagnosisResult)
    assert diagnosis.root_cause == "INSUFFICIENT_FUNDS"

    # Query audit logs created by pipeline
    audits = test_db.query(AuditLog).filter_by(payment_id=payment.id).all()
    assert len(audits) == 2

    # Event 1: revenue.risk.detected
    audit_detect = next(a for a in audits if a.event == "revenue.risk.detected")
    assert audit_detect.decision == "at_risk"
    assert audit_detect.guardrail_result is None

    # Event 2: payment.diagnosed
    audit_diag = next(a for a in audits if a.event == "payment.diagnosed")
    assert audit_diag.decision == "diagnosed"
    assert audit_diag.guardrail_result is None
    assert "INSUFFICIENT_FUNDS" in audit_diag.reason


def test_pipeline_not_at_risk_captured_payment(test_db):
    payment = Payment(
        razorpay_payment_id="pay_pipe_cap",
        amount=Decimal("500.00"),
        currency="INR",
        status="captured",
    )
    test_db.add(payment)
    test_db.commit()

    signal, diagnosis = process_payment_risk_and_diagnosis(payment, db=test_db)

    assert signal.is_at_risk is False
    assert diagnosis is None

    audits = test_db.query(AuditLog).filter_by(payment_id=payment.id).all()
    assert len(audits) == 1
    assert audits[0].event == "revenue.risk.detected"
    assert audits[0].decision == "not_at_risk"
    assert audits[0].guardrail_result is None
