from decimal import Decimal
import pytest

from app.models.payment import Payment
from app.services.agent.detector import RevenueRiskDetector, RevenueRiskSignal


def test_detector_failed_payment_positive_amount():
    payment = Payment(id=1, razorpay_payment_id="pay_fail_001", amount=Decimal("500.00"), status="failed")
    detector = RevenueRiskDetector()
    signal = detector.detect(payment)

    assert isinstance(signal, RevenueRiskSignal)
    assert signal.payment_id == 1
    assert signal.is_at_risk is True
    assert "status is 'failed'" in signal.risk_reason


def test_detector_captured_payment_not_at_risk():
    payment = Payment(id=2, razorpay_payment_id="pay_cap_001", amount=Decimal("1000.00"), status="captured")
    detector = RevenueRiskDetector()
    signal = detector.detect(payment)

    assert signal.payment_id == 2
    assert signal.is_at_risk is False
    assert "revenue is not at risk" in signal.risk_reason


def test_detector_zero_or_negative_amount():
    payment_zero = Payment(id=3, razorpay_payment_id="pay_zero", amount=Decimal("0.00"), status="failed")
    detector = RevenueRiskDetector()
    signal = detector.detect(payment_zero)
    assert signal.is_at_risk is False

    payment_neg = Payment(id=4, razorpay_payment_id="pay_neg", amount=Decimal("-50.00"), status="failed")
    signal_neg = detector.detect(payment_neg)
    assert signal_neg.is_at_risk is False


def test_detector_invalid_unknown_status_conservative():
    payment = Payment(id=5, razorpay_payment_id="pay_unknown", amount=Decimal("100.00"), status="pending_verification")
    detector = RevenueRiskDetector()
    signal = detector.detect(payment)

    assert signal.is_at_risk is False
    assert "Conservative default" in signal.risk_reason


def test_detector_invalid_payment_model():
    detector = RevenueRiskDetector()
    with pytest.raises(ValueError):
        detector.detect(None)
