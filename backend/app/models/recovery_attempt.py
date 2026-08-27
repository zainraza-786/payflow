"""
RecoveryAttempt model.

Represents a single attempt made (or planned) to recover revenue
associated with a payment — e.g. a retry, a payment link resend, or
a mandate retry. Execution logic itself is NOT implemented in Phase 1.
"""

from datetime import datetime, timezone

from sqlalchemy import String, Integer, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, UTCDateTime


class RecoveryAttempt(Base):
    __tablename__ = "recovery_attempts"
    __table_args__ = (
        CheckConstraint("attempt_number > 0", name="check_attempt_number_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    payment_id: Mapped[int] = mapped_column(ForeignKey("payments.id"), index=True, nullable=False)

    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    strategy: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    payment_link_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    payment_link_url: Mapped[str | None] = mapped_column(String(255), nullable=True)



    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=lambda: datetime.now(timezone.utc)
    )

    payment: Mapped["Payment"] = relationship(back_populates="recovery_attempts")
