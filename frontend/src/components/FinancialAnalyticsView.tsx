import React from 'react';
import { PieChart } from 'lucide-react';

interface FinancialAnalyticsViewProps {
  totalRiskAmount: number;
  recoveredAmount: number;
  recoveryRate: string;
}

export const FinancialAnalyticsView: React.FC<FinancialAnalyticsViewProps> = ({
  totalRiskAmount,
  recoveredAmount,
}) => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded bg-slate-900 text-white">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Financial Analytics & Recovery Metrics</h2>
            <p className="text-xs text-slate-500">
              Quantitative breakdown of failure root causes, strategy effectiveness, and revenue flow.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          DEMO / SYNTHETIC ANALYTICS
        </span>
      </div>

      {/* Revenue Flow Metric Card */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 space-y-4 shadow-2xs">
        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">REVENUE RECOVERY FLOW</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center font-mono">
          <div className="p-4 rounded bg-slate-50 border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase font-sans block font-semibold">REVENUE AT RISK</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">₹{totalRiskAmount.toLocaleString('en-IN')}</span>
          </div>
          <div className="p-4 rounded bg-blue-50 border border-blue-200 text-blue-900">
            <span className="text-blue-700 text-[10px] uppercase font-sans block font-semibold">RECOVERY ATTEMPTED</span>
            <span className="text-2xl font-bold mt-1 block">₹{totalRiskAmount.toLocaleString('en-IN')}</span>
          </div>
          <div className="p-4 rounded bg-emerald-50 border border-emerald-200 text-emerald-900">
            <span className="text-emerald-700 text-[10px] uppercase font-sans block font-semibold">REVENUE RECOVERED</span>
            <span className="text-2xl font-bold mt-1 block">₹{recoveredAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Failure Cause Distribution */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
          <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">FAILURE CAUSE DISTRIBUTION</h4>
          <div className="space-y-2">
            {[
              { label: 'Insufficient Funds', pct: 45, color: 'bg-slate-900', count: '5 payments' },
              { label: 'Authentication Timeout', pct: 30, color: 'bg-slate-700', count: '3 payments' },
              { label: 'Daily Limit Exceeded', pct: 15, color: 'bg-slate-500', count: '2 payments' },
              { label: 'Temporary Bank Failure', pct: 10, color: 'bg-slate-300', count: '1 payment' },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-slate-700 font-medium">
                  <span>{item.label}</span>
                  <span className="font-mono">{item.pct}% ({item.count})</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strategy Effectiveness */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
          <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">STRATEGY DISTRIBUTION</h4>
          <div className="space-y-2">
            {[
              { label: 'Payment Link (Razorpay Test Mode)', pct: 60, color: 'bg-emerald-600' },
              { label: 'Smart Retry (Optimal Window)', pct: 25, color: 'bg-emerald-500' },
              { label: 'Send Nudge (Interactive)', pct: 10, color: 'bg-emerald-400' },
              { label: 'B2B Chase (Escalation)', pct: 5, color: 'bg-emerald-300' },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-slate-700 font-medium">
                  <span>{item.label}</span>
                  <span className="font-mono">{item.pct}% success</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
