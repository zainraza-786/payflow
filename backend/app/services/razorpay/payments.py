"""
Razorpay Payment service layer.

Provides typed function fetch_payment to retrieve payment details from Razorpay API.
"""

from typing import Any
import razorpay
from razorpay.errors import BadRequestError, GatewayError, ServerError, SignatureVerificationError
import requests

from app.services.razorpay.client import get_razorpay_client
from app.services.razorpay.exceptions import (
    RazorpayAuthError,
    RazorpayNotFoundError,
    RazorpayAPIError,
    RazorpayNetworkError,
)


def fetch_payment(
    payment_id: str, client: razorpay.Client | None = None
) -> dict[str, Any]:
    """
    Fetches a payment by Razorpay payment ID from Razorpay TEST MODE API.

    Returns structured payment information dict.
    Safely handles auth, 4xx/5xx, and network errors without exposing secrets.
    """
    if not payment_id or not isinstance(payment_id, str):
        raise RazorpayAPIError("Invalid payment_id provided.")

    if client is None:
        client = get_razorpay_client()

    secret = client.auth[1] if hasattr(client, "auth") and client.auth else None

    try:
        payment_data = client.payment.fetch(payment_id)
        if not isinstance(payment_data, dict):
            raise RazorpayAPIError("Unexpected non-dict response format received from Razorpay API.")
        return payment_data
    except BadRequestError as e:
        err_msg = str(e)
        err_lower = err_msg.lower()
        if "auth" in err_lower or "unauthorized" in err_lower or "key" in err_lower:
            raise RazorpayAuthError(
                f"Razorpay authentication failed: {err_msg}",
                secret=secret,
                raw_error=e,
            ) from e
        if "not found" in err_lower or "invalid" in err_lower:
            raise RazorpayNotFoundError(
                f"Razorpay payment '{payment_id}' not found or invalid request: {err_msg}",
                secret=secret,
                raw_error=e,
            ) from e
        raise RazorpayAPIError(
            f"Razorpay API BadRequestError: {err_msg}",
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
