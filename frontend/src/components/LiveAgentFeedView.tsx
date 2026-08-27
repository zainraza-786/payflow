import React from 'react';
import { Activity, Clock } from 'lucide-react';
import type { AuditLog } from '../types';

interface LiveAgentFeedViewProps {
  auditLogs: AuditLog[];
}

export const LiveAgentFeedView: React.FC<LiveAgentFeedViewProps> = ({ auditLogs }) => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded bg-slate-900 text-white">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Live Agent Telemetry Feed</h2>
            <p className="text-xs text-slate-500">
              Real-time event stream tracking failure diagnosis, strategy selection, guardrail evaluations, and recovery attributions.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
          {auditLogs.length} Events Logged
        </span>
      </div>

      {/* Feed Stream */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3">
        <div className="relative border-l border-slate-200 ml-4 space-y-4 py-2">
          {auditLogs.map((log) => {
            const isRecovered = log.event === 'revenue.recovered';
            const isApproval = log.event.includes('approval');

            return (
              <div key={log.id} className="relative pl-6 group">
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

                <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-1 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{log.event}</span>
                      <span className="text-[10px] font-mono text-slate-500">(Payment #{log.payment_id})</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-snug">{log.reason || `Decision: ${log.decision}`}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
