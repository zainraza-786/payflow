import React from 'react';
import { BarChart3 } from 'lucide-react';

export const BaselineView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded bg-slate-900 text-white">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">PayFlow vs Conventional Baseline</h2>
            <p className="text-xs text-slate-500">
              Comparative analysis highlighting deterministic diagnosis, guardrails, and revenue attribution efficiency.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          DEMO / SIMULATED COMPARISON
        </span>
      </div>

      {/* Comparison Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Conventional Manual Retry Baseline */}
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CONVENTIONAL APPROACH</span>
            <h3 className="text-sm font-bold text-slate-800 mt-0.5">Manual Dunning & Blind Retries</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded bg-white border border-slate-200">
              <span className="text-slate-500 text-[11px] block">Diagnosis:</span>
              <span className="font-semibold text-slate-800">Generic error codes, zero root-cause analysis</span>
            </div>
            <div className="p-3 rounded bg-white border border-slate-200">
              <span className="text-slate-500 text-[11px] block">Execution:</span>
              <span className="font-semibold text-slate-800">Fixed retries at arbitrary times, causing customer friction</span>
            </div>
            <div className="p-3 rounded bg-white border border-slate-200">
              <span className="text-slate-500 text-[11px] block">Guardrails:</span>
              <span className="font-semibold text-rose-700">No quiet hours, un-gated retries, risk of duplicate charges</span>
            </div>
            <div className="p-3 rounded bg-white border border-slate-200">
              <span className="text-slate-500 text-[11px] block">Attribution:</span>
              <span className="font-semibold text-slate-800">Manual spreadsheet reconciliation</span>
            </div>
          </div>
        </div>

        {/* PayFlow Autonomous Recovery Engine */}
        <div className="p-5 rounded-xl bg-white border-2 border-slate-900 space-y-4 shadow-sm">
          <div className="border-b border-slate-200 pb-3 flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">PAYFLOW ENGINE</span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">Deterministic Recovery Platform</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white">OPTIMIZED</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[11px] block">Diagnosis:</span>
              <span className="font-semibold text-slate-900">Deterministic root-cause classification</span>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[11px] block">Execution:</span>
              <span className="font-semibold text-slate-900">Tailored Payment Links & optimal retry windows</span>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[11px] block">Guardrails:</span>
              <span className="font-semibold text-emerald-700">Fail-closed, 22:00-08:00 quiet hours, ₹10k Human Approval</span>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[11px] block">Attribution:</span>
              <span className="font-semibold text-slate-900">100% automated audit telemetry & revenue attribution</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
