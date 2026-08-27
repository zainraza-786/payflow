from decimal import Decimal
import pytest

from app.models.payment import Payment
from app.models.recovery_attempt import RecoveryAttempt
from app.services.agent.diagnostician import (
    PaymentDiagnostician,
    DiagnosisResult,
    ROOT_CAUSE_TEMPORARY_GATEWAY,
    ROOT_CAUSE_PAYMENT_METHOD,
    ROOT_CAUSE_INSUFFICIENT_FUNDS,
    ROOT_CAUSE_AUTHENTICATION,
    ROOT_CAUSE_REPEATED,
    ROOT_CAUSE_NON_RECOVERABLE,
    ROOT_CAUSE_UNKNOWN,
    RECOVERABILITY_RECOVERABLE,
    RECOVERABILITY_POSSIBLY_RECOVERABLE,
    RECOVERABILITY_NON_RECOVERABLE,
    RECOVERABILITY_UNKNOWN,
)


def test_diagnose_insufficient_funds():
    payment = Payment(id=1, razorpay_payment_id="pay_inf_01", amount=Decimal("100.00"), status="failed", failure_reason="Payment failed due to insufficient funds.")
    diag = PaymentDiagnostician().diagnose(payment)

    assert isinstance(diag, DiagnosisResult)
    assert diag.root_cause == ROOT_CAUSE_INSUFFICIENT_FUNDS
    assert diag.recoverability == RECOVERABILITY_RECOVERABLE
    assert 0.0 <= diag.confidence <= 1.0
    assert diag.confidence == 0.95


def test_diagnose_authentication_failure():
    payment = Payment(id=2, razorpay_payment_id="pay_auth_01", amount=Decimal("200.00"), status="failed", failure_reason="3D Secure OTP authentication failed")
    diag = PaymentDiagnostician().diagnose(payment)

    assert diag.root_cause == ROOT_CAUSE_AUTHENTICATION
    assert diag.recoverability == RECOVERABILITY_RECOVERABLE
    assert 0.0 <= diag.confidence <= 1.0


def test_diagnose_payment_method_issue():
    payment = Payment(id=3, razorpay_payment_id="pay_card_01", amount=Decimal("300.00"), status="failed", failure_reason="Card expired or declined by issuer")
    diag = PaymentDiagnostician().diagnose(payment)

    assert diag.root_cause == ROOT_CAUSE_PAYMENT_METHOD
    assert diag.recoverability == RECOVERABILITY_POSSIBLY_RECOVERABLE
    assert 0.0 <= diag.confidence <= 1.0


def test_diagnose_temporary_gateway_failure():
    payment = Payment(id=4, razorpay_payment_id="pay_gw_01", amount=Decimal("400.00"), status="failed", failure_reason="Bank gateway timeout during processing")
    diag = PaymentDiagnostician().diagnose(payment)

    assert diag.root_cause == ROOT_CAUSE_TEMPORARY_GATEWAY
    assert diag.recoverability == RECOVERABILITY_RECOVERABLE
    assert 0.0 <= diag.confidence <= 1.0


def test_diagnose_non_recoverable():
    payment = Payment(id=5, razorpay_payment_id="pay_fraud_01", amount=Decimal("500.00"), status="failed", failure_reason="Stolen card fraudulent transaction blocked")
    diag = PaymentDiagnostician().diagnose(payment)

    assert diag.root_cause == ROOT_CAUSE_NON_RECOVERABLE
    assert diag.recoverability == RECOVERABILITY_NON_RECOVERABLE
    assert 0.0 <= diag.confidence <= 1.0


test_cases_normalization = [
    ("   INSUFFICIENT_FUNDS   ", ROOT_CAUSE_INSUFFICIENT_FUNDS),
    ("AUTHENTICATION_FAILED_OTP", ROOT_CAUSE_AUTHENTICATION),
    ("GATEWAY_TIMEOUT_ERROR", ROOT_CAUSE_TEMPORARY_GATEWAY),
]


@pytest.mark.parametrize("reason_input,expected_cause", test_cases_normalization)
def test_diagnose_normalization(reason_input, expected_cause):
    payment = Payment(id=6, razorpay_payment_id="pay_norm", amount=Decimal("100.00"), status="failed", failure_reason=reason_input)
    diag = PaymentDiagnostician().diagnose(payment)

    assert diag.root_cause == expected_cause
    assert 0.0 <= diag.confidence <= 1.0


def test_diagnose_unknown_failure_reason():
    payment = Payment(id=7, razorpay_payment_id="pay_unk", amount=Decimal("100.00"), status="failed", failure_reason="Some obscure custom internal code 999")
    diag = PaymentDiagnostician().diagnose(payment)

    assert diag.root_cause == ROOT_CAUSE_UNKNOWN
    assert diag.recoverability == RECOVERABILITY_UNKNOWN
    assert diag.confidence == 0.30


def test_diagnose_missing_failure_reason():
    payment = Payment(id=8, razorpay_payment_id="pay_nil", amount=Decimal("100.00"), status="failed", failure_reason=None)
    diag = PaymentDiagnostician().diagnose(payment)

    assert diag.root_cause == ROOT_CAUSE_UNKNOWN
    assert diag.recoverability == RECOVERABILITY_UNKNOWN
    assert diag.confidence == 0.30


def test_diagnose_repeated_failure():
    payment = Payment(id=9, razorpay_payment_id="pay_rep", amount=Decimal("100.00"), status="failed", failure_reason="insufficient_funds")
    # Attach a prior recovery attempt
    payment.recovery_attempts = [
        RecoveryAttempt(id=101, payment_id=9, attempt_number=1, strategy="retry_link", status="failed")
    ]
    diag = PaymentDiagnostician().diagnose(payment)

    assert diag.root_cause == ROOT_CAUSE_REPEATED
    assert diag.recoverability == RECOVERABILITY_POSSIBLY_RECOVERABLE
    assert "1 prior recovery attempt(s)" in diag.explanation
    assert 0.0 <= diag.confidence <= 1.0


def test_diagnose_invalid_payment_model():
    with pytest.raises(ValueError):
        PaymentDiagnostician().diagnose(None)
