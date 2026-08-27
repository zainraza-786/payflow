import React, { useState } from 'react';
import { Search, Filter, CheckCircle2 } from 'lucide-react';
import type { Payment } from '../types';

interface PaymentsTableProps {
  payments: Payment[];
  onSelectPayment: (payment: Payment) => void;
  onRunWorkflow: (paymentId: number) => void;
  loadingWorkflowId?: number | null;
}

export const PaymentsTable: React.FC<PaymentsTableProps> = ({
  payments,
  onSelectPayment,
  onRunWorkflow,
  loadingWorkflowId,
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
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Payment ID, Razorpay ID, failure cause..."
            className="w-full pl-9 pr-3 py-1.5 rounded bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-900"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-900 font-medium"
          >
            <option value="all">All Statuses ({payments.length})</option>
            <option value="failed">Failed Only</option>
            <option value="captured">Captured / Recovered</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-2xs">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No payment events match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-4">Internal ID</th>
                  <th className="py-3 px-4">Razorpay Payment ID</th>
                  <th className="py-3 px-4">Amount (INR)</th>
                  <th className="py-3 px-4">Failure Reason</th>
                  <th className="py-3 px-4">Risk Evaluation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((payment) => {
                  const isHighValue = (payment.amount || 0) >= 10000;
                  const isCaptured = payment.status === 'captured';

                  return (
                    <tr
                      key={payment.id}
                      onClick={() => onSelectPayment(payment)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        #{payment.id}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {payment.razorpay_payment_id}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        ₹{(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate">
                        {payment.failure_reason || 'Unknown failure'}
                      </td>
                      <td className="py-3.5 px-4">
                        {isHighValue ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            HIGH VALUE (REQUIRES APPROVAL)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            STANDARD RECOVERY
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold border ${
                            isCaptured
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {payment.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {isCaptured ? (
                          <span className="text-[11px] font-semibold text-emerald-700 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Recovered
                          </span>
                        ) : (
                          <button
                            onClick={() => onRunWorkflow(payment.id)}
                            disabled={loadingWorkflowId === payment.id}
                            className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors disabled:opacity-50 shadow-2xs"
                          >
                            {loadingWorkflowId === payment.id ? 'Running...' : 'Run Workflow'}
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
