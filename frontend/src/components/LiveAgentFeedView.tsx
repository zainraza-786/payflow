import React from 'react';
import type { AuditLog } from '../types';

interface LiveAgentFeedViewProps {
  auditLogs: AuditLog[];
}

export const LiveAgentFeedView: React.FC<LiveAgentFeedViewProps> = ({ auditLogs }) => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-sm bg-surface-container-lowest border border-border-subtle flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-primary text-white flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">sensors</span>
          </div>
          <div>
            <h2 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">
              Live Agent Telemetry Feed
            </h2>
            <p className="font-body-sm text-body-sm text-secondary">
              Real-time autonomous agent event stream tracking failure diagnosis, guardrail policy checks, and recovery actions.
            </p>
          </div>
        </div>
        <span className="font-label-caps text-label-caps text-primary bg-surface-subtle px-3 py-1 rounded-sm border border-border-subtle font-bold">
          {auditLogs.length} EVENTS LOGGED
        </span>
      </div>

      {/* Feed Stream */}
      <div className="p-5 rounded-sm bg-surface-container-lowest border border-border-subtle space-y-3 shadow-xs">
        <div className="relative border-l border-border-subtle ml-4 space-y-4 py-2">
          {auditLogs.map((log) => {
            const isRecovered = log.event === 'revenue.recovered';
            const isApproval = log.event.includes('approval');

            return (
              <div key={log.id} className="relative pl-6 group">
                <div
                  className={`absolute -left-2.5 top-1 w-5 h-5 rounded-full border flex items-center justify-center font-tabular-nums text-[10px] font-bold ${
                    isRecovered
                      ? 'bg-status-recovered border-status-recovered text-white'
                      : isApproval
                      ? 'bg-status-pending/20 border-status-pending text-status-pending'
                      : 'bg-surface-subtle border-border-subtle text-secondary'
                  }`}
                >
                  •
                </div>

                <div className="p-3.5 rounded-sm bg-surface-subtle border border-border-subtle space-y-1.5 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-tabular-nums font-bold text-primary">{log.event}</span>
                      <span className="font-tabular-nums text-secondary text-xs">(Payment #{log.payment_id})</span>
                    </div>
                    <span className="font-tabular-nums text-[11px] text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="font-body-sm text-body-sm text-primary leading-snug">{log.reason || `Decision: ${log.decision}`}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

