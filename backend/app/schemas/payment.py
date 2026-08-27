from decimal import Decimal
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class PaymentBase(BaseModel):
    razorpay_payment_id: str
    amount: Decimal
    currency: str = "INR"
    status: str
    failure_reason: str | None = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if not isinstance(v, Decimal):
            v = Decimal(str(v))
        if not v.is_finite():
            raise ValueError("Amount must be a finite number (no NaN or Infinity)")
        if v < Decimal("0"):
            raise ValueError("Amount cannot be negative")
        if v.as_tuple().exponent < -2:
            raise ValueError("Amount cannot have more than 2 decimal places")
        return v


class PaymentCreate(PaymentBase):
    pass


class PaymentRead(PaymentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

