import React, { useState } from 'react';
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
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="card-stitch p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-status-pending/10 text-status-pending flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">gavel</span>
          </div>
          <div>
            <h2 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">
              Human Approval Gate
            </h2>
            <p className="font-body-sm text-body-sm text-secondary mt-0.5">
              High-value payment recoveries (₹10,000+ floor) require explicit human authorization before execution.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/70 rounded-lg border border-slate-200/80 font-body-sm text-body-sm">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              filter === 'PENDING'
                ? 'bg-status-pending text-white shadow-xs'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Pending ({approvals.filter((a) => a.approval_status === 'PENDING').length})
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              filter === 'APPROVED'
                ? 'bg-status-recovered text-white shadow-xs'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Approved ({approvals.filter((a) => a.approval_status === 'APPROVED').length})
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              filter === 'ALL'
                ? 'bg-primary text-white shadow-xs'
                : 'text-secondary hover:text-primary'
            }`}
          >
            All ({approvals.length})
          </button>
        </div>
      </div>

      {/* Approvals List */}
      {filteredApprovals.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl bg-white card-stitch">
          <span className="material-symbols-outlined text-slate-400 text-[40px] mb-2">verified_user</span>
          <p className="font-headline-md text-body-md font-bold text-primary">No pending approvals in this gate</p>
          <p className="font-body-sm text-body-sm text-secondary mt-1">
            When Guardrail Engine flags a transaction exceeding ₹10,000, human authorization requests appear here.
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
                className="card-stitch card-stitch-hover p-6 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-tabular-nums font-bold text-primary">
                        Approval Request #{app.id}
                      </span>
                      <span className="font-tabular-nums text-secondary text-xs">
                        (Payment #{app.payment_id})
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-label-caps text-label-caps border font-bold ${
                        isPending
                          ? 'bg-status-pending/10 text-status-pending border-status-pending/20'
                          : isApproved
                          ? 'bg-status-recovered/10 text-status-recovered border-status-recovered/20'
                          : 'bg-status-failure/10 text-status-failure border-status-failure/20'
                      }`}
                    >
                      {app.approval_status}
                    </span>
                  </div>

                  <div>
                    <span className="font-label-caps text-label-caps text-secondary font-bold">
                      TARGET AMOUNT
                    </span>
                    <div className="font-tabular-nums text-2xl font-bold text-primary">
                      ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50/70 border border-slate-200/60 font-body-sm text-body-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Requested Strategy:</span>
                      <span className="font-tabular-nums font-bold text-primary">{app.requested_strategy}</span>
                    </div>
                    <div className="text-primary leading-tight">
                      <span className="text-secondary font-medium">Guardrail Policy Rationale: </span>
                      {app.reason || 'High-value threshold exceeded (₹10,000+ floor)'}
                    </div>
                    <div className="flex items-center justify-between font-body-sm text-[11px] text-secondary pt-2 border-t border-slate-200/60">
                      <span>Expires: {new Date(app.expires_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-200/70 flex items-center justify-end gap-2">
                  {isPending && (
                    <>
                      <button
                        onClick={() => handleAction(app.id, 'reject')}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-status-failure/10 text-status-failure border border-status-failure/30 font-body-sm text-body-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handleAction(app.id, 'approve')}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-status-recovered hover:bg-emerald-700 text-white font-body-sm text-body-sm font-semibold transition-colors shadow-xs disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        <span>Approve Recovery</span>
                      </button>
                    </>
                  )}

                  {isApproved && (
                    <button
                      onClick={() => handleAction(app.id, 'execute')}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-slate-800 text-white font-body-sm text-body-sm font-semibold transition-colors shadow-xs disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                      <span>{isLoading ? 'Executing Guardrail Check...' : 'Execute Recovery (Fresh Guardrail Check)'}</span>
                    </button>
                  )}

                  {isRejected && (
                    <span className="font-body-sm text-body-sm text-secondary font-medium italic">
                      Request rejected by operator/compliance.
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

