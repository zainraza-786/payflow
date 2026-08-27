import pytest

from app.models.payment import Payment
from app.services.agent.detector import NotImplementedDetector
from app.services.agent.diagnostician import NotImplementedDiagnostician, Diagnosis
from app.services.agent.strategy import NotImplementedStrategySelector, RecoveryStrategyChoice
from app.services.agent.guardrails import NotImplementedGuardrailEngine
from app.services.agent.executor import NotImplementedExecutor
from app.services.agent.observer import NotImplementedObserver
from app.services.agent.audit import NotImplementedAuditRecorder


def test_agent_stubs_raise_not_implemented():
    payment = Payment(id=1, razorpay_payment_id="pay_stub_1", amount=100, status="failed")
    diagnosis = Diagnosis(payment_id=1)
    strategy_choice = RecoveryStrategyChoice(payment_id=1)

    with pytest.raises(NotImplementedError):
        NotImplementedDetector().detect(payment)

    with pytest.raises(NotImplementedError):
        NotImplementedDiagnostician().diagnose(payment)

    with pytest.raises(NotImplementedError):
        NotImplementedStrategySelector().select(diagnosis)

    with pytest.raises(NotImplementedError):
        NotImplementedGuardrailEngine().evaluate(strategy_choice)

    with pytest.raises(NotImplementedError):
        NotImplementedExecutor().execute(strategy_choice)

    with pytest.raises(NotImplementedError):
        NotImplementedObserver().observe(payment)

    with pytest.raises(NotImplementedError):
        NotImplementedAuditRecorder().record(
            db=None, payment_id=1, event="test", decision="test"
        )
