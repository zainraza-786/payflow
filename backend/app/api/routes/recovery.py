"""
Recovery Workflow API Routes.

Exposes POST /recovery/workflow/{payment_id} endpoint delegating directly to RecoveryWorkflowOrchestrator.
Enforces execute_allowed=False as the safe default.
Handles HTTP status codes truthfully without exposing internal secrets or stack traces.
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.recovery import RecoveryWorkflowRequest
from app.services.agent.orchestrator import (
    RecoveryWorkflowOrchestrator,
    RecoveryWorkflowResult,
)

router = APIRouter(prefix="/recovery", tags=["recovery"])


@router.post(
    "/workflow/{payment_id}",
    response_model=RecoveryWorkflowResult,
    summary="Triggers controlled recovery workflow for a payment",
)
async def run_recovery_workflow(
    payment_id: int,
    request: RecoveryWorkflowRequest = Body(default_factory=RecoveryWorkflowRequest),
    db: Session = Depends(get_db),
) -> RecoveryWorkflowResult:
    """
    Exposes the verified RecoveryWorkflowOrchestrator to analyze and optionally execute recovery.

    - Validate payment_id > 0 (HTTP 400 if <= 0).
    - execute_allowed defaults to False (0 Razorpay API calls).
    - If payment_id is missing: returns HTTP 404.
    - If guardrails block/stop: returns HTTP 200 with structured RecoveryWorkflowResult.
    """
    if payment_id <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid payment_id '{payment_id}': must be greater than 0.",
        )

    try:
        orchestrator = RecoveryWorkflowOrchestrator()
        result = orchestrator.run_workflow(
            payment_id=payment_id,
            db=db,
            execute_allowed=request.execute_allowed,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Internal error during recovery workflow orchestration.",
        ) from e

    if result.status == "failed":
        if "not found" in result.summary.lower():
            raise HTTPException(status_code=404, detail=result.summary)
        raise HTTPException(status_code=500, detail=result.summary)

    return result
