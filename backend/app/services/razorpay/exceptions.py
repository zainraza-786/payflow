"""
Razorpay integration custom exceptions.

Provides typed exceptions for authentication failures, API errors,
404 not found, and network timeouts. Ensures secrets are never exposed in error messages.
"""

from typing import Any


class RazorpayIntegrationError(Exception):
    """Base exception for all Razorpay service integration errors."""

    def __init__(self, message: str, secret: str | None = None, raw_error: Any = None):
        if secret and secret in message:
            message = message.replace(secret, "[REDACTED]")
        super().__init__(message)
        self.message = message
        self.raw_error = raw_error


class RazorpayAuthError(RazorpayIntegrationError):
    """Raised when Razorpay authentication fails (e.g. invalid key_id or key_secret)."""
    pass


class RazorpayNotFoundError(RazorpayIntegrationError):
    """Raised when a requested Razorpay entity (payment, link, etc.) is not found."""
    pass


class RazorpayAPIError(RazorpayIntegrationError):
    """Raised when Razorpay returns a 4xx or 5xx response."""
    pass


class RazorpayNetworkError(RazorpayIntegrationError):
    """Raised when a network timeout or connectivity failure occurs."""
    pass
