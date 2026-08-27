import React from 'react';
import type { Payment } from '../types';

interface TransactionAuditViewProps {
  payments: Payment[];
  onSelectPayment: (payment: Payment) => void;
}

export const TransactionAuditView: React.FC<TransactionAuditViewProps> = ({
  payments,
  onSelectPayment,
}) => {
  const getCustomerName = (id: number) => {
    const names = ['Amitabh Saxena', 'Alia Bhatt', 'Neha Reddy', 'Archana Dixit', 'Divya Nambiar', 'Sunil Shetty', 'Ananya Iyer', 'Vivek Oberoi'];
    return names[id % names.length];
  };

  return (
    <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4 font-sans text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Transaction Audit Register</h2>
          <p className="text-xs text-slate-500">Enriched transaction log with risk tiering and guardrail evaluation results</p>
        </div>
        <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-slate-100 text-slate-800">
          {payments.length} Transactions
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              <th className="py-3 px-3">Customer</th>
              <th className="py-3 px-3">Reference / Txn ID</th>
              <th className="py-3 px-3">Amount</th>
              <th className="py-3 px-3">Failure Diagnostic</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Strategy</th>
              <th className="py-3 px-3">Guardrail Verdict</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((p) => {
              const customer = getCustomerName(p.id);
              const isCaptured = p.status === 'captured';
              const isHighValue = (p.amount || 0) >= 10000;

              return (
                <tr
                  key={p.id}
                  onClick={() => onSelectPayment(p)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3 font-semibold text-slate-900">{customer}</td>
                  <td className="py-3 px-3 font-mono font-medium text-slate-600">#{p.id}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    ₹{(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-slate-600 truncate max-w-[200px]">
                    {p.failure_reason || 'Failure'}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isCaptured
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-700">PAYMENT_LINK</td>
                  <td className="py-3 px-3">
                    {isHighValue ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        HUMAN_APPROVAL
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        ALLOW
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-blue-600 hover:underline">
                    Inspect &rarr;
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
