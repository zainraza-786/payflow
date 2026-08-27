import React from 'react';
import { Zap, FileText, RefreshCw, Shield, Key } from 'lucide-react';

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
    <div className="w-full lg:w-64 space-y-4 shrink-0 font-sans">
      {/* Ingestion Source Panel */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          INGESTION SOURCE
        </div>

        <button
          onClick={onRunDemoBatch}
          disabled={isBatchRunning}
          className="w-full py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
        >
          <Zap className={`w-4 h-4 fill-white ${isBatchRunning ? 'animate-spin' : ''}`} />
          <span>{isBatchRunning ? 'Processing Batch...' : '⚡ Demo Mode (45 Txns)'}</span>
        </button>

        <button
          onClick={onOpenSingleTxnDemo}
          className="w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-2 transition-colors text-left"
        >
          <FileText className="w-4 h-4 text-slate-500" />
          <span>Single Transaction CSV</span>
        </button>

        <button
          onClick={onResetDemoData}
          className="w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-2 transition-colors text-left"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
          <span>Reload Sample Demo Data</span>
        </button>
      </div>

      {/* Guardrail Rules Box */}
      <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2.5 shadow-md border border-slate-800">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>GUARDRAIL RULES ACTIVE</span>
        </div>
        <div className="space-y-1.5 text-[11px] text-slate-300 font-mono">
          <div className="flex justify-between">
            <span className="text-slate-400">High-Value Threshold:</span>
            <span className="font-bold text-amber-400">₹10,000+</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Max Retry Cap:</span>
            <span className="font-bold text-emerald-400">2 attempts</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Quiet Hours:</span>
            <span className="font-bold text-blue-400">22:00-08:00 IST</span>
          </div>
          <div className="flex justify-between border-t border-slate-800 pt-1">
            <span className="text-slate-400">Execution Mode:</span>
            <span className="font-bold text-rose-400">FAIL-CLOSED</span>
          </div>
        </div>
      </div>

      {/* AI Engine Settings */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5 shadow-2xs text-xs">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-slate-500" />
          <span>AI ENGINE SETTINGS</span>
        </div>
        <input
          type="password"
          placeholder="Optional API Key (Local)"
          className="w-full px-3 py-1.5 rounded border border-slate-200 text-xs bg-slate-50 text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
        />
        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
          Built-in offline rule intelligence active. Never fails without key.
        </p>
      </div>
    </div>
  );
};
