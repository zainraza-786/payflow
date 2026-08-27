"""
Failure Diagnostician.

Analyzes failed Payment records using evidence-based, deterministic rules.
Classifies root cause, recoverability, confidence (0.0-1.0), and human-readable explanation.
Falls back conservatively to UNKNOWN when evidence is missing or ambiguous.
"""

from pydantic import BaseModel, ConfigDict, Field

from app.models.payment import Payment

# Controlled Root Cause Constants
ROOT_CAUSE_TEMPORARY_GATEWAY = "TEMPORARY_GATEWAY_FAILURE"
ROOT_CAUSE_PAYMENT_METHOD = "PAYMENT_METHOD_ISSUE"
ROOT_CAUSE_INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS"
ROOT_CAUSE_AUTHENTICATION = "AUTHENTICATION_FAILURE"
ROOT_CAUSE_REPEATED = "REPEATED_FAILURE"
ROOT_CAUSE_NON_RECOVERABLE = "NON_RECOVERABLE"
ROOT_CAUSE_UNKNOWN = "UNKNOWN"

# Controlled Recoverability Constants
RECOVERABILITY_RECOVERABLE = "RECOVERABLE"
RECOVERABILITY_POSSIBLY_RECOVERABLE = "POSSIBLY_RECOVERABLE"
RECOVERABILITY_NON_RECOVERABLE = "NON_RECOVERABLE"
RECOVERABILITY_UNKNOWN = "UNKNOWN"


class DiagnosisResult(BaseModel):
    """Structured result returned by PaymentDiagnostician."""
    model_config = ConfigDict(from_attributes=True)

    payment_id: int
    root_cause: str
    recoverability: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    explanation: str


class PaymentDiagnostician:
    """Deterministic Failure Diagnostician implementation."""

    def diagnose(self, payment: Payment) -> DiagnosisResult:
        if not payment or payment.id is None:
            raise ValueError("Invalid payment model provided for diagnosis.")

        # 1. Check prior recovery attempts
        attempts = getattr(payment, "recovery_attempts", [])
        if attempts and len(attempts) > 0:
            return DiagnosisResult(
                payment_id=payment.id,
                root_cause=ROOT_CAUSE_REPEATED,
                recoverability=RECOVERABILITY_POSSIBLY_RECOVERABLE,
                confidence=0.85,
                explanation=f"Payment has {len(attempts)} prior recovery attempt(s) recorded.",
            )

        # 2. Safely normalize failure reason string
        reason_raw = payment.failure_reason
        if not reason_raw or not isinstance(reason_raw, str):
            return DiagnosisResult(
                payment_id=payment.id,
                root_cause=ROOT_CAUSE_UNKNOWN,
                recoverability=RECOVERABILITY_UNKNOWN,
                confidence=0.30,
                explanation="No failure reason details provided. Conservative UNKNOWN diagnosis assigned.",
            )

        norm_reason = reason_raw.lower().strip()

        # 3. Deterministic evidence-based rule matching

        # Rule A: Insufficient Funds
        if any(kw in norm_reason for kw in ["insufficient", "funds", "balance", "low_balance"]):
            return DiagnosisResult(
                payment_id=payment.id,
                root_cause=ROOT_CAUSE_INSUFFICIENT_FUNDS,
                recoverability=RECOVERABILITY_RECOVERABLE,
                confidence=0.95,
                explanation="Failure reason indicates insufficient customer account balance.",
            )

        # Rule B: Authentication Failure
        if any(kw in norm_reason for kw in ["auth", "authentication", "otp", "3d_secure", "pin"]):
            return DiagnosisResult(
                payment_id=payment.id,
                root_cause=ROOT_CAUSE_AUTHENTICATION,
                recoverability=RECOVERABILITY_RECOVERABLE,
                confidence=0.90,
                explanation="Failure reason indicates customer authentication or OTP verification failure.",
            )

        # Rule C: Non-Recoverable / Security Block
        if any(kw in norm_reason for kw in ["stolen", "fraud", "blacklisted", "do_not_honor", "blocked"]):
            return DiagnosisResult(
                payment_id=payment.id,
                root_cause=ROOT_CAUSE_NON_RECOVERABLE,
                recoverability=RECOVERABILITY_NON_RECOVERABLE,
                confidence=0.95,
                explanation="Failure reason indicates permanent decline or security block.",
            )

        # Rule D: Payment Method Issue
        if any(kw in norm_reason for kw in ["card", "declined", "expired", "invalid", "vpa", "mandate", "limit"]):
            return DiagnosisResult(
                payment_id=payment.id,
                root_cause=ROOT_CAUSE_PAYMENT_METHOD,
                recoverability=RECOVERABILITY_POSSIBLY_RECOVERABLE,
                confidence=0.90,
                explanation="Failure reason indicates payment instrument issue (card/VPA declined or expired).",
            )

        # Rule E: Temporary Gateway / Network Failure
        if any(kw in norm_reason for kw in ["gateway", "timeout", "bank", "technical", "network", "timed_out", "down"]):
            return DiagnosisResult(
                payment_id=payment.id,
                root_cause=ROOT_CAUSE_TEMPORARY_GATEWAY,
                recoverability=RECOVERABILITY_RECOVERABLE,
                confidence=0.90,
                explanation="Failure reason indicates temporary processing gateway or bank timeout.",
            )

        # Conservative Fallback: Unknown / Unrecognized Reason
        return DiagnosisResult(
            payment_id=payment.id,
            root_cause=ROOT_CAUSE_UNKNOWN,
            recoverability=RECOVERABILITY_UNKNOWN,
            confidence=0.30,
            explanation=f"Insufficient evidence to classify failure reason '{reason_raw}'. Conservative UNKNOWN diagnosis assigned.",
        )


class Diagnosis:
    """Maintained for backward compatibility tests."""

    def __init__(self, payment_id: int, root_cause: str | None = None):
        self.payment_id = payment_id
        self.root_cause = root_cause


class NotImplementedDiagnostician:
    """Stub implementation maintained for backward compatibility tests."""

    def diagnose(self, payment: Payment) -> Diagnosis:
        raise NotImplementedError("Diagnostician logic is not implemented in Phase 1.")
