"""Pydantic schemas for AuditLog."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogBase(BaseModel):
    payment_id: int
    event: str
    decision: str
    reason: str | None = None
    guardrail_result: str | None = None


class AuditLogCreate(AuditLogBase):
    pass


class AuditLogRead(AuditLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
