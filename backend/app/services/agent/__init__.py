"""
Agent services package.

Exposes RevenueRiskDetector, PaymentDiagnostician, RecoveryStrategySelector, RecoveryGuardrailEngine, RecoveryExecutor, PaymentObserver, RecoveryWorkflowOrchestrator, RecoveryApprovalService, AuditService, and pipeline runners.
"""

from app.services.agent.detector import RevenueRiskDetector, RevenueRiskSignal, NotImplementedDetector
from app.services.agent.diagnostician import (
    PaymentDiagnostician,
    DiagnosisResult,
    NotImplementedDiagnostician,
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
from app.services.agent.strategy import (
    RecoveryStrategySelector,
    RecoveryStrategyChoice,
    NotImplementedStrategySelector,
    STRATEGY_DELAYED_RETRY,
    STRATEGY_PAYMENT_LINK,
    STRATEGY_ESCALATE,
    STRATEGY_STOP,
    STRATEGY_REVIEW,
    ALL_STRATEGIES,
)
from app.services.agent.guardrails import (
    RecoveryGuardrailEngine,
    GuardrailVerdict,
    NotImplementedGuardrailEngine,
    DECISION_ALLOW,
    DECISION_BLOCK,
    DECISION_HUMAN_APPROVAL,
    DECISION_STOP,
    CONTROLLED_DECISIONS,
    is_quiet_hours,
)
from app.services.agent.executor import (
    RecoveryExecutor,
    ExecutionResult,
    NotImplementedExecutor,
)
from app.services.agent.observer import (
    PaymentObserver,
    AttributionResult,
    NotImplementedObserver,
)
from app.services.agent.orchestrator import (
    RecoveryWorkflowOrchestrator,
    RecoveryWorkflowResult,
    NotImplementedOrchestrator,
)
from app.services.agent.event_workflow import process_payment_failure_workflow
from app.services.agent.approval import RecoveryApprovalService, ApprovalResult
from app.services.agent.audit import (
    AuditService,
    NotImplementedAuditRecorder,
    get_audit_history,
    get_payment_recovery_summary,
)
from app.services.agent.pipeline import (
    process_payment_risk_and_diagnosis,
    process_payment_full_pipeline,
)

__all__ = [
    "RevenueRiskDetector",
    "RevenueRiskSignal",
    "NotImplementedDetector",
    "PaymentDiagnostician",
    "DiagnosisResult",
    "NotImplementedDiagnostician",
    "RecoveryStrategySelector",
    "RecoveryStrategyChoice",
    "NotImplementedStrategySelector",
    "RecoveryGuardrailEngine",
    "GuardrailVerdict",
    "NotImplementedGuardrailEngine",
    "RecoveryExecutor",
    "ExecutionResult",
    "NotImplementedExecutor",
    "PaymentObserver",
    "AttributionResult",
    "NotImplementedObserver",
    "RecoveryWorkflowOrchestrator",
    "RecoveryWorkflowResult",
    "NotImplementedOrchestrator",
    "process_payment_failure_workflow",
    "RecoveryApprovalService",
    "ApprovalResult",
    "is_quiet_hours",
    "AuditService",
    "NotImplementedAuditRecorder",
    "get_audit_history",
    "get_payment_recovery_summary",
    "process_payment_risk_and_diagnosis",
    "process_payment_full_pipeline",
    "ROOT_CAUSE_TEMPORARY_GATEWAY",
    "ROOT_CAUSE_PAYMENT_METHOD",
    "ROOT_CAUSE_INSUFFICIENT_FUNDS",
    "ROOT_CAUSE_AUTHENTICATION",
    "ROOT_CAUSE_REPEATED",
    "ROOT_CAUSE_NON_RECOVERABLE",
    "ROOT_CAUSE_UNKNOWN",
    "RECOVERABILITY_RECOVERABLE",
    "RECOVERABILITY_POSSIBLY_RECOVERABLE",
    "RECOVERABILITY_NON_RECOVERABLE",
    "RECOVERABILITY_UNKNOWN",
    "STRATEGY_DELAYED_RETRY",
    "STRATEGY_PAYMENT_LINK",
    "STRATEGY_ESCALATE",
    "STRATEGY_STOP",
    "STRATEGY_REVIEW",
    "ALL_STRATEGIES",
    "DECISION_ALLOW",
    "DECISION_BLOCK",
    "DECISION_HUMAN_APPROVAL",
    "DECISION_STOP",
    "CONTROLLED_DECISIONS",
]
