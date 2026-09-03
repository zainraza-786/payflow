import React, { useState } from 'react';
import type { AuditLog, Payment } from '../types';
import { downloadXlsxReport, downloadCsvReport } from '../utils/excelExport';

interface AuditTrailViewProps {
  auditLogs: AuditLog[];
  payments?: Payment[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ auditLogs, payments = [] }) => {
  const [filterEvent, setFilterEvent] = useState<string>('ALL');

  const eventTypes = Array.from(new Set(auditLogs.map((a) => a.event)));

  const filteredLogs = auditLogs.filter((a) => {
    if (filterEvent === 'ALL') return true;
    return a.event === filterEvent;
  });

  const handleExportXlsx = () => {
    downloadXlsxReport(payments, filteredLogs, 'payflow_audit_trail_report');
  };

  const handleExportCsv = () => {
    downloadCsvReport(payments, filteredLogs, 'payflow_audit_trail_report');
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Search & Filter Header */}
      <div className="card-stitch p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-primary">history</span>
          <div>
            <h2 className="font-headline-md text-body-md font-bold text-primary">Chronological Audit Trail</h2>
            <p className="font-body-sm text-body-sm text-secondary">Immutable event telemetry and guardrail decision log</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="material-symbols-outlined text-[18px] text-secondary">filter_list</span>
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-100/60 border border-slate-200/80 text-primary font-body-sm text-body-sm focus:bg-white focus:outline-none focus:border-slate-900 font-medium"
          >
            <option value="ALL">All Event Types ({auditLogs.length})</option>
            {eventTypes.map((evt) => (
              <option key={evt} value={evt}>
                {evt}
              </option>
            ))}
          </select>
          <button
            onClick={handleExportXlsx}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-body-sm text-body-sm font-semibold transition-colors shadow-xs cursor-pointer"
            title="Download Full Excel (.xlsx) Report"
          >
            <span className="material-symbols-outlined text-[16px]">table_view</span>
            <span>Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-body-sm text-body-sm font-semibold transition-colors shadow-2xs cursor-pointer"
            title="Download CSV Audit Report"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Audit Timeline */}
      <div className="card-stitch p-6 space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center font-body-sm text-body-sm text-secondary">
            No audit telemetry records match the selected event filter.
          </div>
        ) : (
          <div className="relative border-l border-slate-200 ml-4 space-y-4 py-2">
            {filteredLogs.map((log) => {
              const isRecovered = log.event === 'revenue.recovered';
              const isApproval = log.event.includes('approval');

              return (
                <div key={log.id} className="relative pl-6 group">
                  {/* Timeline Node */}
                  <div
                    className={`absolute -left-2.5 top-1 w-5 h-5 rounded-full border flex items-center justify-center font-tabular-nums text-[10px] font-bold ${
                      isRecovered
                        ? 'bg-status-recovered border-status-recovered text-white'
                        : isApproval
                        ? 'bg-status-pending/20 border-status-pending text-status-pending'
                        : 'bg-slate-100 border-slate-300 text-slate-600'
                    }`}
                  >
                    •
                  </div>

                  {/* Card Content */}
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/60 space-y-1.5 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-tabular-nums font-bold text-primary">
                          {log.event}
                        </span>
                        <span className="font-tabular-nums text-secondary text-xs">
                          (Payment #{log.payment_id})
                        </span>
                      </div>
                      <span className="font-tabular-nums text-[11px] text-secondary">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="font-body-sm text-body-sm text-primary leading-snug">
                      {log.reason || `Decision: ${log.decision}`}
                    </p>

                    {log.guardrail_result && (
                      <div className="pt-1.5 flex items-center gap-2 font-body-sm text-[11px] text-secondary border-t border-slate-200/60 mt-2">
                        <span>Guardrail Verdict:</span>
                        <span className="font-label-caps text-label-caps text-status-pending bg-status-pending/10 px-2 py-0.5 rounded-full border border-status-pending/20 font-bold">
                          {log.guardrail_result}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

