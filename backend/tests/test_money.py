from decimal import Decimal
import pytest
from pydantic import ValidationError

from app.schemas.payment import PaymentCreate


def test_valid_money_values():
    valid_cases = [
        Decimal("100.00"),
        Decimal("100.5"),
        Decimal("0.00"),
        Decimal("0"),
        Decimal("999999.99"),
    ]
    for val in valid_cases:
        p = PaymentCreate(
            razorpay_payment_id="pay_val_1",
            amount=val,
            status="failed",
        )
        assert p.amount == val


def test_invalid_money_negative():
    with pytest.raises(ValidationError) as excinfo:
        PaymentCreate(
            razorpay_payment_id="pay_neg",
            amount=Decimal("-10.00"),
            status="failed",
        )
    assert "Amount cannot be negative" in str(excinfo.value)


def test_invalid_money_nan():
    with pytest.raises(ValidationError) as excinfo:
        PaymentCreate(
            razorpay_payment_id="pay_nan",
            amount=Decimal("NaN"),
            status="failed",
        )
    assert "finite number" in str(excinfo.value)


def test_invalid_money_infinity():
    with pytest.raises(ValidationError) as excinfo:
        PaymentCreate(
            razorpay_payment_id="pay_inf",
            amount=Decimal("Infinity"),
            status="failed",
        )
    assert "finite number" in str(excinfo.value)

    with pytest.raises(ValidationError) as excinfo:
        PaymentCreate(
            razorpay_payment_id="pay_ninf",
            amount=Decimal("-Infinity"),
            status="failed",
        )
    assert "finite number" in str(excinfo.value)


def test_invalid_money_more_than_two_decimal_places():
    with pytest.raises(ValidationError) as excinfo:
        PaymentCreate(
            razorpay_payment_id="pay_dec3",
            amount=Decimal("10.555"),
            status="failed",
        )
    assert "more than 2 decimal places" in str(excinfo.value)
