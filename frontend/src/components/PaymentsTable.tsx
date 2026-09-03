import React, { useState } from 'react';
import type { Payment } from '../types';

interface PaymentsTableProps {
  payments: Payment[];
  onSelectPayment: (payment: Payment) => void;
  onRunWorkflow: (paymentId: number) => void;
  loadingWorkflowId?: number | null;
  workflowFeedback?: {
    paymentId: number;
    type: 'success' | 'approval' | 'stopped' | 'error';
    title: string;
    message: string;
  } | null;
  onDismissWorkflowFeedback?: () => void;
}

export const PaymentsTable: React.FC<PaymentsTableProps> = ({
  payments,
  onSelectPayment,
  onRunWorkflow,
  loadingWorkflowId,
  workflowFeedback,
  onDismissWorkflowFeedback,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.razorpay_payment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toString().includes(searchTerm) ||
      (p.failure_reason || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || p.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 font-sans">
      {/* Workflow Execution Feedback Banner */}
      {workflowFeedback && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150 ${
            workflowFeedback.type === 'error'
              ? 'bg-red-50/90 border-red-300 text-red-950 shadow-xs'
              : workflowFeedback.type === 'approval'
              ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-xs'
              : workflowFeedback.type === 'stopped'
              ? 'bg-slate-100 border-slate-300 text-slate-800 shadow-xs'
              : 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white ${
                workflowFeedback.type === 'error'
                  ? 'bg-red-600'
                  : workflowFeedback.type === 'approval'
                  ? 'bg-amber-600'
                  : workflowFeedback.type === 'stopped'
                  ? 'bg-slate-600'
                  : 'bg-emerald-600'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {workflowFeedback.type === 'error'
                  ? 'error'
                  : workflowFeedback.type === 'approval'
                  ? 'gavel'
                  : workflowFeedback.type === 'stopped'
                  ? 'cancel'
                  : 'check_circle'}
              </span>
            </div>
            <div>
              <div className="font-bold text-xs">{workflowFeedback.title}</div>
              <div className="text-[11px] opacity-90 mt-0.5">{workflowFeedback.message}</div>
            </div>
          </div>

          {onDismissWorkflowFeedback && (
            <button
              onClick={onDismissWorkflowFeedback}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/80 hover:bg-white text-slate-800 border border-slate-200 shrink-0 transition-colors shadow-2xs"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="card-stitch p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Payment ID, Razorpay ID, failure cause..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-100/60 border border-slate-200/80 text-primary font-body-sm text-body-sm focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="material-symbols-outlined text-[18px] text-secondary">filter_list</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-100/60 border border-slate-200/80 text-primary font-body-sm text-body-sm focus:bg-white focus:outline-none focus:border-slate-900 font-medium"
          >
            <option value="all">All Statuses ({payments.length})</option>
            <option value="failed">Failed Only</option>
            <option value="captured">Captured / Recovered</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="card-stitch overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center font-body-sm text-body-sm text-secondary">
            No payment records match the selected filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead>
                <tr className="border-b border-slate-200/70 font-label-caps text-label-caps text-secondary bg-slate-50/80">
                  <th className="py-3.5 px-4">Customer & Account</th>
                  <th className="py-3.5 px-4">Payment ID</th>
                  <th className="py-3.5 px-4">Amount (INR)</th>
                  <th className="py-3.5 px-4">Failure Diagnosis</th>
                  <th className="py-3.5 px-4">Risk Threshold</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((payment) => {
                  const isHighValue = (payment.amount || 0) >= 10000;
                  const isCaptured = payment.status === 'captured';
                  const isRunning = loadingWorkflowId === payment.id;
                  const isAnyRunning = loadingWorkflowId !== null && loadingWorkflowId !== undefined;

                  return (
                    <tr
                      key={payment.id}
                      onClick={() => onSelectPayment(payment)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                            {(payment.customer_name || 'Customer').charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-primary text-xs">
                              {payment.customer_name || 'Verified Merchant Account'}
                            </div>
                            <div className="text-[11px] text-secondary font-tabular-nums">
                              {payment.customer_email || `acc_${payment.id}@payflow.demo`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-tabular-nums font-bold text-primary">#{payment.id}</div>
                        <div className="font-tabular-nums text-secondary text-[11px]">{payment.razorpay_payment_id}</div>
                      </td>
                      <td className="py-3.5 px-4 font-tabular-nums font-bold text-primary">
                        ₹{(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-secondary max-w-[220px] truncate">
                        {payment.failure_reason || 'Unknown failure'}
                      </td>
                      <td className="py-3.5 px-4">
                        {isHighValue ? (
                          <span className="px-2.5 py-0.5 rounded-full font-label-caps text-label-caps bg-status-pending/10 text-status-pending border border-status-pending/20 font-bold">
                            HIGH VALUE (APPROVAL REQ)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full font-label-caps text-label-caps bg-slate-100 text-slate-600 border border-slate-200 font-bold">
                            STANDARD RECOVERY
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-label-caps text-label-caps border font-bold ${
                            isCaptured
                              ? 'bg-status-recovered/10 text-status-recovered border-status-recovered/20'
                              : 'bg-status-failure/10 text-status-failure border-status-failure/20'
                          }`}
                        >
                          {payment.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {isCaptured ? (
                          <span className="font-body-sm text-[11px] font-semibold text-status-recovered flex items-center justify-end gap-1">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            Recovered
                          </span>
                        ) : (
                          <button
                            onClick={() => onRunWorkflow(payment.id)}
                            disabled={isAnyRunning}
                            className="btn-stitch flex items-center gap-1.5 ml-auto px-3.5 py-1.5 rounded-lg bg-primary hover:bg-slate-800 text-white font-body-sm text-[11px] font-semibold shadow-xs disabled:opacity-50"
                          >
                            {isRunning && (
                              <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
                            )}
                            <span>{isRunning ? 'Running...' : 'Run Workflow'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

