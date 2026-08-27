"""
Optional manual verification script to simulate sending a signed Razorpay payment.failed webhook locally.

Usage:
    python scripts/verify_webhook_manual.py

Requirements:
- RAZORPAY_WEBHOOK_SECRET must be set in .env or passed as environment variable.
"""

import sys
import os
import json
import hashlib
import hmac
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
load_dotenv()

from app.config import settings
from fastapi.testclient import TestClient
from app.main import app


def main():
    print("=== Manual Signed Webhook Simulation ===")

    secret = settings.razorpay_webhook_secret
    if not secret:
        print("[SKIP] RAZORPAY_WEBHOOK_SECRET is not set in environment.")
        print("Set RAZORPAY_WEBHOOK_SECRET in .env to test manual webhook posting.")
        sys.exit(0)

    payload = {
        "entity": "event",
        "account_id": "acc_manual_test",
        "event": "payment.failed",
        "contains": ["payment"],
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_manual_verify_001",
                    "entity": "payment",
                    "amount": 25000,  # ₹250.00
                    "currency": "INR",
                    "status": "failed",
                    "method": "upi",
                    "error_code": "BAD_REQUEST_ERROR",
                    "error_description": "Payment failed due to customer authentication failure.",
                    "error_reason": "payment_authentication_failed",
                    "created_at": 1600000000,
                }
            }
        },
        "created_at": 1600000000,
    }

    body_bytes = json.dumps(payload).encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()

    print("[TEST] Sending signed payment.failed webhook to POST /webhooks/razorpay...")
    client = TestClient(app)
    response = client.post(
        "/webhooks/razorpay",
        content=body_bytes,
        headers={"X-Razorpay-Signature": signature},
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.json()}")

    if response.status_code == 200:
        print("\n=== MANUAL SIGNED WEBHOOK VERIFICATION PASSED ===")
    else:
        print("\n[FAIL] Webhook verification failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
