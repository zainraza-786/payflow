from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class RecoveryWorkflowRequest(BaseModel):
    """Request schema for triggering recovery workflow execution."""
    execute_allowed: bool = False


class RecoveryAttemptBase(BaseModel):
    payment_id: int
    attempt_number: int = Field(default=1, gt=0)
    strategy: str
    status: str = "pending"
    payment_link_id: str | None = None


class RecoveryAttemptCreate(RecoveryAttemptBase):
    pass


class RecoveryAttemptRead(RecoveryAttemptBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
