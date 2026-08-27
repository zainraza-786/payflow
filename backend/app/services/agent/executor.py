"""
Bounded Razorpay Payment Link Executor.

Executes payment recovery action (Standard Razorpay Payment Link) strictly after explicit Guardrail Engine permission.
Enforces fail-closed evaluation, payment state safety, attempt limits, idempotency, transaction atomicity, and secret redaction.
Zero execution for unauthorized, blocked, or non-PAYMENT_LINK strategies.
"""

from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.models.payment import Payment
from app.models.recovery_attempt import RecoveryAttempt
from app.services.agent.guardrails import GuardrailVerdict, DECISION_ALLOW
from app.services.agent.strategy import RecoveryStrategyChoice, STRATEGY_PAYMENT_LINK
from app.services.agent.audit import AuditService
from app.services.razorpay.payment_links import create_payment_link
from app.services.razorpay.exceptions import RazorpayIntegrationError


class ExecutionResult(BaseModel):
    """Structured result returned by RecoveryExecutor."""
    model_config = ConfigDict(from_attributes=True)

    payment_id: int
    executed: bool
    strategy: str
    attempt_number: int | None = None
    payment_link_id: str | None = None
    short_url: str | None = None
    status: str
    amount: Decimal | None = None
    currency: str | None = None
    reference_id: str | None = None
    error: str | None = None


class RecoveryExecutor:
    """Bounded Razorpay Payment Link Executor implementation."""

    def execute(
        self,
        payment: Payment,
        verdict: GuardrailVerdict | None,
        strategy_choice: RecoveryStrategyChoice | None,
        db: Session | None = None,
    ) -> ExecutionResult:
        if not payment or payment.id is None:
            raise ValueError("Invalid payment model provided for execution.")

        amount = (
            payment.amount
            if isinstance(payment.amount, Decimal)
            else Decimal(str(payment.amount or 0))
        )
        currency = payment.currency or "INR"
        strat_name = (strategy_choice.strategy if strategy_choice else "").upper().strip()

        audit_service = AuditService()

        # 1. FAIL-CLOSED GUARDRAIL CHECK
        if (
            not verdict
            or verdict.allowed is not True
            or (verdict.decision or "").upper().strip() != DECISION_ALLOW
        ):
            decision_str = getattr(verdict, "decision", "UNKNOWN")
            reason_msg = (
                f"Fail-closed execution: Guardrail permission denied (allowed="
                f"{getattr(verdict, 'allowed', None)}, decision='{decision_str}')."
            )
            if db and payment.id:
                audit_service.record(
                    db=db,
                    payment_id=payment.id,
                    event="recovery.execution.blocked",
                    decision="blocked",
                    reason=reason_msg,
                    guardrail_result=decision_str,
                )
            return ExecutionResult(
                payment_id=payment.id,
                executed=False,
                strategy=strat_name,
                attempt_number=None,
                payment_link_id=None,
                short_url=None,
                status="blocked",
                amount=amount,
                currency=currency,
                reference_id=None,
                error=reason_msg,
            )

        # 2. SUPPORTED STRATEGY DEFENSE
        if strat_name != STRATEGY_PAYMENT_LINK:
            reason_msg = f"Strategy '{strat_name}' is not auto-executable in Phase 7."
            if db and payment.id:
                audit_service.record(
                    db=db,
                    payment_id=payment.id,
                    event="recovery.execution.blocked",
                    decision="blocked",
                    reason=reason_msg,
                    guardrail_result=DECISION_ALLOW,
                )
            return ExecutionResult(
                payment_id=payment.id,
                executed=False,
                strategy=strat_name,
                attempt_number=None,
                payment_link_id=None,
                short_url=None,
                status="skipped",
                amount=amount,
                currency=currency,
                reference_id=None,
                error=reason_msg,
            )

        # 3. PAYMENT STATE SAFETY
        payment_status = (payment.status or "").lower().strip()
        if payment_status in ("captured", "authorized", "paid", "success", "refunded"):
            reason_msg = f"Payment status '{payment.status}' is already captured/successful. Execution halted."
            if db and payment.id:
                audit_service.record(
                    db=db,
                    payment_id=payment.id,
                    event="recovery.execution.blocked",
                    decision="blocked",
                    reason=reason_msg,
                    guardrail_result=DECISION_ALLOW,
                )
            return ExecutionResult(
                payment_id=payment.id,
                executed=False,
                strategy=strat_name,
                attempt_number=None,
                payment_link_id=None,
                short_url=None,
                status="skipped",
                amount=amount,
                currency=currency,
                reference_id=None,
                error=reason_msg,
            )

        # 4. ATTEMPT LIMIT & IDEMPOTENCY / DUPLICATE CHECK
        existing_attempts = list(getattr(payment, "recovery_attempts", []) or [])
        attempt_count = len(existing_attempts)

        if attempt_count >= settings.max_recovery_attempts:
            reason_msg = (
                f"Maximum recovery attempts limit ({settings.max_recovery_attempts}) "
                f"reached or exceeded ({attempt_count}). Execution blocked."
            )
            if db and payment.id:
                audit_service.record(
                    db=db,
                    payment_id=payment.id,
                    event="recovery.execution.blocked",
                    decision="blocked",
                    reason=reason_msg,
                    guardrail_result=DECISION_ALLOW,
                )
            return ExecutionResult(
                payment_id=payment.id,
                executed=False,
                strategy=strat_name,
                attempt_number=None,
                payment_link_id=None,
                short_url=None,
                status="blocked",
                amount=amount,
                currency=currency,
                reference_id=None,
                error=reason_msg,
            )

        # Check existing successful PAYMENT_LINK attempt
        for att in existing_attempts:
            if (
                (att.strategy or "").upper().strip() == STRATEGY_PAYMENT_LINK
                and att.payment_link_id
            ):
                reason_msg = (
                    f"Reused existing PAYMENT_LINK attempt #{att.attempt_number} "
                    f"({att.payment_link_id}). Zero API calls made."
                )
                if db and payment.id:
                    audit_service.record(
                        db=db,
                        payment_id=payment.id,
                        event="recovery.execution.reused",
                        decision="reused",
                        reason=reason_msg,
                        guardrail_result=DECISION_ALLOW,
                    )
                return ExecutionResult(
                    payment_id=payment.id,
                    executed=False,
                    strategy=strat_name,
                    attempt_number=att.attempt_number,
                    payment_link_id=att.payment_link_id,
                    short_url=att.payment_link_url,
                    status="reused",
                    amount=amount,
                    currency=currency,
                    reference_id=f"rec_{payment.id}_{att.attempt_number}",
                    error=None,
                )

        # 5. EXECUTION ATTEMPT PREPARATION
        next_attempt_num = attempt_count + 1
        ref_id = f"rec_{payment.id}_{next_attempt_num}"

        if db and payment.id:
            audit_service.record(
                db=db,
                payment_id=payment.id,
                event="recovery.execution.started",
                decision="started",
                reason=f"Attempting Razorpay Payment Link creation (Attempt #{next_attempt_num}).",
                guardrail_result=DECISION_ALLOW,
            )

        description = f"Payment recovery link for invoice payment #{payment.razorpay_payment_id or payment.id}"

        # 6. EXTERNAL API CALL WITH EXCEPTION HANDLING & SECRET REDACTION
        try:
            pl_response = create_payment_link(
                amount=amount,
                currency=currency,
                reference_id=ref_id,
                description=description,
            )
        except Exception as exc:
            if db:
                db.rollback()

            clean_err = str(exc)
            if settings.razorpay_key_secret and settings.razorpay_key_secret in clean_err:
                clean_err = clean_err.replace(settings.razorpay_key_secret, "[REDACTED]")

            reason_msg = f"Razorpay API Payment Link creation failed: {clean_err}"
            if db and payment.id:
                audit_service.record(
                    db=db,
                    payment_id=payment.id,
                    event="recovery.execution.failed",
                    decision="failed",
                    reason=reason_msg,
                    guardrail_result=DECISION_ALLOW,
                )
            return ExecutionResult(
                payment_id=payment.id,
                executed=False,
                strategy=strat_name,
                attempt_number=next_attempt_num,
                payment_link_id=None,
                short_url=None,
                status="failed",
                amount=amount,
                currency=currency,
                reference_id=ref_id,
                error=clean_err,
            )

        # 7. ATOMIC DATABASE PERSISTENCE ON API SUCCESS
        pl_id = pl_response.get("id")
        short_url = pl_response.get("short_url")

        attempt = RecoveryAttempt(
            payment_id=payment.id,
            attempt_number=next_attempt_num,
            strategy=STRATEGY_PAYMENT_LINK,
            payment_link_id=pl_id,
            payment_link_url=short_url,
            status="created",
        )


        if db:
            try:
                db.add(attempt)
                db.commit()
                db.refresh(attempt)
            except Exception as db_exc:
                db.rollback()
                reason_msg = f"Database commit failed after Payment Link creation ({pl_id}): {db_exc}"
                if payment.id:
                    audit_service.record(
                        db=db,
                        payment_id=payment.id,
                        event="recovery.execution.inconsistency",
                        decision="failed",
                        reason=reason_msg,
                        guardrail_result=DECISION_ALLOW,
                    )
                return ExecutionResult(
                    payment_id=payment.id,
                    executed=False,
                    strategy=strat_name,
                    attempt_number=next_attempt_num,
                    payment_link_id=pl_id,
                    short_url=short_url,
                    status="failed",
                    amount=amount,
                    currency=currency,
                    reference_id=ref_id,
                    error=reason_msg,
                )

            audit_service.record(
                db=db,
                payment_id=payment.id,
                event="recovery.payment_link.created",
                decision="executed",
                reason=f"Payment Link {pl_id} created successfully (Attempt #{next_attempt_num}).",
                guardrail_result=DECISION_ALLOW,
            )

        return ExecutionResult(
            payment_id=payment.id,
            executed=True,
            strategy=strat_name,
            attempt_number=next_attempt_num,
            payment_link_id=pl_id,
            short_url=short_url,
            status="executed",
            amount=amount,
            currency=currency,
            reference_id=ref_id,
            error=None,
        )


class NotImplementedExecutor:
    """Stub implementation maintained for backward compatibility tests."""

    def execute(self, *args, **kwargs) -> ExecutionResult:
        raise NotImplementedError("Executor logic is not implemented in Phase 1.")
