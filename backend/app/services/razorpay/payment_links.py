"""
Razorpay Payment Link service layer.

Provides typed function create_payment_link to create standard payment links via Razorpay API.
Converts monetary amounts to smallest currency unit (paise for INR).
"""

from decimal import Decimal
from typing import Any
import razorpay
from razorpay.errors import BadRequestError, GatewayError, ServerError
import requests

from app.services.razorpay.client import get_razorpay_client
from app.services.razorpay.exceptions import (
    RazorpayAuthError,
    RazorpayAPIError,
    RazorpayNetworkError,
)


def amount_to_smallest_unit(amount: Decimal | int | float) -> int:
    """
    Converts amount in standard currency (e.g. INR ₹100.50) to smallest currency unit (e.g. 10050 paise).
    """
    if isinstance(amount, (int, float)):
        amount = Decimal(str(amount))
    if not amount.is_finite() or amount <= Decimal("0"):
        raise ValueError("Payment link amount must be a positive finite number.")
    return int(round(amount * Decimal("100")))


def create_payment_link(
    amount: Decimal | int | float,
    description: str,
    reference_id: str,
    currency: str = "INR",
    client: razorpay.Client | None = None,
) -> dict[str, Any]:
    """
    Creates a Standard Payment Link via Razorpay API.

    Amount is converted to the smallest currency unit (paise for INR).
    Notifications (SMS/email) are disabled by default in Phase 2.
    Returns structured dict with payment link details.
    """
    if client is None:
        client = get_razorpay_client()

    amount_in_paise = amount_to_smallest_unit(amount)

    payload = {
        "amount": amount_in_paise,
        "currency": currency.upper(),
        "accept_partial": False,
        "reference_id": reference_id,
        "description": description,
        "notify": {"sms": False, "email": False},
    }

    secret = client.auth[1] if hasattr(client, "auth") and client.auth else None

    try:
        response = client.payment_link.create(payload)
        if not isinstance(response, dict):
            raise RazorpayAPIError("Unexpected non-dict response received from Razorpay Payment Link API.")
        return response
    except BadRequestError as e:
        err_msg = str(e)
        err_lower = err_msg.lower()
        if "auth" in err_lower or "unauthorized" in err_lower or "key" in err_lower:
            raise RazorpayAuthError(
                f"Razorpay authentication failed: {err_msg}",
                secret=secret,
                raw_error=e,
            ) from e
        raise RazorpayAPIError(
            f"Razorpay Payment Link creation failed (BadRequestError): {err_msg}",
            secret=secret,
            raw_error=e,
        ) from e
    except (ServerError, GatewayError) as e:
        raise RazorpayAPIError(
            f"Razorpay server/gateway error: {str(e)}",
            secret=secret,
            raw_error=e,
        ) from e
    except requests.exceptions.RequestException as e:
        raise RazorpayNetworkError(
            f"Network error while connecting to Razorpay: {str(e)}",
            secret=secret,
            raw_error=e,
        ) from e
    except Exception as e:
        raise RazorpayAPIError(
            f"Unexpected Razorpay error: {str(e)}",
            secret=secret,
            raw_error=e,
        ) from e
