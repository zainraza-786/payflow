"""
Human Approval Gate Service for Recovery Execution.

AI/Rules recommend -> Guardrails evaluate -> HUMAN_APPROVAL creates PENDING approval -> Human explicitly APPROVES -> Guardrails re-evaluated -> RecoveryExecutor may execute.
Approval does NOT bypass guardrails. Zero Razorpay API calls occur without explicit approval and fresh guardrail ALLOW verdict.
"""

from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.models.approval import RecoveryApproval
from app.services.agent.diagnostician import PaymentDiagnostician
from app.services.agent.strategy import RecoveryStrategySelector
from app.services.agent.guardrails import RecoveryGuardrailEngine, DECISION_ALLOW
from app.services.agent.executor import RecoveryExecutor, ExecutionResult
from app.services.agent.audit import AuditService


class ApprovalResult(BaseModel):
    """Structured result returned by RecoveryApprovalService."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    payment_id: int
    recovery_attempt_id: int | None = None
    requested_strategy: str
    approval_status: str
    reason: str | None = None
    created_at: datetime
    resolved_at: datetime | None = None
    expires_at: datetime
    summary: str = ""


class RecoveryApprovalService:
    """Deterministic Human Approval Gate service implementation."""

    def create_pending_approval(
        self,
        db: Session,
        payment_id: int,
        strategy: str,
        reason: str | None = None,
        ttl_hours: int = 24,
    ) -> ApprovalResult:
        now = datetime.now(timezone.utc)
        audit_service = AuditService()

        # Check for existing active PENDING approval for this payment
        existing = (
            db.query(RecoveryApproval)
            .filter_by(payment_id=payment_id, approval_status="PENDING")
            .filter(RecoveryApproval.expires_at > now)
            .first()
        )
        if existing:
            return self._to_result(existing, summary="Reused existing active PENDING approval request.")

        expires_at = now + timedelta(hours=ttl_hours)
        approval = RecoveryApproval(
            payment_id=payment_id,
            requested_strategy=strategy,
            approval_status="PENDING",
            reason=reason,
            created_at=now,
            expires_at=expires_at,
        )
        db.add(approval)
        db.commit()
        db.refresh(approval)

        summary_msg = f"Created PENDING human approval request for payment #{payment_id} (strategy: {strategy})."
        audit_service.record(
            db=db,
            payment_id=payment_id,
            event="recovery.approval.requested",
            decision="PENDING",
            reason=summary_msg,
            guardrail_result="HUMAN_APPROVAL",
        )

        return self._to_result(approval, summary=summary_msg)

    def get_approval(self, db: Session, approval_id: int) -> ApprovalResult | None:
        approval = db.query(RecoveryApproval).filter_by(id=approval_id).first()
        if not approval:
            return None

        now = datetime.now(timezone.utc)
        # Check deterministic expiration
        if approval.approval_status == "PENDING" and now >= approval.expires_at:
            approval.approval_status = "EXPIRED"
            approval.resolved_at = now
            db.commit()
            db.refresh(approval)

            AuditService().record(
                db=db,
                payment_id=approval.payment_id,
                event="recovery.approval.expired",
                decision="EXPIRED",
                reason=f"Approval request #{approval.id} expired before resolution.",
                guardrail_result="BLOCK",
            )

        return self._to_result(approval, summary=f"Approval status: {approval.approval_status}.")

    def approve(self, db: Session, approval_id: int, reason: str | None = None) -> ApprovalResult:
        result = self.get_approval(db, approval_id)
        if not result:
            raise ValueError(f"Approval ID {approval_id} not found.")

        if result.approval_status == "APPROVED":
            return result  # Idempotent return

        if result.approval_status in ("EXPIRED", "REJECTED"):
            raise ValueError(f"Cannot approve request #{approval_id}: status is {result.approval_status}.")

        now = datetime.now(timezone.utc)
        approval = db.query(RecoveryApproval).filter_by(id=approval_id).first()
        approval.approval_status = "APPROVED"
        approval.resolved_at = now
        if reason:
            approval.reason = reason
        db.commit()
        db.refresh(approval)

        summary_msg = f"Human explicitly APPROVED recovery strategy '{approval.requested_strategy}' for payment #{approval.payment_id}."
        AuditService().record(
            db=db,
            payment_id=approval.payment_id,
            event="recovery.approval.approved",
            decision="APPROVED",
            reason=summary_msg,
            guardrail_result="ALLOW",
        )

        return self._to_result(approval, summary=summary_msg)

    def reject(self, db: Session, approval_id: int, reason: str | None = None) -> ApprovalResult:
        result = self.get_approval(db, approval_id)
        if not result:
            raise ValueError(f"Approval ID {approval_id} not found.")

        if result.approval_status == "REJECTED":
            return result  # Idempotent return

        now = datetime.now(timezone.utc)
        approval = db.query(RecoveryApproval).filter_by(id=approval_id).first()
        approval.approval_status = "REJECTED"
        approval.resolved_at = now
        if reason:
            approval.reason = reason
        db.commit()
        db.refresh(approval)

        summary_msg = f"Human REJECTED recovery strategy '{approval.requested_strategy}' for payment #{approval.payment_id}."
        AuditService().record(
            db=db,
            payment_id=approval.payment_id,
            event="recovery.approval.rejected",
            decision="REJECTED",
            reason=summary_msg,
            guardrail_result="BLOCK",
        )

        return self._to_result(approval, summary=summary_msg)

    def execute_approved_recovery(
        self,
        db: Session,
        approval_id: int,
        current_time: datetime | None = None,
    ) -> ExecutionResult:
        """
        Executes recovery ONLY after approval is APPROVED and fresh Guardrail Engine evaluation returns ALLOW.
        Zero Razorpay API calls occur if guardrail denies execution or status is not APPROVED.
        """
        app_res = self.get_approval(db, approval_id)
        if not app_res:
            return ExecutionResult(
                payment_id=0,
                executed=False,
                strategy="UNKNOWN",
                attempt_number=0,
                status="blocked",
                error=f"Approval ID {approval_id} not found.",
            )

        payment = db.query(Payment).filter_by(id=app_res.payment_id).first()
        if not payment:
            return ExecutionResult(
                payment_id=app_res.payment_id,
                executed=False,
                strategy=app_res.requested_strategy,
                attempt_number=0,
                status="blocked",
                error=f"Payment ID {app_res.payment_id} not found.",
            )

        # Safety Check 1: Must be APPROVED and not EXPIRED
        if app_res.approval_status != "APPROVED":
            return ExecutionResult(
                payment_id=payment.id,
                executed=False,
                strategy=app_res.requested_strategy,
                attempt_number=len(payment.recovery_attempts or []) + 1,
                status="blocked",
                error=f"Cannot execute recovery: Approval status is '{app_res.approval_status}' (APPROVED required).",
            )

        # Safety Check 2: Fresh Guardrail Re-Evaluation
        diagnosis = PaymentDiagnostician().diagnose(payment)
        choice = RecoveryStrategySelector().select(diagnosis)
        verdict = RecoveryGuardrailEngine().evaluate(
            payment=payment,
            diagnosis=diagnosis,
            strategy_choice=choice,
            current_time=current_time,
        )

        # Safety Check 3: Guardrail verdict MUST be allowed=True and decision="ALLOW"
        if not (verdict.allowed is True and (verdict.decision or "").upper().strip() == DECISION_ALLOW):
            return ExecutionResult(
                payment_id=payment.id,
                executed=False,
                strategy=choice.strategy,
                attempt_number=len(payment.recovery_attempts or []) + 1,
                status="blocked",
                error=f"Fresh guardrail evaluation denied execution: decision='{verdict.decision}' ({verdict.reason}).",
            )

        # All safety checks passed -> Invoke RecoveryExecutor
        executor = RecoveryExecutor()
        exec_res = executor.execute(
            payment=payment,
            verdict=verdict,
            strategy_choice=choice,
            db=db,
        )

        # Link attempt to approval if created
        if exec_res.executed or exec_res.status == "reused":
            approval = db.query(RecoveryApproval).filter_by(id=approval_id).first()
            attempts = list(payment.recovery_attempts or [])
            if attempts and approval:
                latest_att = max(attempts, key=lambda a: a.id)
                approval.recovery_attempt_id = latest_att.id
                db.commit()

        return exec_res

    def _to_result(self, approval: RecoveryApproval, summary: str = "") -> ApprovalResult:
        return ApprovalResult(
            id=approval.id,
            payment_id=approval.payment_id,
            recovery_attempt_id=approval.recovery_attempt_id,
            requested_strategy=approval.requested_strategy,
            approval_status=approval.approval_status,
            reason=approval.reason,
            created_at=approval.created_at,
            resolved_at=approval.resolved_at,
            expires_at=approval.expires_at,
            summary=summary,
        )
