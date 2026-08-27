"""
Razorpay Webhook Signature Verification.

Verifies the HMAC SHA256 signature of incoming Razorpay webhook requests against raw HTTP body bytes.
Never logs secrets or raw signature tokens.
"""

import hashlib
import hmac


def verify_webhook_signature(
    raw_body: bytes, signature: str | None, secret: str | None
) -> bool:
    """
    Verifies the Razorpay webhook HMAC SHA256 signature against the raw HTTP request body bytes.

    Uses constant-time comparison to prevent timing attacks.
    Returns True if valid, False otherwise.
    """
    if not signature or not secret or not raw_body:
        return False

    try:
        expected_signature = generate_webhook_signature(raw_body, secret)
        return hmac.compare_digest(expected_signature.lower(), signature.lower().strip())
    except Exception:
        return False


def generate_webhook_signature(raw_body: bytes, secret: str) -> str:
    """
    Generates HMAC SHA256 signature for given body bytes and secret key.
    """
    return hmac.new(
        secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
