import React, { useState } from 'react';
import { ShieldCheck, Check, X, Play } from 'lucide-react';
import type { ApprovalResult, Payment } from '../types';

interface ApprovalsViewProps {
  approvals: ApprovalResult[];
  payments: Payment[];
  onApprove: (approvalId: number, reason?: string) => Promise<void>;
  onReject: (approvalId: number, reason?: string) => Promise<void>;
  onExecute: (approvalId: number) => Promise<void>;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  approvals,
  payments,
  onApprove,
  onReject,
  onExecute,
}) => {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'ALL'>('PENDING');

  const filteredApprovals = approvals.filter((a) => {
    if (filter === 'ALL') return true;
    return a.approval_status === filter;
  });

  const handleAction = async (
    approvalId: number,
    action: 'approve' | 'reject' | 'execute'
  ) => {
    setLoadingId(approvalId);
    try {
      if (action === 'approve') await onApprove(approvalId);
      if (action === 'reject') await onReject(approvalId);
      if (action === 'execute') await onExecute(approvalId);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Human Approval Authorization Queue</h2>
            <p className="text-xs text-slate-500">
              High-value payments (₹10,000+) require explicit human authorization before execution.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 p-1 bg-slate-50 rounded border border-slate-200 text-xs">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              filter === 'PENDING' ? 'bg-amber-100 text-amber-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({approvals.filter((a) => a.approval_status === 'PENDING').length})
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              filter === 'APPROVED' ? 'bg-emerald-100 text-emerald-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved ({approvals.filter((a) => a.approval_status === 'APPROVED').length})
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              filter === 'ALL' ? 'bg-slate-200 text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({approvals.length})
          </button>
        </div>
      </div>

      {/* Approvals List */}
      {filteredApprovals.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl bg-white">
          <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-800">No approval requests in this queue</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            When Guardrail Engine flags a high-value payment (₹10,000+), pending authorization will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredApprovals.map((app) => {
            const payment = payments.find((p) => p.id === app.payment_id);
            const amount = payment ? payment.amount : 0;
            const isPending = app.approval_status === 'PENDING';
            const isApproved = app.approval_status === 'APPROVED';
            const isRejected = app.approval_status === 'REJECTED';
            const isLoading = loadingId === app.id;

            return (
              <div
                key={app.id}
                className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-2xs"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        Approval Request #{app.id}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        (Payment #{app.payment_id})
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                        isPending
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : isApproved
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {app.approval_status}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Target Amount
                    </span>
                    <div className="font-mono text-2xl font-bold text-slate-900">
                      ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR
                    </div>
                  </div>

                  <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Requested Strategy:</span>
                      <span className="font-mono text-slate-900 font-bold">{app.requested_strategy}</span>
                    </div>
                    <div className="text-slate-700 text-[11px] leading-tight">
                      <span className="text-slate-500">Guardrail Rationale: </span>
                      {app.reason || 'High-value threshold exceeded (₹10,000+)'}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                      <span>Expires: {new Date(app.expires_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                  {isPending && (
                    <>
                      <button
                        onClick={() => handleAction(app.id, 'reject')}
                        disabled={isLoading}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handleAction(app.id, 'approve')}
                        disabled={isLoading}
                        className="flex items-center space-x-1.5 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Recovery</span>
                      </button>
                    </>
                  )}

                  {isApproved && (
                    <button
                      onClick={() => handleAction(app.id, 'execute')}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center space-x-1.5 px-4 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{isLoading ? 'Executing Guardrail Check...' : 'Execute Recovery (Fresh Guardrail Check)'}</span>
                    </button>
                  )}

                  {isRejected && (
                    <span className="text-xs text-slate-500 font-medium italic">
                      Request rejected by compliance.
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
