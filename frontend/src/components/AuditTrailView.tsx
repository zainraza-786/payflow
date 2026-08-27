import React, { useState } from 'react';
import { History, Filter } from 'lucide-react';
import type { AuditLog } from '../types';

interface AuditTrailViewProps {
  auditLogs: AuditLog[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ auditLogs }) => {
  const [filterEvent, setFilterEvent] = useState<string>('ALL');

  const eventTypes = Array.from(new Set(auditLogs.map((a) => a.event)));

  const filteredLogs = auditLogs.filter((a) => {
    if (filterEvent === 'ALL') return true;
    return a.event === filterEvent;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-slate-700" />
          <span className="text-xs font-semibold text-slate-900">Chronological Audit Telemetry</span>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="px-3 py-1.5 rounded bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-900 font-medium"
          >
            <option value="ALL">All Event Types ({auditLogs.length})</option>
            {eventTypes.map((evt) => (
              <option key={evt} value={evt}>
                {evt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Timeline */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No audit logs match the selected event filter.
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
                    className={`absolute -left-2.5 top-1 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                      isRecovered
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : isApproval
                        ? 'bg-amber-50 border-amber-400 text-amber-800'
                        : 'bg-slate-100 border-slate-300 text-slate-600'
                    }`}
                  >
                    •
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-1 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {log.event}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          (Payment #{log.payment_id})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-snug">
                      {log.reason || `Decision: ${log.decision}`}
                    </p>

                    {log.guardrail_result && (
                      <div className="pt-1 flex items-center space-x-1.5 text-[10px] text-slate-600">
                        <span className="text-slate-500 font-medium">Guardrail Verdict:</span>
                        <span className="font-mono font-semibold text-amber-800">
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
