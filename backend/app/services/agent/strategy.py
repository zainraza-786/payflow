"""
Recovery Strategy Selector.

Selects an appropriate recovery strategy based strictly on Phase 4 failure diagnosis results.
Uses deterministic policy mappings and signals whether human approval is required.
Does NOT make Razorpay API calls or execute recovery actions.
"""

from pydantic import BaseModel, ConfigDict, Field

from app.services.agent.diagnostician import (
    DiagnosisResult,
    ROOT_CAUSE_TEMPORARY_GATEWAY,
    ROOT_CAUSE_PAYMENT_METHOD,
    ROOT_CAUSE_INSUFFICIENT_FUNDS,
    ROOT_CAUSE_AUTHENTICATION,
    ROOT_CAUSE_REPEATED,
    ROOT_CAUSE_NON_RECOVERABLE,
    ROOT_CAUSE_UNKNOWN,
    RECOVERABILITY_UNKNOWN,
)

# Controlled Strategy Constants
STRATEGY_DELAYED_RETRY = "DELAYED_RETRY"
STRATEGY_PAYMENT_LINK = "PAYMENT_LINK"
STRATEGY_ESCALATE = "ESCALATE"
STRATEGY_STOP = "STOP"
STRATEGY_REVIEW = "REVIEW"

ALL_STRATEGIES = {
    STRATEGY_DELAYED_RETRY,
    STRATEGY_PAYMENT_LINK,
    STRATEGY_ESCALATE,
    STRATEGY_STOP,
    STRATEGY_REVIEW,
}


class RecoveryStrategyChoice(BaseModel):
    """Structured result returned by RecoveryStrategySelector."""
    model_config = ConfigDict(from_attributes=True)

    payment_id: int
    strategy: str = STRATEGY_REVIEW
    rationale: str = "Default strategy choice"
    confidence: float = Field(default=0.30, ge=0.0, le=1.0)
    requires_human_approval: bool = True


class RecoveryStrategySelector:
    """Deterministic Recovery Strategy Selector implementation."""

    def select(self, diagnosis: DiagnosisResult) -> RecoveryStrategyChoice:
        if not diagnosis or diagnosis.payment_id is None:
            raise ValueError("Invalid diagnosis result provided for strategy selection.")

        root_cause = (diagnosis.root_cause or "").upper().strip()
        recoverability = (diagnosis.recoverability or "").upper().strip()

        # Rule 0: Unknown root cause or unknown recoverability -> REVIEW (Requires Approval)
        if root_cause == ROOT_CAUSE_UNKNOWN or recoverability == RECOVERABILITY_UNKNOWN:
            return RecoveryStrategyChoice(
                payment_id=diagnosis.payment_id,
                strategy=STRATEGY_REVIEW,
                rationale="Uncertain or unclassified root cause/recoverability requires human review for safety.",
                confidence=0.30,
                requires_human_approval=True,
            )

        # Rule 1: Repeated Failures -> ESCALATE (Requires Approval)
        if root_cause == ROOT_CAUSE_REPEATED:
            return RecoveryStrategyChoice(
                payment_id=diagnosis.payment_id,
                strategy=STRATEGY_ESCALATE,
                rationale="Prior recovery attempts detected; repeated failures require human escalation.",
                confidence=0.95,
                requires_human_approval=True,
            )

        # Rule 2: Temporary Gateway Failure -> DELAYED_RETRY
        if root_cause == ROOT_CAUSE_TEMPORARY_GATEWAY:
            return RecoveryStrategyChoice(
                payment_id=diagnosis.payment_id,
                strategy=STRATEGY_DELAYED_RETRY,
                rationale="Temporary failure classification supports a delayed retry rather than immediate repeated payment submission.",
                confidence=0.90,
                requires_human_approval=False,
            )

        # Rule 3: Payment Method Issue -> PAYMENT_LINK
        if root_cause == ROOT_CAUSE_PAYMENT_METHOD:
            return RecoveryStrategyChoice(
                payment_id=diagnosis.payment_id,
                strategy=STRATEGY_PAYMENT_LINK,
                rationale="Payment instrument issue supports providing customer a fresh Payment Link.",
                confidence=0.90,
                requires_human_approval=False,
            )

        # Rule 4: Insufficient Funds -> PAYMENT_LINK
        if root_cause == ROOT_CAUSE_INSUFFICIENT_FUNDS:
            return RecoveryStrategyChoice(
                payment_id=diagnosis.payment_id,
                strategy=STRATEGY_PAYMENT_LINK,
                rationale="Insufficient funds support sending a Payment Link for customer to retry when funds are available.",
                confidence=0.90,
                requires_human_approval=False,
            )

        # Rule 5: Authentication Failure -> REVIEW (Requires Approval)
        if root_cause == ROOT_CAUSE_AUTHENTICATION:
            return RecoveryStrategyChoice(
                payment_id=diagnosis.payment_id,
                strategy=STRATEGY_REVIEW,
                rationale="Authentication failures require human review before taking automated action.",
                confidence=0.85,
                requires_human_approval=True,
            )

        # Rule 6: Non-Recoverable -> STOP
        if root_cause == ROOT_CAUSE_NON_RECOVERABLE:
            return RecoveryStrategyChoice(
                payment_id=diagnosis.payment_id,
                strategy=STRATEGY_STOP,
                rationale="Permanent decline or security block indicates non-recoverable payment; stopping recovery.",
                confidence=0.95,
                requires_human_approval=False,
            )

        # Safe Fallback for unhandled edge cases
        return RecoveryStrategyChoice(
            payment_id=diagnosis.payment_id,
            strategy=STRATEGY_REVIEW,
            rationale="Default safety policy: unmapped failure diagnosis requires human review.",
            confidence=0.30,
            requires_human_approval=True,
        )


class NotImplementedStrategySelector:
    """Stub implementation maintained for backward compatibility tests."""

    def select(self, diagnosis: any) -> RecoveryStrategyChoice:
        raise NotImplementedError("Strategy selection is not implemented in Phase 1.")
