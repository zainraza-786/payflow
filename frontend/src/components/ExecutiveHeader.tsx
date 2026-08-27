import React from 'react';
import { Zap } from 'lucide-react';

interface ExecutiveHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const ExecutiveHeader: React.FC<ExecutiveHeaderProps> = ({ activeTab, setActiveTab }) => {
  const navTabs = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: '📊' },
    { id: 'transactions', label: 'Transaction Audit', icon: '📋' },
    { id: 'assistant', label: 'AI Recovery Assistant', icon: '🤖' },
    { id: 'analytics', label: 'Financial Analytics', icon: '📈' },
    { id: 'reports', label: 'Export & Reports', icon: '📁' },
  ];

  return (
    <div className="space-y-4">
      {/* Dark Navy Executive Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">PayFlow AI</h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Track: Autonomous Payment Recovery
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Autonomous Payment Recovery • Discrepancy Diagnostics • Deterministic Guardrails • Smart Recovery
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="px-3.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Active Dataset: Demo Mode (Synthetic Txns)</span>
          </div>
          <span className="text-[10px] text-amber-400 font-mono font-semibold">
            RAZORPAY TEST MODE ONLY
          </span>
        </div>
      </div>

      {/* Main Top Navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-2xs flex overflow-x-auto gap-1">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
