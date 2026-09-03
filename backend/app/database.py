"""
Database setup.

Uses SQLAlchemy with a URL pulled from configuration. SQLite is used
for Phase 1. The engine/session setup is written so that swapping
DATABASE_URL to a PostgreSQL URL later requires no code changes here.
"""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy import create_engine, event, DateTime, TypeDecorator
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

connect_args = {}
if settings.database_url.startswith("sqlite"):
    # Required for SQLite when used with FastAPI's threaded request handling.
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.database_url, connect_args=connect_args)


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.database_url.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


class UTCDateTime(TypeDecorator):
    """SQLAlchemy type decorator to ensure datetimes are persisted and retrieved as timezone-aware UTC datetimes."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            else:
                value = value.astimezone(timezone.utc)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            else:
                value = value.astimezone(timezone.utc)
        return value


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initializes the database tables on application startup and seeds initial demo records if empty."""
    from app.models import payment, recovery_attempt, audit_log, approval  # noqa: F401
    from app.models.payment import Payment
    from app.models.approval import RecoveryApproval

    Base.metadata.create_all(bind=engine)

    # Seed initial demo state if empty
    db = SessionLocal()
    try:
        if db.query(Payment).count() == 0:
            now = datetime.now(timezone.utc)
            demo_payments = [
                Payment(
                    id=8801,
                    razorpay_payment_id="pay_demo_8801",
                    amount=Decimal("35000.00"),
                    currency="INR",
                    status="failed",
                    failure_reason="No payment received for invoice INV-2026-019 (Aarav Sharma)",
                    created_at=now - timedelta(hours=1),
                    updated_at=now - timedelta(hours=1),
                ),
                Payment(
                    id=8802,
                    razorpay_payment_id="pay_demo_8802",
                    amount=Decimal("33000.00"),
                    currency="INR",
                    status="failed",
                    failure_reason="High-value corporate payment - Daily Limit Exceeded (Priya Patel)",
                    created_at=now - timedelta(hours=2),
                    updated_at=now - timedelta(hours=2),
                ),
                Payment(
                    id=8803,
                    razorpay_payment_id="pay_demo_8803",
                    amount=Decimal("24000.00"),
                    currency="INR",
                    status="failed",
                    failure_reason="High-value threshold exceeded - Approval Required (Neha Reddy)",
                    created_at=now - timedelta(hours=3),
                    updated_at=now - timedelta(hours=3),
                ),
                Payment(
                    id=8804,
                    razorpay_payment_id="pay_demo_8804",
                    amount=Decimal("17500.00"),
                    currency="INR",
                    status="captured",
                    failure_reason="Authentication Timeout - Smart Retry Recovered (Archana Dixit)",
                    created_at=now - timedelta(hours=4),
                    updated_at=now - timedelta(hours=4),
                ),
                Payment(
                    id=8805,
                    razorpay_payment_id="pay_demo_8805",
                    amount=Decimal("12000.00"),
                    currency="INR",
                    status="captured",
                    failure_reason="Temporary Bank Failure - Recovered via Link (Divya Nambiar)",
                    created_at=now - timedelta(hours=5),
                    updated_at=now - timedelta(hours=5),
                ),
                Payment(
                    id=8806,
                    razorpay_payment_id="pay_demo_8806",
                    amount=Decimal("8500.00"),
                    currency="INR",
                    status="failed",
                    failure_reason="Guardrail Blocked - Max Attempt Cap (Rohan Verma)",
                    created_at=now - timedelta(hours=6),
                    updated_at=now - timedelta(hours=6),
                ),
            ]
            db.add_all(demo_payments)
            db.flush()

            demo_approvals = [
                RecoveryApproval(
                    id=101,
                    payment_id=8801,
                    requested_strategy="PAYMENT_LINK",
                    approval_status="PENDING",
                    reason="High-value threshold exceeded (₹35,000 >= ₹10,000)",
                    created_at=now - timedelta(hours=1),
                    expires_at=now + timedelta(hours=24),
                ),
                RecoveryApproval(
                    id=102,
                    payment_id=8802,
                    requested_strategy="PAYMENT_LINK",
                    approval_status="PENDING",
                    reason="High-value threshold exceeded (₹33,000 >= ₹10,000)",
                    created_at=now - timedelta(hours=2),
                    expires_at=now + timedelta(hours=24),
                ),
                RecoveryApproval(
                    id=103,
                    payment_id=8803,
                    requested_strategy="PAYMENT_LINK",
                    approval_status="PENDING",
                    reason="High-value threshold exceeded (₹24,000 >= ₹10,000)",
                    created_at=now - timedelta(hours=3),
                    expires_at=now + timedelta(hours=24),
                ),
            ]
            db.add_all(demo_approvals)
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

