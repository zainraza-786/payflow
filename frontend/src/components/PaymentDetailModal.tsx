import React from 'react';
import type { Payment, AuditLog, ApprovalResult } from '../types';

interface PaymentDetailModalProps {
  payment: Payment | null;
  onClose: () => void;
  auditLogs: AuditLog[];
  approvals: ApprovalResult[];
  onRunWorkflow: (paymentId: number) => void;
}

export const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({
  payment,
  onClose,
  auditLogs,
  approvals,
  onRunWorkflow,
}) => {
  if (!payment) return null;

  const paymentAudits = auditLogs.filter((a) => a.payment_id === payment.id);
  const paymentApproval = approvals.find((a) => a.payment_id === payment.id);
  const isCaptured = payment.status === 'captured';
  const isHighValue = (payment.amount || 0) >= 10000;

  const hasRisk = paymentAudits.some((a) => a.event === 'revenue.risk.detected' || a.event === 'payment.failed');
  const hasDiagnosis = paymentAudits.some((a) => a.event === 'payment.diagnosed');
  const hasStrategy = paymentAudits.some((a) => a.event === 'recovery.strategy.selected');
  const hasGuardrail = paymentAudits.some((a) => a.event === 'recovery.guardrail.evaluated');
  const hasApprovalReq = paymentAudits.some((a) => a.event === 'recovery.approval.requested');
  const isApproved = paymentApproval?.approval_status === 'APPROVED';
  const hasExecution = paymentAudits.some((a) => a.event === 'recovery.payment_link.created' || a.event === 'recovery.execution.started');
  const isRecovered = isCaptured || paymentAudits.some((a) => a.event === 'revenue.recovered');

  const lifecycleStages = [
    { label: 'Payment Failed', active: true, done: true },
    { label: 'Risk Detected', active: hasRisk, done: hasRisk },
    { label: 'Diagnosed', active: hasDiagnosis, done: hasDiagnosis },
    { label: 'Strategy Selected', active: hasStrategy, done: hasStrategy },
    { label: 'Guardrail Evaluated', active: hasGuardrail, done: hasGuardrail },
    { label: 'Human Approval', active: hasApprovalReq || isHighValue, done: isApproved },
    { label: 'Execution', active: hasExecution, done: hasExecution },
    { label: 'Revenue Recovered', active: isRecovered, done: isRecovered },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-surface-container-lowest border-l border-border-subtle h-full flex flex-col justify-between overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border-subtle flex items-center justify-between sticky top-0 bg-surface-container-lowest z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-tabular-nums text-xs font-bold text-primary">Payment #{payment.id}</span>
              <span
                className={`px-2 py-0.5 rounded-sm font-label-caps text-label-caps border ${
                  isCaptured
                    ? 'bg-status-recovered/10 text-status-recovered border-status-recovered/30'
                    : 'bg-status-failure/10 text-status-failure border-status-failure/30'
                }`}
              >
                {payment.status.toUpperCase()}
              </span>
            </div>
            <h2 className="font-tabular-nums text-2xl font-bold text-primary tracking-tight mt-1">
              ₹{(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {payment.currency}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-sm text-secondary hover:text-primary hover:bg-surface-subtle transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 font-body-sm text-body-sm">
          {/* Visual Connected Stepper Timeline matching Stitch Payment Detail */}
          <div className="p-5 rounded-sm bg-surface-subtle border border-border-subtle space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-label-caps text-label-caps text-secondary font-bold">
                RECOVERY LIFECYCLE STAGES
              </h3>
              <span className="font-tabular-nums font-medium text-secondary text-xs">8 Stages Tracked</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {lifecycleStages.map((stage, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-sm border text-center transition-all ${
                    stage.done
                      ? 'bg-status-recovered/10 border-status-recovered/30 text-status-recovered'
                      : stage.active
                      ? 'bg-status-pending/10 border-status-pending/30 text-status-pending'
                      : 'bg-surface-container-lowest border-border-subtle text-secondary'
                  }`}
                >
                  <div className="font-label-caps text-[10px] font-bold tracking-tight">{stage.label}</div>
                  <div className="font-body-sm text-[10px] font-semibold mt-1 flex items-center justify-center gap-1">
                    {stage.done ? (
                      <>
                        <span className="material-symbols-outlined text-status-recovered text-[14px]">check</span>
                        <span>Verified</span>
                      </>
                    ) : stage.active ? (
                      <span className="text-status-pending">Active</span>
                    ) : (
                      <span>Waiting</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Core Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-sm bg-surface-subtle border border-border-subtle">
              <span className="font-label-caps text-label-caps text-secondary block">
                RAZORPAY PAYMENT ID
              </span>
              <p className="font-tabular-nums text-primary font-semibold mt-0.5">{payment.razorpay_payment_id}</p>
            </div>
            <div className="p-4 rounded-sm bg-surface-subtle border border-border-subtle">
              <span className="font-label-caps text-label-caps text-secondary block">
                FAILURE DIAGNOSIS
              </span>
              <p className="text-primary mt-0.5 font-semibold">{payment.failure_reason || 'N/A'}</p>
            </div>
          </div>

          {/* Diagnostic & Guardrail Card */}
          <div className="p-4 rounded-sm bg-surface-subtle border border-border-subtle space-y-3">
            <h4 className="font-headline-md text-body-md font-bold text-primary">Guardrail Policy & Strategy Evaluation</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5 border-b border-border-subtle">
                <span className="text-secondary">Risk Signal Evaluation:</span>
                <span className="font-semibold text-status-failure">FAILED_PAYMENT_RISK</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border-subtle">
                <span className="text-secondary">Selected Strategy:</span>
                <span className="font-tabular-nums font-bold text-primary">PAYMENT_LINK</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border-subtle">
                <span className="text-secondary">High-Value Threshold Check:</span>
                <span className={`font-semibold ${isHighValue ? 'text-status-pending' : 'text-status-recovered'}`}>
                  {isHighValue ? 'EXCEEDED (≥ ₹10,000)' : 'PASSED (< ₹10,000)'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-secondary">Approval Requirement:</span>
                <span className={`font-semibold ${paymentApproval ? 'text-status-pending' : 'text-secondary'}`}>
                  {paymentApproval ? `Approval #${paymentApproval.id} (${paymentApproval.approval_status})` : 'Standard Execution'}
                </span>
              </div>
            </div>
          </div>

          {/* Audit History for Payment */}
          <div className="space-y-3">
            <h4 className="font-headline-md text-body-md font-bold text-primary">Payment Event History</h4>
            {paymentAudits.length === 0 ? (
              <p className="font-body-sm text-body-sm text-secondary">No audit events recorded for this payment yet.</p>
            ) : (
              <div className="space-y-2">
                {paymentAudits.map((log) => (
                  <div key={log.id} className="p-3 rounded-sm bg-surface-subtle border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <span className="font-tabular-nums text-primary font-semibold">{log.event}</span>
                      <span className="font-tabular-nums text-[11px] text-secondary">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-secondary text-[11px] mt-0.5">{log.reason || log.decision}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-border-subtle bg-surface-container-lowest flex items-center justify-between">
          <span className="font-label-caps text-label-caps text-secondary">Payflow Engine v1.0</span>
          {!isCaptured && (
            <button
              onClick={() => onRunWorkflow(payment.id)}
              className="px-4 py-2 rounded-sm bg-primary hover:bg-slate-800 text-white font-body-sm text-body-sm font-semibold transition-colors shadow-xs"
            >
              Run Workflow Assessment
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

