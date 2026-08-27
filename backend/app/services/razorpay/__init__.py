"""
Razorpay integration package.

Exposes client provider, payment service, payment link service, signature verification, and custom exceptions.
"""

from app.services.razorpay.client import get_razorpay_client
from app.services.razorpay.payments import fetch_payment
from app.services.razorpay.payment_links import create_payment_link, amount_to_smallest_unit
from app.services.razorpay.webhook_signature import verify_webhook_signature
from app.services.razorpay.exceptions import (
    RazorpayIntegrationError,
    RazorpayAuthError,
    RazorpayNotFoundError,
    RazorpayAPIError,
    RazorpayNetworkError,
)

__all__ = [
    "get_razorpay_client",
    "fetch_payment",
    "create_payment_link",
    "amount_to_smallest_unit",
    "verify_webhook_signature",
    "RazorpayIntegrationError",
    "RazorpayAuthError",
    "RazorpayNotFoundError",
    "RazorpayAPIError",
    "RazorpayNetworkError",
]
