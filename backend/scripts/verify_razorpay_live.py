"""
Optional live manual verification script for Razorpay TEST MODE connection.

Run this script to test actual API connectivity with Razorpay TEST MODE if credentials
are set in environment variables (.env).

Usage:
    python scripts/verify_razorpay_live.py

Requirements:
- RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env or environment.
- Credentials must be TEST MODE keys (starting with rzp_test_).
"""

import sys
import os
from decimal import Decimal
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
load_dotenv()

from app.config import settings

from app.services.razorpay import (
    get_razorpay_client,
    create_payment_link,
    fetch_payment,
    RazorpayAuthError,
)


def main():
    print("=== Razorpay TEST MODE Verification ===")

    key_id = settings.razorpay_key_id
    if not key_id or not settings.razorpay_key_secret:
        print("[SKIP] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not found in environment.")
        print("Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env to perform live TEST MODE verification.")
        sys.exit(0)

    if not key_id.startswith("rzp_test_"):
        print("[ERROR] CAUTION: Credentials do not start with 'rzp_test_'. Aborting to avoid using live mode.")
        sys.exit(1)

    print(f"[INFO] Initializing Razorpay Client with Key ID: {key_id[:10]}...")

    try:
        client = get_razorpay_client()

        # 1. Create a Payment Link test
        print("[TEST] Creating test Payment Link (Amount: ₹10.00)...")
        plink = create_payment_link(
            amount=Decimal("10.00"),
            description="Phase 2 Verification Payment Link",
            reference_id="ref_phase2_verification",
            client=client,
        )

        print("[SUCCESS] Payment Link Created!")
        print(f"  - ID: {plink.get('id')}")
        print(f"  - Short URL: {plink.get('short_url')}")
        print(f"  - Status: {plink.get('status')}")
        print(f"  - Amount (paise): {plink.get('amount')}")
        print(f"  - Currency: {plink.get('currency')}")

        print("\n=== LIVE TEST MODE VERIFICATION PASSED ===")
    except RazorpayAuthError as e:
        print(f"[FAIL] Authentication Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[FAIL] Error during live verification: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
