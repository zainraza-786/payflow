import React from 'react';
import type { Payment, ApprovalResult, AuditLog } from '../types';

interface FinancialAnalyticsViewProps {
  payments?: Payment[];
  approvals?: ApprovalResult[];
  auditLogs?: AuditLog[];
  totalRiskAmount?: number;
  recoveredAmount?: number;
  recoveryRate?: string;
}

export const FinancialAnalyticsView: React.FC<FinancialAnalyticsViewProps> = ({
  payments = [],
  approvals = [],
  auditLogs = [],
  totalRiskAmount = 0,
  recoveredAmount = 0,
  recoveryRate = '0.0',
}) => {
  const formatInr = (amt: number) => `₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR`;

  // 1. Dynamic Top Failure Exposure by Account (from actual payments state)
  const failedPayments = payments.filter((p) => p.status === 'failed');
  const capturedPayments = payments.filter((p) => p.status === 'captured');
  const totalFailedAmount = failedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalVolume = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  // Group failed payments by customer/account name extracted from failure reason or ID
  const accountExposures = failedPayments.map((p) => {
    let name = 'Account #' + p.id;
    const match = (p.failure_reason || '').match(/\(([^)]+)\)/);
    if (match && match[1]) {
      name = match[1];
    } else if (p.razorpay_payment_id) {
      name = p.razorpay_payment_id;
    }
    const pct = totalFailedAmount > 0 ? Math.min(100, Math.round(((p.amount || 0) / totalFailedAmount) * 100)) : 0;
    return {
      id: p.id,
      name,
      amount: p.amount || 0,
      pct,
      isHighValue: (p.amount || 0) >= 10000,
    };
  }).sort((a, b) => b.amount - a.amount);

  // 2. Dynamic Failure Cause Breakdown (calculated strictly from payments in memory)
  const totalCount = payments.length;
  const timeoutItems = payments.filter((p) => (p.failure_reason || '').toLowerCase().includes('timeout'));
  const fundsItems = payments.filter((p) => {
    const r = (p.failure_reason || '').toLowerCase();
    return r.includes('insufficient') || r.includes('no payment') || r.includes('unpaid') || r.includes('invoice');
  });
  const limitItems = payments.filter((p) => {
    const r = (p.failure_reason || '').toLowerCase();
    return r.includes('limit') || r.includes('cap');
  });
  const bankOutageItems = payments.filter((p) => {
    const r = (p.failure_reason || '').toLowerCase();
    return r.includes('bank') || r.includes('network') || r.includes('downtime');
  });

  const categories = [
    {
      name: 'MATCHED & RECOVERED',
      statusClass: 'text-status-recovered',
      badgeClass: 'bg-status-recovered/10 text-status-recovered border-status-recovered/20',
      count: capturedPayments.length,
      volume: recoveredAmount,
      distribution: totalVolume > 0 ? ((recoveredAmount / totalVolume) * 100).toFixed(1) : '0.0',
    },
    {
      name: 'INSUFFICIENT FUNDS / UNPAID INVOICES',
      statusClass: 'text-status-pending',
      badgeClass: 'bg-status-pending/10 text-status-pending border-status-pending/20',
      count: fundsItems.length,
      volume: fundsItems.reduce((s, p) => s + (p.amount || 0), 0),
      distribution: totalVolume > 0 ? ((fundsItems.reduce((s, p) => s + (p.amount || 0), 0) / totalVolume) * 100).toFixed(1) : '0.0',
    },
    {
      name: 'AUTHENTICATION / OTP TIMEOUT',
      statusClass: 'text-status-info',
      badgeClass: 'bg-status-info/10 text-status-info border-status-info/20',
      count: timeoutItems.length,
      volume: timeoutItems.reduce((s, p) => s + (p.amount || 0), 0),
      distribution: totalVolume > 0 ? ((timeoutItems.reduce((s, p) => s + (p.amount || 0), 0) / totalVolume) * 100).toFixed(1) : '0.0',
    },
    {
      name: 'CARD / DAILY LIMIT EXCEEDED',
      statusClass: 'text-status-failure',
      badgeClass: 'bg-status-failure/10 text-status-failure border-status-failure/20',
      count: limitItems.length,
      volume: limitItems.reduce((s, p) => s + (p.amount || 0), 0),
      distribution: totalVolume > 0 ? ((limitItems.reduce((s, p) => s + (p.amount || 0), 0) / totalVolume) * 100).toFixed(1) : '0.0',
    },
    {
      name: 'TEMPORARY BANK SERVER DOWNTIME',
      statusClass: 'text-slate-600',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      count: bankOutageItems.length,
      volume: bankOutageItems.reduce((s, p) => s + (p.amount || 0), 0),
      distribution: totalVolume > 0 ? ((bankOutageItems.reduce((s, p) => s + (p.amount || 0), 0) / totalVolume) * 100).toFixed(1) : '0.0',
    },
  ];

  // 3. Dynamic Strategy Performance
  const stratTelemetry = {
    PAYMENT_LINK: { label: 'Payment Link (72h)', count: 0, recovered: 0, amount: 0 },
    SMART_RETRY: { label: 'Smart Retry (Off-Peak)', count: 0, recovered: 0, amount: 0 },
    SEND_NUDGE: { label: 'Multi-Method Nudge', count: 0, recovered: 0, amount: 0 },
    B2B_CHASE: { label: 'B2B Escalation (₹10k+ Floor)', count: 0, recovered: 0, amount: 0 },
  };

  payments.forEach((p) => {
    const r = (p.failure_reason || '').toLowerCase();
    let key: keyof typeof stratTelemetry = 'PAYMENT_LINK';
    if (r.includes('timeout') || r.includes('smart retry')) key = 'SMART_RETRY';
    else if (r.includes('insufficient') || r.includes('limit')) key = 'SEND_NUDGE';
    else if ((p.amount || 0) >= 10000) key = 'B2B_CHASE';

    stratTelemetry[key].count += 1;
    if (p.status === 'captured') {
      stratTelemetry[key].recovered += 1;
      stratTelemetry[key].amount += p.amount || 0;
    }
  });

  if (totalCount === 0) {
    return (
      <div className="card-stitch p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
          <span className="material-symbols-outlined text-[28px]">query_stats</span>
        </div>
        <h3 className="font-headline-md text-headline-md font-bold text-primary">Insufficient Data Available</h3>
        <p className="font-body-sm text-body-sm text-secondary max-w-md mx-auto">
          No transactions currently recorded in active memory. Run a live batch from the command bar to populate quantitative financial analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
            <span className="material-symbols-outlined text-[24px]">monitoring</span>
          </div>
          <div>
            <h2 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">
              Financial Analytics & Revenue Flow
            </h2>
            <p className="font-body-sm text-body-sm text-secondary mt-0.5 font-medium">
              Live quantitative breakdown computed across {totalCount} session transactions ({formatInr(totalVolume)} volume).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-label-caps text-[10px] text-status-recovered bg-status-recovered/10 px-3 py-1 rounded-full border border-status-recovered/20 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-recovered animate-pulse"></span>
            DATA GROUNDED
          </span>
        </div>
      </div>

      {/* Top 3 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-stitch p-5 space-y-2">
          <span className="font-label-caps text-label-caps text-secondary font-bold">TOTAL RECOVERED REVENUE</span>
          <div className="font-tabular-nums text-2xl font-bold text-status-recovered">
            {formatInr(recoveredAmount)}
          </div>
          <p className="text-[11px] text-secondary font-medium">
            {capturedPayments.length} of {totalCount} payments settled ({recoveryRate}% efficiency)
          </p>
        </div>

        <div className="card-stitch p-5 space-y-2">
          <span className="font-label-caps text-label-caps text-secondary font-bold">REVENUE AT RISK</span>
          <div className="font-tabular-nums text-2xl font-bold text-status-failure">
            {formatInr(totalFailedAmount)}
          </div>
          <p className="text-[11px] text-secondary font-medium">
            {failedPayments.length} transactions pending or held under guardrails
          </p>
        </div>

        <div className="card-stitch p-5 space-y-2">
          <span className="font-label-caps text-label-caps text-secondary font-bold">TOTAL INGESTED VOLUME</span>
          <div className="font-tabular-nums text-2xl font-bold text-primary">
            {formatInr(totalVolume)}
          </div>
          <p className="text-[11px] text-secondary font-medium">
            {totalCount} transaction events ingested across active session
          </p>
        </div>
      </div>

      {/* Dynamic Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Revenue Flow & Volume Comparison (Fixed Spacing & Responsive) */}
        <div className="card-stitch p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-headline-md text-sm font-bold text-primary uppercase tracking-wider">
              Revenue Recovery vs Exposure
            </h3>
            <span className="font-label-caps text-[10px] text-secondary font-bold">Live Breakdown</span>
          </div>

          <div className="space-y-4 pt-1">
            {/* Recovered Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-status-recovered flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-recovered"></span>
                  Recovered Capital
                </span>
                <span className="font-tabular-nums font-bold text-primary">{formatInr(recoveredAmount)} ({recoveryRate}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200/60">
                <div
                  className="h-full bg-status-recovered rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, totalVolume > 0 ? (recoveredAmount / totalVolume) * 100 : 0)}%` }}
                />
              </div>
            </div>

            {/* Failed / At Risk Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-status-failure flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-failure"></span>
                  Revenue at Risk (Uncollected)
                </span>
                <span className="font-tabular-nums font-bold text-primary">
                  {formatInr(totalFailedAmount)} ({totalVolume > 0 ? ((totalFailedAmount / totalVolume) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200/60">
                <div
                  className="h-full bg-status-failure rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, totalVolume > 0 ? (totalFailedAmount / totalVolume) * 100 : 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Strategy Attribution Sub-Matrix */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
              Dynamic Strategy Conversion Attribution
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(stratTelemetry).map(([key, strat]) => {
                const conv = strat.count > 0 ? Math.round((strat.recovered / strat.count) * 100) : 0;
                return (
                  <div key={key} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
                    <div className="font-bold text-primary truncate text-[11px]">{strat.label}</div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-secondary">{strat.recovered}/{strat.count} recovered</span>
                      <span className={`font-bold ${conv > 0 ? 'text-status-recovered' : 'text-slate-500'}`}>{conv}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart 2: Top Failure Exposure by Account (Strictly Dynamic) */}
        <div className="card-stitch p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-headline-md text-sm font-bold text-primary uppercase tracking-wider">
                Top Failure Exposure by Account
              </h3>
              <span className="font-label-caps text-[10px] text-secondary font-bold">Uncollected Volume</span>
            </div>

            {accountExposures.length === 0 ? (
              <div className="p-8 text-center text-secondary text-xs">
                ✅ Zero failed exposures in active session. All transactions are settled.
              </div>
            ) : (
              <div className="space-y-3.5">
                {accountExposures.slice(0, 6).map((item) => (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-primary truncate max-w-[200px] flex items-center gap-1.5">
                        {item.name}
                        {item.isHighValue && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded">
                            ≥ ₹10k
                          </span>
                        )}
                      </span>
                      <span className="font-tabular-nums font-bold text-primary">{formatInr(item.amount)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                      <div
                        className="h-full bg-status-failure rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(4, item.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-secondary flex items-center justify-between font-medium">
            <span>🛡️ Guardrail Threshold: ₹10,000.00 Floor</span>
            <span>{accountExposures.filter(a => a.isHighValue).length} items require Human Approval</span>
          </div>
        </div>
      </div>

      {/* Root Cause Distribution Breakdown Table (Strictly Dynamic) */}
      <div className="card-stitch p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-headline-md text-sm font-bold text-primary uppercase tracking-wider">
            Failure Cause Distribution Breakdown
          </h3>
          <span className="font-label-caps text-[10px] text-secondary font-bold">Deterministic Classification</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/70">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead>
              <tr className="border-b border-slate-200/70 bg-slate-50/80 text-secondary font-label-caps text-[10px]">
                <th className="py-3 px-4">Failure Category</th>
                <th className="py-3 px-4 text-center">Transaction Count</th>
                <th className="py-3 px-4 text-right">Volume (INR)</th>
                <th className="py-3 px-4 text-right">Portfolio Share %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {categories.map((cat, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-bold flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${cat.badgeClass}`}>
                      {cat.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-tabular-nums text-center font-semibold text-primary">
                    {cat.count}
                  </td>
                  <td className="py-3 px-4 font-tabular-nums text-right font-bold text-primary">
                    {formatInr(cat.volume)}
                  </td>
                  <td className="py-3 px-4 font-tabular-nums text-right font-bold text-secondary">
                    {cat.distribution}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
