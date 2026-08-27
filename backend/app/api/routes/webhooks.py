"""
Razorpay Webhook ingestion route.

Processes incoming Razorpay webhook events:
- Phase 3: payment.failed
- Phase 8: payment.captured (Observer & Recovery Attribution)
- Phase 12: Event-driven payment.failed -> RecoveryWorkflowOrchestrator (execute_allowed=False explicitly forced)

Verifies HMAC-SHA256 signature against raw request body before parsing payload.
Handles idempotency and records audit trails safely.
"""

import json
from decimal import Decimal
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.payment import Payment
from app.models.audit_log import AuditLog
from app.services.razorpay.webhook_signature import verify_webhook_signature
from app.services.agent.observer import PaymentObserver
from app.services.agent.event_workflow import process_payment_failure_workflow

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/razorpay")
async def handle_razorpay_webhook(
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """
    Ingests Razorpay webhook events (payment.failed and payment.captured).

    1. Reads raw HTTP request body bytes.
    2. Validates X-Razorpay-Signature header against RAZORPAY_WEBHOOK_SECRET.
    3. Parses and validates payload.
    4. Routes payment.failed or payment.captured events safely.
    """
    # 1. Read raw body bytes
    raw_body = await request.body()

    # 2. Extract signature header
    signature = request.headers.get("X-Razorpay-Signature") or request.headers.get("x-razorpay-signature")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing X-Razorpay-Signature header")

    webhook_secret = settings.razorpay_webhook_secret
    if not webhook_secret:
        raise HTTPException(
            status_code=400,
            detail="Webhook secret not configured on server",
        )

    # 3. Verify signature against raw body
    if not verify_webhook_signature(raw_body, signature, webhook_secret):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    # 4. Parse JSON payload
    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail="Malformed JSON payload in request body") from e

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Expected JSON object in webhook body")

    # 5. Validate event type
    event_name = payload.get("event")
    if event_name not in ("payment.failed", "payment.captured"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported webhook event type: '{event_name}'. Only 'payment.failed' and 'payment.captured' are supported.",
        )

    # 6. Extract payment payload wrapper
    payload_data = payload.get("payload")
    if not isinstance(payload_data, dict):
        raise HTTPException(status_code=400, detail="Invalid webhook payload structure: missing 'payload' object")

    payment_wrapper = payload_data.get("payment")
    if not isinstance(payment_wrapper, dict):
        raise HTTPException(status_code=400, detail="Invalid webhook payload structure: missing 'payment' object")

    payment_entity = payment_wrapper.get("entity")
    if not isinstance(payment_entity, dict):
        raise HTTPException(status_code=400, detail="Invalid webhook payload structure: missing 'entity' object")

    razorpay_payment_id = payment_entity.get("id")
    amount_paise = payment_entity.get("amount")
    currency = payment_entity.get("currency", "INR")

    if not razorpay_payment_id or amount_paise is None:
        raise HTTPException(
            status_code=400,
            detail="Missing required payment fields (id, amount) in webhook payload",
        )

    # --- Phase 8: payment.captured event processing ---
    if event_name == "payment.captured":
        try:
            observer = PaymentObserver()
            attr_result = observer.process_capture(
                rzp_payment_id=razorpay_payment_id,
                amount_paise=amount_paise,
                currency=currency,
                db=db,
            )
            return {
                "status": "ok",
                "message": attr_result.summary,
                "attribution": attr_result.model_dump(),
            }
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Error processing payment.captured event: {e}",
            ) from e

    # --- Phase 3 & 12: payment.failed event processing & event-driven workflow ---
    status = payment_entity.get("status")
    failure_reason = (
        payment_entity.get("error_description")
        or payment_entity.get("error_reason")
        or "payment_failed"
    )

    try:
        amount_decimal = Decimal(str(amount_paise)) / Decimal("100")
        if not amount_decimal.is_finite() or amount_decimal < Decimal("0"):
            raise ValueError("Invalid amount")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid monetary amount in webhook payload") from e

    # Atomic DB Persistence & Idempotency for payment.failed
    try:
        existing_payment = (
            db.query(Payment)
            .filter_by(razorpay_payment_id=razorpay_payment_id)
            .first()
        )

        if existing_payment:
            # Idempotent re-delivery: log duplicate audit entry without creating duplicate Payment or duplicate workflow execution
            audit = AuditLog(
                payment_id=existing_payment.id,
                event="payment.failed",
                decision="duplicate",
                reason=f"Duplicate payment.failed webhook received for payment '{razorpay_payment_id}'",
                guardrail_result=None,
            )
            db.add(audit)
            db.commit()
            return {
                "status": "ok",
                "message": "Duplicate payment.failed event acknowledged",
                "payment_id": existing_payment.id,
            }

        # New payment event: persist Payment & AuditLog atomically
        new_payment = Payment(
            razorpay_payment_id=razorpay_payment_id,
            amount=amount_decimal,
            currency=currency,
            status=status,
            failure_reason=failure_reason,
        )
        db.add(new_payment)
        db.flush()  # Populates new_payment.id

        audit = AuditLog(
            payment_id=new_payment.id,
            event="payment.failed",
            decision="detected",
            reason=f"Revenue risk detected: payment failed ({failure_reason})",
            guardrail_result=None,
        )
        db.add(audit)
        db.commit()

        # Phase 12: Trigger event-driven recovery workflow (execute_allowed=False explicitly forced)
        process_payment_failure_workflow(new_payment, db, execute_allowed=False)

        return {
            "status": "ok",
            "message": "payment.failed event processed and recorded",
            "payment_id": new_payment.id,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database transaction error during webhook processing",
        ) from e
