import React from 'react';
import { X, Check } from 'lucide-react';
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

  // Determine stage progress for visual timeline
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
        className="w-full max-w-2xl bg-white border-l border-slate-200 h-full flex flex-col justify-between overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-slate-900">Payment #{payment.id}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  isCaptured
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {payment.status.toUpperCase()}
              </span>
            </div>
            <h2 className="font-mono text-2xl font-bold text-slate-900 tracking-tight mt-1">
              ₹{(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {payment.currency}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Visual Connected Stepper Timeline */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                DETERMINISTIC RECOVERY PIPELINE
              </h3>
              <span className="text-[11px] font-mono font-medium text-slate-600">8 Lifecycle Stages</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {lifecycleStages.map((stage, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded border text-center transition-all ${
                    stage.done
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : stage.active
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-tight">{stage.label}</div>
                  <div className="text-[9px] font-semibold mt-1 flex items-center justify-center gap-1">
                    {stage.done ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Verified</span>
                      </>
                    ) : stage.active ? (
                      <span className="text-amber-700">⟳ Active</span>
                    ) : (
                      <span>— Waiting</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Core Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
                Razorpay Payment ID
              </span>
              <p className="font-mono text-slate-900 font-semibold mt-0.5">{payment.razorpay_payment_id}</p>
            </div>
            <div className="p-3.5 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
                Failure Cause
              </span>
              <p className="text-slate-900 mt-0.5 font-semibold">{payment.failure_reason || 'N/A'}</p>
            </div>
          </div>

          {/* Diagnostic & Guardrail Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <h4 className="font-semibold text-slate-900 text-xs">Guardrail & Recovery Evaluation</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">Risk Signal:</span>
                <span className="font-semibold text-rose-600">FAILED_PAYMENT_RISK</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">Selected Strategy:</span>
                <span className="font-mono font-bold text-slate-900">PAYMENT_LINK</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">High-Value Threshold Check:</span>
                <span className={`font-semibold ${isHighValue ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {isHighValue ? 'EXCEEDED (₹15,000 >= ₹10,000)' : 'PASSED (₹150 < ₹10,000)'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500">Approval Requirement:</span>
                <span className={`font-semibold ${paymentApproval ? 'text-amber-700' : 'text-slate-600'}`}>
                  {paymentApproval ? `Approval #${paymentApproval.id} (${paymentApproval.approval_status})` : 'Standard Execution'}
                </span>
              </div>
            </div>
          </div>

          {/* Audit History for Payment */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 text-xs">Payment Audit Telemetry</h4>
            {paymentAudits.length === 0 ? (
              <p className="text-xs text-slate-500">No audit events recorded for this payment yet.</p>
            ) : (
              <div className="space-y-2">
                {paymentAudits.map((log) => (
                  <div key={log.id} className="p-3 rounded bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-900 font-semibold">{log.event}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">{log.reason || log.decision}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Vasuli Engine v1.0</span>
          {!isCaptured && (
            <button
              onClick={() => onRunWorkflow(payment.id)}
              className="px-4 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              Run Workflow Assessment
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
