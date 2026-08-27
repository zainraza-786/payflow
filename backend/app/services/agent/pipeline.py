"""
Phase 7 Full Agent Pipeline.

Orchestrates RevenueRiskDetector, PaymentDiagnostician, RecoveryStrategySelector, RecoveryGuardrailEngine, and RecoveryExecutor.
Records auditable events (revenue.risk.detected, payment.diagnosed, recovery.strategy.selected, recovery.guardrail.evaluated, recovery.execution.*).
Does NOT execute recovery actions unless execute_allowed=True is explicitly passed.
"""

from datetime import datetime
from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.services.agent.detector import RevenueRiskDetector, RevenueRiskSignal
from app.services.agent.diagnostician import PaymentDiagnostician, DiagnosisResult
from app.services.agent.strategy import RecoveryStrategySelector, RecoveryStrategyChoice
from app.services.agent.guardrails import RecoveryGuardrailEngine, GuardrailVerdict
from app.services.agent.executor import RecoveryExecutor, ExecutionResult
from app.services.agent.audit import AuditService


def process_payment_risk_and_diagnosis(
    payment: Payment, db: Session | None = None
) -> tuple[RevenueRiskSignal, DiagnosisResult | None]:
    """
    Executes detection and diagnosis for a given Payment.
    Maintained for backward compatibility.
    """
    detector = RevenueRiskDetector()
    diagnostician = PaymentDiagnostician()
    audit_service = AuditService()

    # 1. Detection
    signal = detector.detect(payment)
    if db and payment.id:
        audit_service.record(
            db=db,
            payment_id=payment.id,
            event="revenue.risk.detected",
            decision="at_risk" if signal.is_at_risk else "not_at_risk",
            reason=signal.risk_reason,
            guardrail_result=None,
        )

    # 2. Diagnosis (only if at risk)
    if signal.is_at_risk:
        diagnosis = diagnostician.diagnose(payment)
        if db and payment.id:
            audit_service.record(
                db=db,
                payment_id=payment.id,
                event="payment.diagnosed",
                decision="diagnosed",
                reason=(
                    f"Root cause: {diagnosis.root_cause}. Explanation: {diagnosis.explanation} "
                    f"(Confidence: {diagnosis.confidence:.2f}, Recoverability: {diagnosis.recoverability})"
                ),
                guardrail_result=None,
            )
        return signal, diagnosis

    return signal, None


def process_payment_full_pipeline(
    payment: Payment,
    db: Session | None = None,
    current_time: datetime | None = None,
    execute_allowed: bool = False,
) -> tuple[
    RevenueRiskSignal,
    DiagnosisResult | None,
    RecoveryStrategyChoice | None,
    GuardrailVerdict | None,
    ExecutionResult | None,
]:
    """
    Executes detection, diagnosis, strategy selection, guardrail evaluation, and optional recovery execution.

    Records truthful AuditLog entries for each step.
    Executor runs ONLY if execute_allowed is True.
    """
    signal, diagnosis = process_payment_risk_and_diagnosis(payment, db=db)

    if signal.is_at_risk and diagnosis:
        selector = RecoveryStrategySelector()
        choice = selector.select(diagnosis)

        if db and payment.id:
            audit_service = AuditService()
            audit_service.record(
                db=db,
                payment_id=payment.id,
                event="recovery.strategy.selected",
                decision=choice.strategy,
                reason=choice.rationale,
                guardrail_result=None,
            )

        # 3. Guardrail Evaluation
        guardrail_engine = RecoveryGuardrailEngine()
        verdict = guardrail_engine.evaluate(
            payment=payment,
            diagnosis=diagnosis,
            strategy_choice=choice,
            current_time=current_time,
        )

        if db and payment.id:
            audit_service = AuditService()
            audit_service.record(
                db=db,
                payment_id=payment.id,
                event="recovery.guardrail.evaluated",
                decision=verdict.decision,
                reason=verdict.reason,
                guardrail_result=verdict.decision,
            )

        # 4. Bounded Recovery Execution (only when execute_allowed=True)
        execution_result = None
        if execute_allowed:
            executor = RecoveryExecutor()
            execution_result = executor.execute(
                payment=payment,
                verdict=verdict,
                strategy_choice=choice,
                db=db,
            )

        return signal, diagnosis, choice, verdict, execution_result

    return signal, diagnosis, None, None, None
