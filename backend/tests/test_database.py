from decimal import Decimal
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine, event, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app.database import Base, UTCDateTime
from app.models.payment import Payment
from app.models.recovery_attempt import RecoveryAttempt
from app.models.audit_log import AuditLog
from app.database import init_db


@pytest.fixture
def db_session():
    # Use isolated in-memory SQLite database for tests
    engine = create_engine("sqlite:///:memory:")

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


def test_database_initialization():
    # Verify init_db runs and all three tables are created
    init_db()
    from app.database import engine
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    assert "payments" in tables
    assert "recovery_attempts" in tables
    assert "audit_logs" in tables


def test_payment_persistence(db_session):
    payment = Payment(
        razorpay_payment_id="pay_test_123",
        amount=Decimal("1500.50"),
        currency="INR",
        status="failed",
        failure_reason="insufficient_funds",
    )
    db_session.add(payment)
    db_session.commit()
    db_session.refresh(payment)

    saved_payment = db_session.query(Payment).filter_by(razorpay_payment_id="pay_test_123").first()
    assert saved_payment is not None
    assert saved_payment.id is not None
    assert isinstance(saved_payment.amount, Decimal)
    assert saved_payment.amount == Decimal("1500.50")
    assert saved_payment.status == "failed"


def test_duplicate_razorpay_payment_id_rejection(db_session):
    payment1 = Payment(
        razorpay_payment_id="pay_dup_1",
        amount=Decimal("500.00"),
        status="failed",
    )
    payment2 = Payment(
        razorpay_payment_id="pay_dup_1",
        amount=Decimal("1000.00"),
        status="failed",
    )
    db_session.add(payment1)
    db_session.commit()

    db_session.add(payment2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_recovery_attempt_persistence_and_relationship(db_session):
    payment = Payment(
        razorpay_payment_id="pay_rec_1",
        amount=Decimal("2000.00"),
        status="failed",
    )
    db_session.add(payment)
    db_session.commit()

    attempt = RecoveryAttempt(
        payment_id=payment.id,
        attempt_number=1,
        strategy="retry_payment_link",
        status="pending",
    )
    db_session.add(attempt)
    db_session.commit()

    db_session.refresh(payment)
    assert len(payment.recovery_attempts) == 1
    assert payment.recovery_attempts[0].strategy == "retry_payment_link"
    assert payment.recovery_attempts[0].payment.razorpay_payment_id == "pay_rec_1"


def test_audit_log_persistence_and_relationship(db_session):
    payment = Payment(
        razorpay_payment_id="pay_audit_1",
        amount=Decimal("750.00"),
        status="failed",
    )
    db_session.add(payment)
    db_session.commit()

    audit = AuditLog(
        payment_id=payment.id,
        event="risk_detected",
        decision="trigger_recovery",
        reason="Payment failed due to timeout",
        guardrail_result="passed",
    )
    db_session.add(audit)
    db_session.commit()

    db_session.refresh(payment)
    assert len(payment.audit_logs) == 1
    assert payment.audit_logs[0].event == "risk_detected"
    assert payment.audit_logs[0].payment.razorpay_payment_id == "pay_audit_1"


def test_sqlite_foreign_key_enforcement(db_session):
    # Attempting to persist a RecoveryAttempt referencing a non-existent Payment ID
    invalid_attempt = RecoveryAttempt(
        payment_id=99999,
        attempt_number=1,
        strategy="retry_payment_link",
    )
    db_session.add(invalid_attempt)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_attempt_number_constraint(db_session):
    payment = Payment(
        razorpay_payment_id="pay_attempt_test",
        amount=Decimal("100.00"),
        status="failed",
    )
    db_session.add(payment)
    db_session.commit()

    # Invalid attempt number = 0
    invalid_attempt_zero = RecoveryAttempt(
        payment_id=payment.id,
        attempt_number=0,
        strategy="test",
    )
    db_session.add(invalid_attempt_zero)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # Invalid attempt number = -1
    invalid_attempt_neg = RecoveryAttempt(
        payment_id=payment.id,
        attempt_number=-1,
        strategy="test",
    )
    db_session.add(invalid_attempt_neg)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_utc_timestamp_behavior(db_session):
    now_utc = datetime.now(timezone.utc)
    payment = Payment(
        razorpay_payment_id="pay_tz_test",
        amount=Decimal("100.00"),
        status="failed",
        created_at=now_utc,
    )
    db_session.add(payment)
    db_session.commit()

    saved = db_session.query(Payment).filter_by(razorpay_payment_id="pay_tz_test").first()
    assert saved.created_at.tzinfo is not None
    assert saved.created_at.tzinfo == timezone.utc
    # Safe comparison with timezone-aware datetime without mixing bugs
    assert abs((saved.created_at - now_utc).total_seconds()) < 5
