"""
Razorpay client provider.

Initializes the official Razorpay SDK client using settings or explicit credentials.
Keeps credentials isolated and in environment variables.
"""

import razorpay

from app.config import settings
from app.services.razorpay.exceptions import RazorpayAuthError


def get_razorpay_client(
    key_id: str | None = None, key_secret: str | None = None
) -> razorpay.Client:
    """
    Returns an initialized Razorpay Client instance.
    If key_id / key_secret are omitted, loads them from application settings.
    """
    effective_key_id = key_id or settings.razorpay_key_id
    effective_key_secret = key_secret or settings.razorpay_key_secret

    if not effective_key_id or not effective_key_secret:
        raise RazorpayAuthError(
            "Razorpay credentials missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
        )

    return razorpay.Client(auth=(effective_key_id, effective_key_secret))
