import React from 'react';
import { AlertOctagon, ShieldCheck, Lock } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Exceptions & Safety Authorization Center</h2>
            <p className="text-xs text-slate-500">
              Transactions requiring human intervention, guardrail blocks, or high-value compliance review.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200">
          {pendingApprovals.length + maxAttemptBlocked.length} Active Exceptions
        </span>
      </div>

      {/* Exception Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category 1: High-Value Approvals Required */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-semibold text-slate-900">High-Value Human Approval Required</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              THRESHOLD $\ge$ ₹10,000
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Transactions exceeding ₹10,000 INR require explicit authorization before recovery link generation.
          </p>

          <div className="space-y-2">
            {highValuePayments.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No high-value exceptions active.</p>
            ) : (
              highValuePayments.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPayment(p)}
                  className="p-3 rounded bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900 block">Payment #{p.id}</span>
                    <span className="text-slate-500 text-[11px]">{p.failure_reason || 'High-value transaction'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-amber-700 block">
                      ₹{(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] font-semibold text-amber-800 flex items-center justify-end gap-0.5">
                      Review &rarr;
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category 2: Guardrail Attempt Limit Blocked */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Lock className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-semibold text-slate-900">Guardrail Blocked (Max Attempt Limit)</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
              MAX 2 ATTEMPTS
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Transactions where recovery execution reached the maximum 2 attempt safety limit and were stopped.
          </p>

          <div className="space-y-2">
            {maxAttemptBlocked.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No attempt limit guardrail blocks.</p>
            ) : (
              maxAttemptBlocked.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPayment(p)}
                  className="p-3 rounded bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900 block">Payment #{p.id}</span>
                    <span className="text-slate-500 text-[11px]">Guardrail Decision: BLOCK</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-slate-900 block">
                      ₹{(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] font-semibold text-rose-700 uppercase">STOPPED</span>
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
