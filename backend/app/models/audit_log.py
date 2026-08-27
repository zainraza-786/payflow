"""
AuditLog model.

Every decision the agent makes (detection, diagnosis, strategy choice,
guardrail verdict, execution outcome) should be recorded here so the
full reasoning chain is reconstructable later.
"""

from datetime import datetime, timezone

from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, UTCDateTime


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    payment_id: Mapped[int] = mapped_column(ForeignKey("payments.id"), index=True, nullable=False)

    event: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    decision: Mapped[str] = mapped_column(String(64), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    guardrail_result: Mapped[str | None] = mapped_column(String(32), nullable=True)

    timestamp: Mapped[datetime] = mapped_column(
        UTCDateTime, default=lambda: datetime.now(timezone.utc), index=True
    )


    payment: Mapped["Payment"] = relationship(back_populates="audit_logs")
