"""
Human Approval API Routes.

Exposes:
- POST /recovery/approval/{payment_id}: Creates/returns PENDING approval
- POST /recovery/approval/{approval_id}/approve: Explicitly approves pending approval
- POST /recovery/approval/{approval_id}/reject: Explicitly rejects pending approval
- POST /recovery/approval/{approval_id}/execute: Controlled execution for approved recovery
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.payment import Payment
from app.services.agent.approval import RecoveryApprovalService, ApprovalResult
from app.services.agent.executor import ExecutionResult

router = APIRouter(prefix="/recovery/approval", tags=["approval"])


@router.post(
    "/{payment_id}",
    response_model=ApprovalResult,
    summary="Creates or retrieves a PENDING human approval request for a payment",
)
async def create_or_get_approval(
    payment_id: int,
    strategy: str = "PAYMENT_LINK",
    reason: str | None = None,
    db: Session = Depends(get_db),
) -> ApprovalResult:
    if payment_id <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid payment_id '{payment_id}': must be greater than 0.",
        )

    payment = db.query(Payment).filter_by(id=payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=404,
            detail=f"Payment ID {payment_id} not found in database.",
        )

    try:
        service = RecoveryApprovalService()
        return service.create_pending_approval(
            db=db,
            payment_id=payment_id,
            strategy=strategy,
            reason=reason or payment.failure_reason,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error creating pending human approval request.",
        ) from e


@router.post(
    "/{approval_id}/approve",
    response_model=ApprovalResult,
    summary="Explicitly approves a pending recovery approval request",
)
async def approve_request(
    approval_id: int,
    reason: str | None = Body(default=None, embed=True),
    db: Session = Depends(get_db),
) -> ApprovalResult:
    if approval_id <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid approval_id '{approval_id}': must be greater than 0.",
        )

    try:
        service = RecoveryApprovalService()
        return service.approve(db=db, approval_id=approval_id, reason=reason)
    except ValueError as ve:
        if "not found" in str(ve).lower():
            raise HTTPException(status_code=404, detail=str(ve))
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error approving recovery approval request.",
        ) from e


@router.post(
    "/{approval_id}/reject",
    response_model=ApprovalResult,
    summary="Explicitly rejects a pending recovery approval request",
)
async def reject_request(
    approval_id: int,
    reason: str | None = Body(default=None, embed=True),
    db: Session = Depends(get_db),
) -> ApprovalResult:
    if approval_id <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid approval_id '{approval_id}': must be greater than 0.",
        )

    try:
        service = RecoveryApprovalService()
        return service.reject(db=db, approval_id=approval_id, reason=reason)
    except ValueError as ve:
        if "not found" in str(ve).lower():
            raise HTTPException(status_code=404, detail=str(ve))
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error rejecting recovery approval request.",
        ) from e


@router.post(
    "/{approval_id}/execute",
    response_model=ExecutionResult,
    summary="Controlled execution path for an APPROVED recovery approval request",
)
async def execute_approved_request(
    approval_id: int,
    db: Session = Depends(get_db),
) -> ExecutionResult:
    if approval_id <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid approval_id '{approval_id}': must be greater than 0.",
        )

    try:
        service = RecoveryApprovalService()
        return service.execute_approved_recovery(db=db, approval_id=approval_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error executing approved recovery request.",
        ) from e
