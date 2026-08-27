"""
Guardrail Engine.

Evaluates a proposed recovery strategy against deterministic safety rules BEFORE any recovery action can execute.
Rules enforced in safety-first priority:
1. Already captured/successful payment -> STOP
2. Maximum recovery attempts reached (>= 2) -> STOP
3. Non-recoverable root cause or STOP strategy -> STOP
4. UNKNOWN diagnosis or REVIEW strategy -> HUMAN_APPROVAL
5. REPEATED_FAILURE root cause or ESCALATE strategy -> HUMAN_APPROVAL
6. High-value transaction threshold -> HUMAN_APPROVAL
7. Quiet hours restriction for customer-facing strategies -> BLOCK
8. Valid automated strategy (DELAYED_RETRY, PAYMENT_LINK) -> ALLOW

Zero execution side-effects: does NOT call Razorpay APIs or perform customer communication.
"""

from decimal import Decimal
from datetime import datetime, timezone, timedelta

import zoneinfo
from pydantic import BaseModel, ConfigDict, Field

from app.config import settings
from app.models.payment import Payment
from app.services.agent.diagnostician import (
    DiagnosisResult,
    ROOT_CAUSE_NON_RECOVERABLE,
    ROOT_CAUSE_UNKNOWN,
    ROOT_CAUSE_REPEATED,
    RECOVERABILITY_UNKNOWN,
)
from app.services.agent.strategy import (
    RecoveryStrategyChoice,
    STRATEGY_DELAYED_RETRY,
    STRATEGY_PAYMENT_LINK,
    STRATEGY_ESCALATE,
    STRATEGY_STOP,
    STRATEGY_REVIEW,
)

# Controlled Guardrail Decision Constants
DECISION_ALLOW = "ALLOW"
DECISION_BLOCK = "BLOCK"
DECISION_HUMAN_APPROVAL = "HUMAN_APPROVAL"
DECISION_STOP = "STOP"

CONTROLLED_DECISIONS = {
    DECISION_ALLOW,
    DECISION_BLOCK,
    DECISION_HUMAN_APPROVAL,
    DECISION_STOP,
}


class GuardrailVerdict(BaseModel):
    """Structured result returned by RecoveryGuardrailEngine."""
    model_config = ConfigDict(from_attributes=True)

    payment_id: int = 0
    allowed: bool = False
    decision: str = DECISION_BLOCK
    reason: str = ""
    guardrails_checked: list[str] = Field(default_factory=list)


def get_timezone_by_name(tz_name: str):
    """Returns timezone object for given name with fallback for IST and UTC."""
    clean_tz = (tz_name or "").upper().strip()
    if clean_tz in ("ASIA/KOLKATA", "ASIA/CALCUTTA", "IST"):
        return timezone(timedelta(hours=5, minutes=30))
    if clean_tz in ("UTC", "GMT"):
        return timezone.utc
    try:
        return zoneinfo.ZoneInfo(tz_name)
    except Exception:
        return timezone.utc


def is_quiet_hours(
    eval_time: datetime,
    start_hour: int = 22,
    end_hour: int = 8,
    tz_name: str = "Asia/Kolkata",
) -> bool:
    """
    Determines whether eval_time falls within quiet hours (e.g. 22:00 to 08:00 Asia/Kolkata).
    """
    if eval_time.tzinfo is None:
        eval_time = eval_time.replace(tzinfo=timezone.utc)

    target_tz = get_timezone_by_name(tz_name)
    local_dt = eval_time.astimezone(target_tz)

    hour = local_dt.hour
    if start_hour > end_hour:  # Overnight quiet hours (e.g. 22:00 to 08:00)
        return hour >= start_hour or hour < end_hour
    else:  # Same-day quiet hours (e.g. 01:00 to 06:00)
        return start_hour <= hour < end_hour


class RecoveryGuardrailEngine:
    """Deterministic Safety Guardrail Engine implementation."""

    def evaluate(
        self,
        payment: Payment,
        diagnosis: DiagnosisResult | None,
        strategy_choice: RecoveryStrategyChoice | None,
        current_time: datetime | None = None,
    ) -> GuardrailVerdict:
        if not payment or payment.id is None:
            raise ValueError("Invalid payment model provided for guardrail evaluation.")

        checked: list[str] = []

        # 1. Success stopping rule
        checked.append("success_check")
        status = (payment.status or "").lower().strip()
        if status in ("captured", "authorized", "paid", "success", "refunded"):
            return GuardrailVerdict(
                payment_id=payment.id,
                allowed=False,
                decision=DECISION_STOP,
                reason="Payment is already successful/captured; recovery is stopped.",
                guardrails_checked=checked,
            )

        # 2. Maximum recovery attempts limit
        checked.append("max_attempts_check")
        attempts = len(getattr(payment, "recovery_attempts", []) or [])
        max_attempts = settings.max_recovery_attempts
        if attempts >= max_attempts:
            return GuardrailVerdict(
                payment_id=payment.id,
                allowed=False,
                decision=DECISION_STOP,
                reason=f"Maximum recovery attempts limit ({max_attempts}) reached or exceeded ({attempts}); recovery is stopped.",
                guardrails_checked=checked,
            )

        # Extract diagnosis and strategy parameters
        root_cause = (diagnosis.root_cause if diagnosis else "").upper().strip()
        recoverability = (diagnosis.recoverability if diagnosis else "").upper().strip()
        strat = (strategy_choice.strategy if strategy_choice else "").upper().strip()

        # 3. Non-recoverable / STOP strategy
        checked.append("non_recoverable_check")
        if root_cause == ROOT_CAUSE_NON_RECOVERABLE or strat == STRATEGY_STOP:
            return GuardrailVerdict(
                payment_id=payment.id,
                allowed=False,
                decision=DECISION_STOP,
                reason="Non-recoverable failure or STOP strategy selected; recovery is stopped.",
                guardrails_checked=checked,
            )

        # 4. Unknown / Review safety
        checked.append("unknown_review_check")
        if (
            root_cause == ROOT_CAUSE_UNKNOWN
            or recoverability == RECOVERABILITY_UNKNOWN
            or strat == STRATEGY_REVIEW
        ):
            return GuardrailVerdict(
                payment_id=payment.id,
                allowed=False,
                decision=DECISION_HUMAN_APPROVAL,
                reason="Uncertain diagnosis or REVIEW strategy requires human approval.",
                guardrails_checked=checked,
            )

        # 5. Repeated failure / ESCALATE
        checked.append("repeated_failure_check")
        if root_cause == ROOT_CAUSE_REPEATED or strat == STRATEGY_ESCALATE:
            return GuardrailVerdict(
                payment_id=payment.id,
                allowed=False,
                decision=DECISION_HUMAN_APPROVAL,
                reason="Repeated failure or ESCALATE strategy requires human approval before retry.",
                guardrails_checked=checked,
            )

        # 6. High-value transaction threshold
        checked.append("high_value_check")
        amount = (
            payment.amount
            if isinstance(payment.amount, Decimal)
            else Decimal(str(payment.amount or 0))
        )
        if amount >= settings.high_value_threshold_inr:
            return GuardrailVerdict(
                payment_id=payment.id,
                allowed=False,
                decision=DECISION_HUMAN_APPROVAL,
                reason=f"High-value transaction (₹{amount} >= ₹{settings.high_value_threshold_inr}) requires human approval.",
                guardrails_checked=checked,
            )

        # 7. Quiet hours restriction for customer-facing strategies
        checked.append("quiet_hours_check")
        customer_facing = strat in (STRATEGY_PAYMENT_LINK,)
        if customer_facing:
            eval_time = current_time or datetime.now(timezone.utc)
            if is_quiet_hours(
                eval_time=eval_time,
                start_hour=settings.quiet_hours_start,
                end_hour=settings.quiet_hours_end,
                tz_name=settings.quiet_hours_timezone,
            ):
                return GuardrailVerdict(
                    payment_id=payment.id,
                    allowed=False,
                    decision=DECISION_BLOCK,
                    reason=f"Action blocked due to quiet hours restriction ({settings.quiet_hours_start}:00-{settings.quiet_hours_end}:00 {settings.quiet_hours_timezone}).",
                    guardrails_checked=checked,
                )

        # 8. Strategy validation & Allow
        checked.append("strategy_validation")
        if strat in (STRATEGY_DELAYED_RETRY, STRATEGY_PAYMENT_LINK):
            return GuardrailVerdict(
                payment_id=payment.id,
                allowed=True,
                decision=DECISION_ALLOW,
                reason=f"Guardrail evaluation passed: strategy '{strat}' is permitted.",
                guardrails_checked=checked,
            )

        return GuardrailVerdict(
            payment_id=payment.id,
            allowed=False,
            decision=DECISION_BLOCK,
            reason=f"Invalid or unrecognized strategy '{strat}'.",
            guardrails_checked=checked,
        )


class NotImplementedGuardrailEngine:
    """Stub implementation maintained for backward compatibility tests."""

    def evaluate(self, strategy_choice: RecoveryStrategyChoice) -> GuardrailVerdict:
        raise NotImplementedError("Guardrail evaluation is not implemented in Phase 1.")
