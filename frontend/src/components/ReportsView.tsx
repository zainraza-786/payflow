import React from 'react';
import { FileText, Download } from 'lucide-react';
import type { Payment, AuditLog } from '../types';

interface ReportsViewProps {
  payments: Payment[];
  auditLogs: AuditLog[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ payments, auditLogs }) => {
  const totalAmount = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const recoveredAmount = payments.filter((p) => p.status === 'captured').reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded bg-slate-900 text-white">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Demo Reports & Export Center</h2>
            <p className="text-xs text-slate-500">
              Safe demonstration export summaries for transaction audit logs, guardrail compliance, and recovery statistics.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
          DEMO / SYNTHETIC EXPORT
        </span>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Report 1: Recovery Summary */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SUMMARY REPORT</span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">Revenue Recovery Summary</h3>
            </div>
            <Download className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-slate-600 text-[11px]">
            Comprehensive summary of observed payment failures (₹{totalAmount.toLocaleString('en-IN')}) and recovered revenue (₹{recoveredAmount.toLocaleString('en-IN')}).
          </p>
          <button className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            <span>Export Recovery Summary (CSV)</span>
          </button>
        </div>

        {/* Report 2: Audit Trail Log */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TELEMETRY REPORT</span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">Audit Telemetry Log</h3>
            </div>
            <Download className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-slate-600 text-[11px]">
            Full chronological event audit stream ({auditLogs.length} events logged) including guardrail verdicts and human approvals.
          </p>
          <button className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit Trail (JSON)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
