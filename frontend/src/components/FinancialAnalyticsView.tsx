import React from 'react';
import { PieChart } from 'lucide-react';

interface FinancialAnalyticsViewProps {
  totalRiskAmount: number;
  recoveredAmount: number;
  recoveryRate: string;
}

export const FinancialAnalyticsView: React.FC<FinancialAnalyticsViewProps> = () => {
  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Financial Analytics & Discrepancy Diagnostics</h2>
            <p className="text-xs text-slate-500">
              Quantitative breakdown of settlement timelines, customer exposure, and failure root causes.
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          SYNTHETIC REVENUE ANALYTICS
        </span>
      </div>

      {/* Top 2 Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: Daily Settlement vs Billed Timeline */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Daily Settlement vs Billed Timeline
          </h3>

          <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-slate-200 px-2 font-mono text-[10px]">
            {[
              { date: 'Aug 1', billed: 40, settled: 35 },
              { date: 'Aug 4', billed: 65, settled: 60 },
              { date: 'Aug 7', billed: 90, settled: 85 },
              { date: 'Aug 10', billed: 110, settled: 95 },
              { date: 'Aug 13', billed: 140, settled: 120 },
              { date: 'Aug 16', billed: 80, settled: 75 },
              { date: 'Aug 19', billed: 170, settled: 160 },
              { date: 'Aug 22', billed: 210, settled: 195 },
              { date: 'Aug 25', billed: 190, settled: 180 },
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center gap-1 h-32">
                  <div className="w-2.5 bg-blue-600 rounded-t" style={{ height: `${item.billed * 0.6}%` }}></div>
                  <div className="w-2.5 bg-emerald-500 rounded-t" style={{ height: `${item.settled * 0.6}%` }}></div>
                </div>
                <span className="text-slate-500">{item.date}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center space-x-6 text-xs text-slate-600 font-medium pt-1">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-blue-600"></span>
              <span>Invoiced Amount</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span>Settled Amount</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Top Variance Exposure by Customer (₹) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Top Variance Exposure by Customer (₹)
          </h3>

          <div className="space-y-2.5 pt-2 text-xs">
            {[
              { name: 'Amitabh Saxena', amount: '₹35,000.00', pct: 90 },
              { name: 'Alia Bhatt', amount: '₹33,000.00', pct: 85 },
              { name: 'Neha Reddy', amount: '₹24,000.00', pct: 65 },
              { name: 'Archana Dixit', amount: '₹17,500.00', pct: 45 },
              { name: 'Divya Nambiar', amount: '₹12,000.00', pct: 30 },
              { name: 'Sunil Shetty', amount: '₹8,500.00', pct: 22 },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>{item.name}</span>
                  <span className="font-mono font-bold text-slate-900">{item.amount}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${item.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Root Cause Distribution Breakdown Table */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 text-xs">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Root Cause Distribution Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Reconciliation Status</th>
                <th className="py-2.5 px-3">Transaction Count</th>
                <th className="py-2.5 px-3">Volume (INR)</th>
                <th className="py-2.5 px-3">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr>
                <td className="py-3 px-3 font-semibold text-emerald-700 font-sans">MATCHED & RECOVERED</td>
                <td className="py-3 px-3">25</td>
                <td className="py-3 px-3 font-bold text-slate-900">₹8,15,400.00</td>
                <td className="py-3 px-3 font-bold text-emerald-600">53.2%</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-amber-700 font-sans">AMOUNT MISMATCH</td>
                <td className="py-3 px-3">11</td>
                <td className="py-3 px-3 font-bold text-slate-900">₹3,58,000.00</td>
                <td className="py-3 px-3 font-bold text-amber-600">23.4%</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-rose-700 font-sans">MISSING PAYMENT</td>
                <td className="py-3 px-3">6</td>
                <td className="py-3 px-3 font-bold text-slate-900">₹1,95,000.00</td>
                <td className="py-3 px-3 font-bold text-rose-600">12.8%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
