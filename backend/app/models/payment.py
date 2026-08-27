"""
Payment model.

Represents a payment event observed from Razorpay. Anchor record that
recovery attempts, audit logs, and human approvals relate back to.
"""

from decimal import Decimal
from datetime import datetime, timezone

from sqlalchemy import String, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, UTCDateTime


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    razorpay_payment_id: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    status: Mapped[str] = mapped_column(String(32), index=True, nullable=False)

    failure_reason: Mapped[str | None] = mapped_column(String(128), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    recovery_attempts: Mapped[list["RecoveryAttempt"]] = relationship(
        back_populates="payment", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        back_populates="payment", cascade="all, delete-orphan"
    )
    approvals: Mapped[list["RecoveryApproval"]] = relationship(
        back_populates="payment", cascade="all, delete-orphan"
    )
