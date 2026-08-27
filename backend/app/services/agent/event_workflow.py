"""
Event-Driven Payment Failure Workflow Integration Service.

Connects verified payment.failed events to RecoveryWorkflowOrchestrator.
Enforces execute_allowed=False explicitly so webhook ingestion never triggers automatic external API execution calls.
"""

from sqlalchemy.orm import Session
from app.models.payment import Payment
from app.services.agent.orchestrator import (
    RecoveryWorkflowOrchestrator,
    RecoveryWorkflowResult,
)


def process_payment_failure_workflow(
    payment: Payment,
    db: Session,
    execute_allowed: bool = False,
) -> RecoveryWorkflowResult:
    """
    Triggers deterministic recovery workflow for a verified payment.failed event.

    Safety Contract:
    - Webhook-triggered workflows MUST use execute_allowed=False explicitly.
    - Zero Razorpay API calls occur from normal webhook ingestion.
    """
    if not payment or not payment.id:
        raise ValueError("Valid persisted Payment instance required for event-driven workflow.")

    orchestrator = RecoveryWorkflowOrchestrator()
    # Explicitly pass execute_allowed=False for webhook-driven events
    return orchestrator.run_workflow(
        payment_id=payment.id,
        db=db,
        execute_allowed=False,
    )
