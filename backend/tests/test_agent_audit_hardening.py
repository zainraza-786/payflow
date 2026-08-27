from decimal import Decimal
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.exc import IntegrityError

from app.database import Base
from app.models.payment import Payment
from app.models.recovery_attempt import RecoveryAttempt
from app.models.audit_log import AuditLog
from app.services.agent.audit import AuditService, get_audit_history, get_payment_recovery_summary


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


# 1. Chronological Audit Trail Retrieval Test
def test_audit_history_chronological_order(test_db):
    payment = Payment(razorpay_payment_id="pay_audit_chrono", amount=Decimal("100.00"), status="failed")
    test_db.add(payment)
    test_db.commit()

    service = AuditService()
    now = datetime.now(timezone.utc)

    # Insert 3 audit logs with explicit timestamps
    a1 = service.record(test_db, payment.id, "revenue.risk.detected", "at_risk", "Reason 1")
    a2 = service.record(test_db, payment.id, "payment.diagnosed", "diagnosed", "Reason 2")
    a3 = service.record(test_db, payment.id, "recovery.strategy.selected", "PAYMENT_LINK", "Reason 3")

    history = get_audit_history(test_db, payment.id)
    assert len(history) == 3
    assert history[0].event == "revenue.risk.detected"
    assert history[1].event == "payment.diagnosed"
    assert history[2].event == "recovery.strategy.selected"
    assert history[0].timestamp <= history[1].timestamp <= history[2].timestamp


# 2. Foreign Key Constraint Enforcement Test
def test_foreign_key_rejection(test_db):
    attempt = RecoveryAttempt(payment_id=99999, attempt_number=1, strategy="PAYMENT_LINK", status="pending")
    test_db.add(attempt)
    with pytest.raises(IntegrityError):
        test_db.commit()
    test_db.rollback()


# 3. CheckConstraint on Attempt Number Test
def test_attempt_number_positive_constraint(test_db):
    payment = Payment(razorpay_payment_id="pay_check_att", amount=Decimal("100.00"), status="failed")
    test_db.add(payment)
    test_db.commit()

    attempt_zero = RecoveryAttempt(payment_id=payment.id, attempt_number=0, strategy="PAYMENT_LINK", status="pending")
    test_db.add(attempt_zero)
    with pytest.raises(IntegrityError):
        test_db.commit()
    test_db.rollback()


# 4. Relationship Cascade and Integrity Test
def test_payment_relationship_cascade_and_integrity(test_db):
    payment = Payment(razorpay_payment_id="pay_cascade", amount=Decimal("200.00"), status="failed")
    test_db.add(payment)
    test_db.commit()

    test_db.add(RecoveryAttempt(payment_id=payment.id, attempt_number=1, strategy="PAYMENT_LINK", status="created"))
    test_db.add(AuditLog(payment_id=payment.id, event="revenue.risk.detected", decision="at_risk"))
    test_db.commit()

    assert len(payment.recovery_attempts) == 1
    assert len(payment.audit_logs) == 1

    # Delete payment -> cascade delete children
    test_db.delete(payment)
    test_db.commit()

    assert test_db.query(RecoveryAttempt).filter_by(payment_id=payment.id).count() == 0
    assert test_db.query(AuditLog).filter_by(payment_id=payment.id).count() == 0


# 5. Payment Recovery Summary Function Test
def test_payment_recovery_summary(test_db):
    payment = Payment(razorpay_payment_id="pay_summary_001", amount=Decimal("500.00"), status="failed", failure_reason="insufficient_funds")
    test_db.add(payment)
    test_db.commit()

    AuditService().record(test_db, payment.id, "revenue.risk.detected", "at_risk", "Failed payment")
    AuditService().record(test_db, payment.id, "payment.diagnosed", "diagnosed", "INSUFFICIENT_FUNDS")
    AuditService().record(test_db, payment.id, "recovery.strategy.selected", "PAYMENT_LINK", "Send link")

    summary = get_payment_recovery_summary(test_db, payment.id)
    assert summary is not None
    assert summary["payment_id"] == payment.id
    assert summary["razorpay_payment_id"] == "pay_summary_001"
    assert summary["amount"] == Decimal("500.00")
    assert len(summary["audit_history"]) == 3
    assert summary["audit_history"][0]["event"] == "revenue.risk.detected"


# 6. UTC Timestamp Preservation Test
def test_utc_timestamp_preservation(test_db):
    payment = Payment(razorpay_payment_id="pay_utc_time", amount=Decimal("100.00"), status="failed")
    test_db.add(payment)
    test_db.commit()

    audit = AuditService().record(test_db, payment.id, "revenue.risk.detected", "at_risk")
    fetched_audit = test_db.query(AuditLog).filter_by(id=audit.id).first()

    assert fetched_audit.timestamp.tzinfo is not None
    assert fetched_audit.timestamp.tzinfo == timezone.utc


# 7. Decimal Money Integrity Test
def test_decimal_money_integrity(test_db):
    payment = Payment(razorpay_payment_id="pay_dec_money", amount=Decimal("12345.67"), status="failed")
    test_db.add(payment)
    test_db.commit()

    fetched = test_db.query(Payment).filter_by(id=payment.id).first()
    assert isinstance(fetched.amount, Decimal)
    assert fetched.amount == Decimal("12345.67")


# 8. Full Agent Lifecycle Audit Event Types Coverage Test
def test_full_lifecycle_audit_event_types(test_db):
    payment = Payment(razorpay_payment_id="pay_lifecycle_001", amount=Decimal("250.00"), status="failed")
    test_db.add(payment)
    test_db.commit()

    service = AuditService()
    events = [
        ("revenue.risk.detected", "at_risk", None),
        ("payment.diagnosed", "diagnosed", None),
        ("recovery.strategy.selected", "PAYMENT_LINK", None),
        ("recovery.guardrail.evaluated", "ALLOW", "ALLOW"),
        ("recovery.execution.started", "started", "ALLOW"),
        ("recovery.payment_link.created", "executed", "ALLOW"),
        ("recovery.execution.blocked", "blocked", "BLOCK"),
        ("recovery.execution.failed", "failed", "ALLOW"),
        ("recovery.execution.reused", "reused", "ALLOW"),
        ("revenue.recovered", "recovered", "ALLOW"),
    ]

    for ev, dec, gr in events:
        service.record(test_db, payment.id, ev, dec, f"Reason for {ev}", gr)

    logs = get_audit_history(test_db, payment.id)
    assert len(logs) == 10
    persisted_events = [l.event for l in logs]
    for ev, _, _ in events:
        assert ev in persisted_events
