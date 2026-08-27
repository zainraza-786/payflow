"""
Revenue-at-Risk Detector.

Determines whether a persisted Payment record represents revenue at risk.
Uses deterministic rules: a payment with status 'failed' and positive monetary amount is flagged at risk.
"""

from decimal import Decimal
from pydantic import BaseModel, ConfigDict

from app.models.payment import Payment


class RevenueRiskSignal(BaseModel):
    """Structured result returned by RevenueRiskDetector."""
    model_config = ConfigDict(from_attributes=True)

    payment_id: int
    is_at_risk: bool
    risk_reason: str


class RevenueRiskDetector:
    """Real implementation of Revenue-at-Risk Detector."""

    def detect(self, payment: Payment) -> RevenueRiskSignal:
        if not payment or payment.id is None:
            raise ValueError("Invalid payment model provided for detection.")

        status = (payment.status or "").lower().strip()
        amount = payment.amount if isinstance(payment.amount, Decimal) else Decimal(str(payment.amount or 0))

        if status == "failed" and amount > Decimal("0"):
            return RevenueRiskSignal(
                payment_id=payment.id,
                is_at_risk=True,
                risk_reason=f"Payment {payment.razorpay_payment_id or payment.id} status is 'failed' with positive amount {amount}.",
            )

        if status in ("captured", "authorized", "paid", "success", "refunded"):
            return RevenueRiskSignal(
                payment_id=payment.id,
                is_at_risk=False,
                risk_reason=f"Payment status is '{payment.status}'; revenue is not at risk.",
            )

        if amount <= Decimal("0"):
            return RevenueRiskSignal(
                payment_id=payment.id,
                is_at_risk=False,
                risk_reason=f"Payment amount ({amount}) is not positive; revenue is not at risk.",
            )

        # Conservative fallback for unknown/unrecognized status
        return RevenueRiskSignal(
            payment_id=payment.id,
            is_at_risk=False,
            risk_reason=f"Conservative default: status '{payment.status}' is not classified as revenue at risk.",
        )


class NotImplementedDetector:
    """Stub implementation maintained for backward compatibility tests."""

    def detect(self, payment: Payment) -> RevenueRiskSignal:
        raise NotImplementedError("Detector logic is not implemented in Phase 1.")
