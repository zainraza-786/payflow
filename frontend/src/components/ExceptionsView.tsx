import React from 'react';
import type { Payment, ApprovalResult } from '../types';

interface ExceptionsViewProps {
  payments: Payment[];
  approvals: ApprovalResult[];
  onSelectPayment: (payment: Payment) => void;
}

export const ExceptionsView: React.FC<ExceptionsViewProps> = ({
  payments,
  approvals,
  onSelectPayment,
}) => {
  const pendingApprovals = approvals.filter((a) => a.approval_status === 'PENDING');
  const highValuePayments = payments.filter((p) => (p.amount || 0) >= 10000 && p.status === 'failed');
  const maxAttemptBlocked = payments.filter((p) => p.status === 'failed' && (p.amount || 0) >= 20000);

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="card-stitch p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-status-failure/10 text-status-failure flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">assignment_return</span>
          </div>
          <div>
            <h2 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">
              Recovery Queue & Exceptions
            </h2>
            <p className="font-body-sm text-body-sm text-secondary mt-0.5">
              Ingestion pipeline exceptions, guardrail policy blocks, and high-priority escalation items.
            </p>
          </div>
        </div>
        <span className="font-label-caps text-label-caps text-status-failure bg-status-failure/10 px-3 py-1 rounded-full border border-status-failure/20 font-bold">
          {pendingApprovals.length + maxAttemptBlocked.length} ACTIVE EXCEPTIONS
        </span>
      </div>

      {/* Exception Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category 1: High-Value Approvals Required */}
        <div className="card-stitch p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-pending text-[20px]">gavel</span>
              <h3 className="font-headline-md text-body-md font-bold text-primary">High-Value Floor Hold</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full font-label-caps text-label-caps bg-status-pending/10 text-status-pending border border-status-pending/20 font-bold">
              THRESHOLD ≥ ₹10,000
            </span>
          </div>

          <p className="font-body-sm text-body-sm text-secondary">
            Transactions exceeding ₹10,000 INR require explicit operator approval prior to link generation.
          </p>

          <div className="space-y-2.5 font-body-sm text-body-sm">
            {highValuePayments.length === 0 ? (
              <p className="font-body-sm text-body-sm text-secondary italic">No high-value floor exceptions active.</p>
            ) : (
              highValuePayments.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPayment(p)}
                  className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <div>
                    <span className="font-tabular-nums font-bold text-primary block">Payment #{p.id}</span>
                    <span className="text-secondary text-xs">{p.failure_reason || 'High-value transaction'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-tabular-nums font-bold text-status-pending block">
                      ₹{(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="font-body-sm text-xs font-semibold text-status-pending flex items-center justify-end gap-1">
                      Review <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category 2: Guardrail Attempt Limit Blocked */}
        <div className="card-stitch p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-failure text-[20px]">lock</span>
              <h3 className="font-headline-md text-body-md font-bold text-primary">Attempt Limit Cap Block</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full font-label-caps text-label-caps bg-status-failure/10 text-status-failure border border-status-failure/20 font-bold">
              MAX 2 ATTEMPTS
            </span>
          </div>

          <p className="font-body-sm text-body-sm text-secondary">
            Transactions where recovery execution reached the maximum 2 attempt safety limit and were stopped.
          </p>

          <div className="space-y-2.5 font-body-sm text-body-sm">
            {maxAttemptBlocked.length === 0 ? (
              <p className="font-body-sm text-body-sm text-secondary italic">No attempt limit guardrail blocks.</p>
            ) : (
              maxAttemptBlocked.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPayment(p)}
                  className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <div>
                    <span className="font-tabular-nums font-bold text-primary block">Payment #{p.id}</span>
                    <span className="text-secondary text-xs">Guardrail Decision: BLOCK</span>
                  </div>
                  <div className="text-right">
                    <span className="font-tabular-nums font-bold text-primary block">
                      ₹{(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="font-label-caps text-label-caps text-status-failure font-bold uppercase">STOPPED</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

