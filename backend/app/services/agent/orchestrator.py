"""
Recovery Workflow Orchestrator Service.

Coordinates Phase 1–8 agent components in strict, fail-closed order:
1. Load Payment
2. Risk Detection (RevenueRiskDetector)
3. Failure Diagnosis (PaymentDiagnostician)
4. Strategy Selection (RecoveryStrategySelector)
5. Guardrail Evaluation (RecoveryGuardrailEngine)
6. Bounded Execution (RecoveryExecutor) — ONLY when execute_allowed=True AND guardrail decision is ALLOW.
7. Return consolidated RecoveryWorkflowResult.

Guarantees 0 Razorpay API calls when execute_allowed=False or guardrails deny permission.
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.services.agent.detector import RevenueRiskDetector
from app.services.agent.diagnostician import PaymentDiagnostician
from app.services.agent.strategy import RecoveryStrategySelector
from app.services.agent.guardrails import (
    RecoveryGuardrailEngine,
    DECISION_ALLOW,
    DECISION_STOP,
    DECISION_HUMAN_APPROVAL,
)
from app.services.agent.executor import RecoveryExecutor
from app.services.agent.audit import AuditService


class RecoveryWorkflowResult(BaseModel):
    """Structured result returned by RecoveryWorkflowOrchestrator."""
    model_config = ConfigDict(from_attributes=True)

    payment_id: int
    status: str
    is_at_risk: bool = False
    root_cause: str | None = None
    strategy: str | None = None
    guardrail_decision: str | None = None
    executed: bool = False
    execution_status: str | None = None
    recovery_attempt_id: int | None = None
    payment_link_id: str | None = None
    short_url: str | None = None
    recovered: bool = False
    summary: str = ""


class RecoveryWorkflowOrchestrator:
    """Deterministic Recovery Workflow Orchestrator implementation."""

    def run_workflow(
        self,
        payment_id: int,
        db: Session | None = None,
        current_time: datetime | None = None,
        execute_allowed: bool = False,
    ) -> RecoveryWorkflowResult:
        if not db:
            raise ValueError("Database session required for orchestrator workflow.")

        audit_service = AuditService()

        # Step 1: Load payment
        try:
            payment = db.query(Payment).filter_by(id=payment_id).first()
        except Exception as e:
            return RecoveryWorkflowResult(
                payment_id=payment_id,
                status="failed",
                is_at_risk=False,
                summary=f"Database query error for Payment #{payment_id}: {e}",
            )

        if not payment:
            return RecoveryWorkflowResult(
                payment_id=payment_id,
                status="failed",
                is_at_risk=False,
                summary=f"Payment ID {payment_id} not found in database.",
            )

        # Step 2: Check if payment is already captured/successful
        attempts = list(payment.recovery_attempts or [])
        is_recovered = any(
            (att.status or "").lower().strip() == "recovered"
            for att in attempts
        )
        status_clean = (payment.status or "").lower().strip()
        if status_clean in ("captured", "authorized", "paid", "success", "refunded"):
            latest_att = max(attempts, key=lambda a: a.id) if attempts else None
            return RecoveryWorkflowResult(
                payment_id=payment.id,
                status="stopped",
                is_at_risk=False,
                recovery_attempt_id=latest_att.id if latest_att else None,
                payment_link_id=latest_att.payment_link_id if latest_att else None,
                short_url=latest_att.payment_link_url if latest_att else None,
                recovered=is_recovered,
                summary=f"Payment #{payment.id} is already in successful status '{payment.status}'. Recovery halted.",
            )

        # Step 3: Risk Detection
        try:
            signal = RevenueRiskDetector().detect(payment)
        except Exception as e:
            return RecoveryWorkflowResult(
                payment_id=payment.id,
                status="failed",
                is_at_risk=False,
                summary=f"Detection failed for Payment #{payment.id}: {e}",
            )

        if not signal.is_at_risk:
            return RecoveryWorkflowResult(
                payment_id=payment.id,
                status="not_at_risk",
                is_at_risk=False,
                summary=signal.risk_reason,
            )

        # Step 4: Failure Diagnosis
        try:
            diagnosis = PaymentDiagnostician().diagnose(payment)
        except Exception as e:
            return RecoveryWorkflowResult(
                payment_id=payment.id,
                status="failed",
                is_at_risk=True,
                summary=f"Diagnosis failed for Payment #{payment.id}: {e}",
            )

        # Step 5: Strategy Selection
        try:
            choice = RecoveryStrategySelector().select(diagnosis)
        except Exception as e:
            return RecoveryWorkflowResult(
                payment_id=payment.id,
                status="failed",
                is_at_risk=True,
                root_cause=diagnosis.root_cause,
                summary=f"Strategy selection failed for Payment #{payment.id}: {e}",
            )

        # Step 6: Guardrail Evaluation
        try:
            verdict = RecoveryGuardrailEngine().evaluate(
                payment=payment,
                diagnosis=diagnosis,
                strategy_choice=choice,
                current_time=current_time,
            )
        except Exception as e:
            return RecoveryWorkflowResult(
                payment_id=payment.id,
                status="failed",
                is_at_risk=True,
                root_cause=diagnosis.root_cause,
                strategy=choice.strategy,
                summary=f"Guardrail evaluation failed for Payment #{payment.id}: {e}",
            )

        # Record component audit logs for strategy and guardrail
        audit_service.record(
            db=db,
            payment_id=payment.id,
            event="recovery.strategy.selected",
            decision=choice.strategy,
            reason=choice.rationale,
            guardrail_result=None,
        )

        audit_service.record(
            db=db,
            payment_id=payment.id,
            event="recovery.guardrail.evaluated",
            decision=verdict.decision,
            reason=verdict.reason,
            guardrail_result=verdict.decision,
        )

        # Step 6b: Create/reuse PENDING approval if guardrail decision is HUMAN_APPROVAL
        if verdict.decision == DECISION_HUMAN_APPROVAL:
            from app.services.agent.approval import RecoveryApprovalService
            RecoveryApprovalService().create_pending_approval(
                db=db,
                payment_id=payment.id,
                strategy=choice.strategy,
                reason=verdict.reason,
            )

        # Step 7: Conditional Execution (Strict Opt-in + Guardrail ALLOW required)

        execution_result = None
        can_execute = (
            execute_allowed
            and verdict.allowed is True
            and (verdict.decision or "").upper().strip() == DECISION_ALLOW
        )

        if can_execute:
            try:
                executor = RecoveryExecutor()
                execution_result = executor.execute(
                    payment=payment,
                    verdict=verdict,
                    strategy_choice=choice,
                    db=db,
                )
            except Exception as exc:
                return RecoveryWorkflowResult(
                    payment_id=payment.id,
                    status="failed",
                    is_at_risk=True,
                    root_cause=diagnosis.root_cause,
                    strategy=choice.strategy,
                    guardrail_decision=verdict.decision,
                    summary=f"Recovery execution crashed for Payment #{payment.id}: {exc}",
                )

        # Step 8: Consolidate Results & Attributions
        executed_flag = execution_result.executed if execution_result else False
        exec_status = (
            execution_result.status
            if execution_result
            else ("skipped" if not execute_allowed else "blocked")
        )

        att_id = None
        pl_id = execution_result.payment_link_id if execution_result else None
        short_url = execution_result.short_url if execution_result else None

        attempts = list(payment.recovery_attempts or [])
        if attempts:
            latest_att = max(attempts, key=lambda a: a.id)
            att_id = latest_att.id
            if not pl_id:
                pl_id = latest_att.payment_link_id
                short_url = latest_att.payment_link_url
            if (latest_att.status or "").lower().strip() == "recovered":
                is_recovered = True

        # Determine workflow status & summary message
        if executed_flag:
            wf_status = "completed"
            summary_msg = f"Workflow completed: Payment Link {pl_id} created successfully."
        elif execution_result and execution_result.status == "reused":
            wf_status = "completed"
            summary_msg = f"Workflow completed: Reused existing Payment Link {pl_id}."
        elif verdict.decision == DECISION_ALLOW:
            wf_status = "skipped" if not execute_allowed else "blocked"
            summary_msg = (
                f"Workflow completed analysis: Strategy '{choice.strategy}' allowed by guardrails, "
                f"but execute_allowed=False." if not execute_allowed else f"Execution status: {exec_status}."
            )
        elif verdict.decision == DECISION_STOP:
            wf_status = "stopped"
            summary_msg = f"Workflow stopped: Recovery halted by guardrails ({verdict.reason})."
        elif verdict.decision == DECISION_HUMAN_APPROVAL:
            wf_status = "blocked"
            summary_msg = f"Workflow blocked: Strategy '{choice.strategy}' requires human approval ({verdict.reason})."
        else:
            wf_status = "blocked"
            summary_msg = f"Workflow blocked by guardrails ({verdict.reason})."

        # Record minimal workflow completion audit log
        audit_service.record(
            db=db,
            payment_id=payment.id,
            event="recovery.workflow.completed",
            decision=wf_status,
            reason=summary_msg,
            guardrail_result=verdict.decision,
        )

        return RecoveryWorkflowResult(
            payment_id=payment.id,
            status=wf_status,
            is_at_risk=True,
            root_cause=diagnosis.root_cause,
            strategy=choice.strategy,
            guardrail_decision=verdict.decision,
            executed=executed_flag,
            execution_status=exec_status,
            recovery_attempt_id=att_id,
            payment_link_id=pl_id,
            short_url=short_url,
            recovered=is_recovered,
            summary=summary_msg,
        )


class NotImplementedOrchestrator:
    """Stub implementation maintained for backward compatibility tests."""

    def run_workflow(self, *args, **kwargs) -> RecoveryWorkflowResult:
        raise NotImplementedError("Orchestrator logic is not implemented in Phase 1.")
