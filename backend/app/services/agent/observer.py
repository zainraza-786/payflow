"""
Payment Observer and Recovery Attribution Service.

Observes payment.captured events, updates payment status, and performs strict revenue recovery attribution.
Attributes revenue.recovered ONLY when a genuinely executed PAYMENT_LINK recovery attempt exists.
Maintains idempotency and enforces Decimal money calculations without float math.
"""

from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.models.recovery_attempt import RecoveryAttempt
from app.services.agent.strategy import STRATEGY_PAYMENT_LINK
from app.services.agent.audit import AuditService


class AttributionResult(BaseModel):
    """Structured result returned by PaymentObserver."""
    model_config = ConfigDict(from_attributes=True)

    payment_id: int
    razorpay_payment_id: str
    amount_captured: Decimal
    is_agent_recovered: bool
    recovery_attempt_id: int | None = None
    status: str
    summary: str


class PaymentObserver:
    """Payment Observer implementation for capture events and revenue attribution."""

    def process_capture(
        self,
        rzp_payment_id: str,
        amount_paise: int,
        currency: str = "INR",
        db: Session | None = None,
    ) -> AttributionResult:
        if not rzp_payment_id or not isinstance(rzp_payment_id, str):
            raise ValueError("Invalid Razorpay payment ID provided for capture processing.")

        amount_captured = Decimal(str(amount_paise)) / Decimal("100")
        audit_service = AuditService()

        if not db:
            return AttributionResult(
                payment_id=0,
                razorpay_payment_id=rzp_payment_id,
                amount_captured=amount_captured,
                is_agent_recovered=False,
                recovery_attempt_id=None,
                status="captured",
                summary="Dry-run capture processing completed.",
            )

        # 1. Database Lookup
        payment = db.query(Payment).filter_by(razorpay_payment_id=rzp_payment_id).first()

        # Case A: Unknown / Unrecorded Payment
        if not payment:
            payment = Payment(
                razorpay_payment_id=rzp_payment_id,
                amount=amount_captured,
                currency=currency,
                status="captured",
            )
            db.add(payment)
            db.commit()
            db.refresh(payment)

            summary_msg = (
                f"Organic capture for unrecorded payment {rzp_payment_id} "
                f"(₹{amount_captured}). Created new Payment record."
            )
            audit_service.record(
                db=db,
                payment_id=payment.id,
                event="payment.captured",
                decision="captured",
                reason=summary_msg,
                guardrail_result=None,
            )
            return AttributionResult(
                payment_id=payment.id,
                razorpay_payment_id=rzp_payment_id,
                amount_captured=amount_captured,
                is_agent_recovered=False,
                recovery_attempt_id=None,
                status="unknown_payment",
                summary=summary_msg,
            )

        # Case B: Duplicate Captured Webhook (Idempotency)
        if (payment.status or "").lower().strip() == "captured":
            summary_msg = f"Duplicate payment.captured webhook for {rzp_payment_id} ignored."
            audit_service.record(
                db=db,
                payment_id=payment.id,
                event="payment.captured",
                decision="duplicate",
                reason=summary_msg,
                guardrail_result=None,
            )
            return AttributionResult(
                payment_id=payment.id,
                razorpay_payment_id=rzp_payment_id,
                amount_captured=amount_captured,
                is_agent_recovered=False,
                recovery_attempt_id=None,
                status="duplicate",
                summary=summary_msg,
            )

        # Case C: Status Update & Strict Recovery Attribution
        payment.status = "captured"
        payment.amount = amount_captured

        # Inspect recovery attempts for genuine PAYMENT_LINK attempt
        attempts = list(payment.recovery_attempts or [])
        active_att = None
        for att in attempts:
            if (
                (att.strategy or "").upper().strip() == STRATEGY_PAYMENT_LINK
                and (att.status or "").lower().strip() in ("created", "executed")
                and att.payment_link_id
            ):
                active_att = att
                break

        if active_att:
            active_att.status = "recovered"
            is_agent_recovered = True
            att_id = active_att.id
            summary_msg = (
                f"Agent recovery attribution verified: ₹{amount_captured} recovered via "
                f"attempt #{active_att.attempt_number} ({active_att.payment_link_id})."
            )
            audit_service.record(
                db=db,
                payment_id=payment.id,
                event="revenue.recovered",
                decision="recovered",
                reason=summary_msg,
                guardrail_result="ALLOW",
            )
        else:
            is_agent_recovered = False
            att_id = None
            summary_msg = (
                f"Organic payment captured (₹{amount_captured}); "
                f"no active agent recovery attempt existed."
            )
            audit_service.record(
                db=db,
                payment_id=payment.id,
                event="payment.captured",
                decision="captured",
                reason=summary_msg,
                guardrail_result=None,
            )

        db.commit()
        db.refresh(payment)

        return AttributionResult(
            payment_id=payment.id,
            razorpay_payment_id=rzp_payment_id,
            amount_captured=amount_captured,
            is_agent_recovered=is_agent_recovered,
            recovery_attempt_id=att_id,
            status="captured",
            summary=summary_msg,
        )


class NotImplementedObserver:
    """Stub implementation maintained for backward compatibility tests."""

    def process_capture(self, *args, **kwargs) -> AttributionResult:
        raise NotImplementedError("Observer logic is not implemented in Phase 1.")

    def observe(self, *args, **kwargs) -> AttributionResult:
        raise NotImplementedError("Observer logic is not implemented in Phase 1.")

