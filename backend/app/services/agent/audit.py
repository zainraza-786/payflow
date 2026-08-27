"""
Audit Service.

Records agent decision events to the AuditLog table.
Provides chronological audit history retrieval and payment recovery summary functions.
"""

from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.models.payment import Payment


class AuditService:
    """Real implementation of Audit Service."""

    def record(
        self,
        db: Session,
        payment_id: int,
        event: str,
        decision: str,
        reason: str | None = None,
        guardrail_result: str | None = None,
    ) -> AuditLog:
        audit = AuditLog(
            payment_id=payment_id,
            event=event,
            decision=decision,
            reason=reason,
            guardrail_result=guardrail_result,
        )
        db.add(audit)
        db.commit()
        db.refresh(audit)
        return audit

    def get_audit_history(self, db: Session, payment_id: int) -> list[AuditLog]:
        """Retrieves all AuditLog entries for payment_id ordered chronologically."""
        return (
            db.query(AuditLog)
            .filter_by(payment_id=payment_id)
            .order_by(AuditLog.timestamp.asc(), AuditLog.id.asc())
            .all()
        )

    def get_payment_recovery_summary(self, db: Session, payment_id: int) -> dict | None:
        """Retrieves payment details, recovery attempts, and chronological audit trail."""
        payment = db.query(Payment).filter_by(id=payment_id).first()
        if not payment:
            return None

        audits = self.get_audit_history(db, payment_id)

        return {
            "payment_id": payment.id,
            "razorpay_payment_id": payment.razorpay_payment_id,
            "amount": payment.amount,
            "currency": payment.currency,
            "status": payment.status,
            "failure_reason": payment.failure_reason,
            "attempts_count": len(payment.recovery_attempts or []),
            "recovery_attempts": [
                {
                    "id": att.id,
                    "attempt_number": att.attempt_number,
                    "strategy": att.strategy,
                    "status": att.status,
                    "payment_link_id": att.payment_link_id,
                    "payment_link_url": att.payment_link_url,
                    "created_at": att.created_at,
                }
                for att in (payment.recovery_attempts or [])
            ],
            "audit_history": [
                {
                    "id": log.id,
                    "event": log.event,
                    "decision": log.decision,
                    "reason": log.reason,
                    "guardrail_result": log.guardrail_result,
                    "timestamp": log.timestamp,
                }
                for log in audits
            ],
        }


def get_audit_history(db: Session, payment_id: int) -> list[AuditLog]:
    """Standalone helper function to query audit history chronologically."""
    return AuditService().get_audit_history(db, payment_id)


def get_payment_recovery_summary(db: Session, payment_id: int) -> dict | None:
    """Standalone helper function to retrieve full payment recovery summary."""
    return AuditService().get_payment_recovery_summary(db, payment_id)


class NotImplementedAuditRecorder:
    """Stub implementation maintained for backward compatibility tests."""

    def record(
        self,
        db: Session,
        payment_id: int,
        event: str,
        decision: str,
        reason: str | None = None,
        guardrail_result: str | None = None,
    ) -> None:
        raise NotImplementedError("Audit recording is not implemented in Phase 1.")
