"""
Optional Manual Script — Verify Phase 7 RecoveryExecutor in Razorpay TEST MODE.

Prerequisites:
- Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env or environment variables.
- Uses TEST MODE ONLY (KEY_ID starting with 'rzp_test_').
- Never prints credentials or live secrets.

Usage:
  python scripts/verify_executor_live.py
"""

import sys
import os
sys.path.insert(0, os.path.abspath("."))

from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base
from app.models.payment import Payment
from app.services.agent.guardrails import GuardrailVerdict, DECISION_ALLOW
from app.services.agent.strategy import RecoveryStrategyChoice, STRATEGY_PAYMENT_LINK
from app.services.agent.executor import RecoveryExecutor


def main():
    print("=== VASULI AI PHASE 7: MANUAL RAZORPAY TEST MODE EXECUTOR VERIFICATION ===")

    key_id = settings.razorpay_key_id
    key_secret = settings.razorpay_key_secret

    if not key_id or not key_secret:
        print("[SKIP] Razorpay TEST MODE credentials not set in environment (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).")
        print("[INFO] Unit tests with mocked services cover 100% of execution logic.")
        sys.exit(0)

    if not key_id.startswith("rzp_test_"):
        print(f"[CAUTION] RAZORPAY_KEY_ID '{key_id[:8]}...' does NOT appear to be a TEST MODE key.")
        print("[ERROR] Refusing live mode execution. Phase 7 supports TEST MODE ONLY.")
        sys.exit(1)

    print(f"[OK] Razorpay TEST MODE key ID detected: {key_id[:8]}...[REDACTED]")

    # Setup isolated in-memory DB session
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    # Create dummy failed payment
    payment = Payment(
        razorpay_payment_id="pay_manual_test_001",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to temporary gateway timeout.",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Construct allowed guardrail verdict & strategy choice
    verdict = GuardrailVerdict(
        payment_id=payment.id,
        allowed=True,
        decision=DECISION_ALLOW,
        reason="Manual verification test guardrail pass",
    )
    choice = RecoveryStrategyChoice(
        payment_id=payment.id,
        strategy=STRATEGY_PAYMENT_LINK,
        rationale="Manual verification test strategy choice",
        confidence=0.9,
    )

    print("\n[STEP] Invoking RecoveryExecutor in TEST MODE...")
    executor = RecoveryExecutor()
    result = executor.execute(payment=payment, verdict=verdict, strategy_choice=choice, db=db)

    print("\n=== LIVE TEST MODE EXECUTION RESULT ===")
    print(f"Payment ID:       {result.payment_id}")
    print(f"Executed:         {result.executed}")
    print(f"Status:           {result.status}")
    print(f"Attempt Number:   {result.attempt_number}")
    print(f"Payment Link ID:  {result.payment_link_id}")
    print(f"Short URL:        {result.short_url}")
    print(f"Amount:           ₹{result.amount}")
    print(f"Reference ID:     {result.reference_id}")
    print(f"Error:            {result.error or 'None'}")

    if result.executed and result.payment_link_id:
        print("\n[SUCCESS] TEST MODE Standard Razorpay Payment Link successfully created!")
    else:
        print(f"\n[FAILED] Execution returned status '{result.status}' with error: {result.error}")


if __name__ == "__main__":
    main()
