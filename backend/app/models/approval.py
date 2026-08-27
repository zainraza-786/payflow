"""
RecoveryApproval model.

Represents a Human Approval request required before executing a recovery action.
States: PENDING, APPROVED, REJECTED, EXPIRED.
"""

from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, UTCDateTime


class RecoveryApproval(Base):
    __tablename__ = "recovery_approvals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    payment_id: Mapped[int] = mapped_column(ForeignKey("payments.id"), index=True, nullable=False)
    recovery_attempt_id: Mapped[int | None] = mapped_column(
        ForeignKey("recovery_attempts.id"), index=True, nullable=True
    )

    requested_strategy: Mapped[str] = mapped_column(String(64), nullable=False)
    approval_status: Mapped[str] = mapped_column(
        String(32), index=True, nullable=False, default="PENDING"
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=lambda: datetime.now(timezone.utc)
    )
    resolved_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)

    payment: Mapped["Payment"] = relationship(back_populates="approvals")
