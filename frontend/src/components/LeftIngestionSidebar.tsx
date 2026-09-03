import React from 'react';

interface LeftIngestionSidebarProps {
  onRunDemoBatch: () => void;
  isBatchRunning: boolean;
  onOpenSingleTxnDemo: () => void;
  onResetDemoData: () => void;
}

export const LeftIngestionSidebar: React.FC<LeftIngestionSidebarProps> = ({
  onRunDemoBatch,
  isBatchRunning,
  onOpenSingleTxnDemo,
  onResetDemoData,
}) => {
  return (
    <div className="w-full lg:w-64 space-y-4 shrink-0 font-body-sm text-body-sm">
      {/* Ingestion Source Panel */}
      <div className="card-stitch p-4 space-y-3">
        <div className="font-label-caps text-label-caps text-secondary font-bold">
          DEMO SIMULATOR & INGESTION
        </div>

        <button
          onClick={onRunDemoBatch}
          disabled={isBatchRunning}
          className="w-full py-2.5 px-3 rounded-lg bg-primary hover:bg-slate-800 text-white font-semibold font-body-sm text-body-sm flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[18px] ${isBatchRunning ? 'animate-spin' : ''}`}>
            {isBatchRunning ? 'refresh' : 'bolt'}
          </span>
          <span>{isBatchRunning ? 'Processing Batch...' : 'Run Demo Batch'}</span>
        </button>

        <button
          onClick={onOpenSingleTxnDemo}
          className="w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-primary font-body-sm text-body-sm font-semibold flex items-center gap-2 transition-colors text-left"
        >
          <span className="material-symbols-outlined text-[18px] text-secondary">description</span>
          <span>Single Transaction Demo</span>
        </button>

        <button
          onClick={onResetDemoData}
          className="w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-primary font-body-sm text-body-sm font-semibold flex items-center gap-2 transition-colors text-left"
        >
          <span className="material-symbols-outlined text-[18px] text-secondary">restart_alt</span>
          <span>Reset Sample Demo Data</span>
        </button>
      </div>

      {/* Guardrail Rules Box matching Stitch Institutional Panel */}
      <div className="p-4.5 rounded-xl bg-slate-900 text-white space-y-2.5 shadow-md border border-slate-800">
        <div className="flex items-center gap-2 font-label-caps text-label-caps text-white font-bold">
          <span className="material-symbols-outlined text-status-recovered text-[18px]">shield</span>
          <span>GUARDRAIL RULES ACTIVE</span>
        </div>
        <div className="space-y-1.5 font-tabular-nums text-[11px] text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">High-Value Floor:</span>
            <span className="font-bold text-amber-400">₹10,000+</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Max Retry Cap:</span>
            <span className="font-bold text-status-recovered">2 attempts</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Quiet Hours:</span>
            <span className="font-bold text-blue-400">22:00-08:00 IST</span>
          </div>
          <div className="flex justify-between border-t border-slate-800 pt-1.5">
            <span className="text-slate-400">Execution Mode:</span>
            <span className="font-bold text-rose-400">FAIL-CLOSED</span>
          </div>
        </div>
      </div>

      {/* AI Engine Settings */}
      <div className="card-stitch p-4 space-y-2.5">
        <div className="font-label-caps text-label-caps text-secondary flex items-center gap-1.5 font-bold">
          <span className="material-symbols-outlined text-[16px] text-secondary">key</span>
          <span>ENGINE KEY CONFIG</span>
        </div>
        <input
          type="password"
          placeholder="Optional API Key (Local)"
          className="w-full px-3 py-1.5 rounded-lg border border-slate-200/80 bg-slate-50 text-primary font-tabular-nums text-body-sm focus:bg-white focus:outline-none focus:border-slate-900"
        />
        <p className="font-body-sm text-[11px] text-secondary leading-relaxed">
          Built-in offline rule intelligence active. Never fails without API key.
        </p>
      </div>
    </div>
  );
};

