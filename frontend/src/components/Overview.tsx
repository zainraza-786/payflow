import React from 'react';
import type { Payment, AuditLog, ApprovalResult } from '../types';
import type { NavTab } from './Sidebar';

interface OverviewProps {
  payments: Payment[];
  auditLogs?: AuditLog[];
  pendingApprovals: ApprovalResult[];
  onSelectPayment: (payment: Payment) => void;
  onNavigate: (tab: NavTab) => void;
  onRunDemoBatch: () => void;
  isBatchRunning: boolean;
  batchResult?: {
    type: 'success' | 'error';
    timestamp: string;
    paymentId?: number;
    razorpayId?: string;
    amount?: number;
    reason?: string;
    guardrail?: string;
    message?: string;
  } | null;
  onDismissBatchResult?: () => void;
}

export const Overview: React.FC<OverviewProps> = ({
  payments,
  pendingApprovals,
  onSelectPayment,
  onNavigate,
  onRunDemoBatch,
  isBatchRunning,
  batchResult,
  onDismissBatchResult,
}) => {
  const totalFailuresCount = payments.length;

  const atRiskPayments = payments.filter((p) => p.status === 'failed');
  const atRiskAmount = atRiskPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const capturedPayments = payments.filter((p) => p.status === 'captured');
  const recoveredAmount = capturedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const recoveryRate =
    totalFailuresCount > 0
      ? ((capturedPayments.length / totalFailuresCount) * 100).toFixed(1)
      : '0.0';

  const insufficientFundsCount = payments.filter((p) =>
    (p.failure_reason || '').toLowerCase().includes('insufficient') ||
    (p.failure_reason || '').toLowerCase().includes('no payment') ||
    (p.failure_reason || '').toLowerCase().includes('invoice')
  ).length;
  const timeoutCount = payments.filter((p) =>
    (p.failure_reason || '').toLowerCase().includes('timeout')
  ).length;
  const limitCount = payments.filter((p) =>
    (p.failure_reason || '').toLowerCase().includes('limit') ||
    (p.failure_reason || '').toLowerCase().includes('cap')
  ).length;
  const bankFailureCount = Math.max(0, totalFailuresCount - (insufficientFundsCount + timeoutCount + limitCount));

  const getCustomerName = (id: number) => {
    const names = ['Rohan Mehta', 'Sneha Kulkarni', 'Acme Demo Pvt Ltd', 'Demo Customer', 'Priya Sharma', 'Vikram Patel'];
    return names[id % names.length];
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner / Control Center Header */}
      <div className="card-stitch p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-label-caps text-label-caps text-status-info bg-status-info/10 px-2.5 py-0.5 rounded-full border border-status-info/20 font-bold">
              REVENUE RECOVERY OVERVIEW
            </span>
          </div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-primary tracking-tight">
            Payflow Recovery Command Center
          </h2>
          <p className="font-body-sm text-body-sm text-secondary mt-1">
            Autonomous payment failure recovery engine operating under deterministic guardrail policies.
          </p>
        </div>

        <button
          onClick={onRunDemoBatch}
          disabled={isBatchRunning}
          className="btn-stitch flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-slate-800 text-white font-body-sm text-body-sm font-semibold shadow-xs disabled:opacity-50 shrink-0"
        >
          <span className={`material-symbols-outlined text-[18px] ${isBatchRunning ? 'animate-spin' : ''}`}>
            {isBatchRunning ? 'refresh' : 'bolt'}
          </span>
          <span>{isBatchRunning ? 'Processing Live Batch...' : 'Run Live Recovery Batch'}</span>
        </button>
      </div>

      {/* Live Batch Execution Result Banner (Persistent until dismissed or rerun) */}
      {batchResult && (
        <div
          className={`p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200 ${
            batchResult.type === 'success'
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs'
              : 'bg-red-50/90 border-red-300 text-red-950 shadow-xs'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white ${
                batchResult.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {batchResult.type === 'success' ? 'check_circle' : 'error'}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">
                  {batchResult.type === 'success'
                    ? `⚡ Live Recovery Batch Processed & Recorded (#${batchResult.paymentId})`
                    : 'Batch Execution Failed'}
                </span>
                <span className="font-tabular-nums text-[11px] opacity-75 font-medium">
                  {batchResult.timestamp}
                </span>
              </div>
              {batchResult.type === 'success' ? (
                <div className="text-xs text-emerald-900 space-y-0.5">
                  <p>
                    <strong>Persisted ID</strong>: #{batchResult.paymentId} (<code className="bg-emerald-100/80 px-1 py-0.5 rounded font-mono text-[11px]">{batchResult.razorpayId}</code>) • <strong>Amount</strong>: ₹{(batchResult.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR • <strong>Reason</strong>: {batchResult.reason}
                  </p>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    🛡️ <strong>Guardrail Verdict</strong>: <span className="font-bold">{batchResult.guardrail}</span>. Dashboard KPIs, Pipeline counts, and the Live Stream below have updated.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-red-800">{batchResult.message}</p>
              )}
            </div>
          </div>

          {onDismissBatchResult && (
            <button
              onClick={onDismissBatchResult}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/80 hover:bg-white text-slate-800 border border-slate-200 shrink-0 transition-colors shadow-2xs"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Clickable KPI Cards Row matching Stitch Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Revenue at Risk */}
        <div
          onClick={() => onNavigate('transactions')}
          className="card-stitch card-stitch-hover p-6 flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-label-caps text-secondary group-hover:text-status-failure transition-colors">
              REVENUE AT RISK
            </span>
            <div className="w-8 h-8 rounded-lg bg-status-failure/10 text-status-failure flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">warning</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="font-tabular-nums text-2xl font-bold text-status-failure tracking-tight">
                ₹{atRiskAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="material-symbols-outlined text-secondary group-hover:text-status-failure text-[18px] transition-colors">
                arrow_outward
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary mt-1">{atRiskPayments.length} pending failed payments</p>
          </div>
        </div>

        {/* KPI 2: Revenue Recovered */}
        <div
          onClick={() => onNavigate('transactions')}
          className="card-stitch card-stitch-hover p-6 flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-label-caps text-secondary group-hover:text-status-recovered transition-colors">
              REVENUE RECOVERED
            </span>
            <div className="w-8 h-8 rounded-lg bg-status-recovered/10 text-status-recovered flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="font-tabular-nums text-2xl font-bold text-status-recovered tracking-tight">
                ₹{recoveredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="material-symbols-outlined text-secondary group-hover:text-status-recovered text-[18px] transition-colors">
                arrow_outward
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary mt-1">{capturedPayments.length} transactions captured</p>
          </div>
        </div>

        {/* KPI 3: Recovery Rate */}
        <div
          onClick={() => onNavigate('analytics')}
          className="card-stitch card-stitch-hover p-6 flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-label-caps text-secondary group-hover:text-status-info transition-colors">
              RECOVERY RATE
            </span>
            <div className="w-8 h-8 rounded-lg bg-status-info/10 text-status-info flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">monitoring</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="font-tabular-nums text-2xl font-bold text-primary tracking-tight">
                {recoveryRate}%
              </span>
              <span className="material-symbols-outlined text-secondary group-hover:text-status-info text-[18px] transition-colors">
                arrow_outward
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary mt-1">Analytics view &rarr;</p>
          </div>
        </div>

        {/* KPI 4: Human Approvals */}
        <div
          onClick={() => onNavigate('approvals')}
          className="card-stitch card-stitch-hover p-6 flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-label-caps text-secondary group-hover:text-status-pending transition-colors">
              HUMAN APPROVALS
            </span>
            <div className="w-8 h-8 rounded-lg bg-status-pending/10 text-status-pending flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">gavel</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="font-tabular-nums text-2xl font-bold text-status-pending tracking-tight">
                {pendingApprovals.length}
              </span>
              <span className="material-symbols-outlined text-secondary group-hover:text-status-pending text-[18px] transition-colors">
                arrow_outward
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary mt-1">₹10,000+ floor threshold</p>
          </div>
        </div>
      </div>

      {/* Visual Recovery Pipeline Stepper */}
      <div className="card-stitch p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">account_tree</span>
            <h3 className="font-headline-md text-body-md font-bold text-primary uppercase tracking-wider">
              RECOVERY PIPELINE DISTRIBUTION
            </h3>
          </div>
          <span className="font-label-caps text-label-caps text-secondary">Real-Time Batch Execution Status</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { stage: 'INGESTED', count: totalFailuresCount, color: 'bg-slate-50 border-slate-200/80 text-primary' },
            { stage: 'DIAGNOSED', count: totalFailuresCount, color: 'bg-slate-50 border-slate-200/80 text-primary' },
            { stage: 'STRATEGY SELECTED', count: totalFailuresCount, color: 'bg-slate-50 border-slate-200/80 text-primary' },
            { stage: 'GUARDRAIL CHECK', count: totalFailuresCount, color: 'bg-slate-50 border-slate-200/80 text-primary' },
            { stage: 'HUMAN APPROVAL', count: pendingApprovals.length, color: 'bg-status-pending/10 border-status-pending/20 text-status-pending' },
            { stage: 'RECOVERY IN-FLIGHT', count: atRiskPayments.length, color: 'bg-status-info/10 border-status-info/20 text-status-info' },
            { stage: 'RECOVERED', count: capturedPayments.length, color: 'bg-status-recovered/10 border-status-recovered/20 text-status-recovered' },
          ].map((item, idx) => (
            <div key={idx} className={`p-3.5 rounded-xl border text-center transition-all ${item.color}`}>
              <div className="font-label-caps text-[10px] font-bold tracking-tight">{item.stage}</div>
              <div className="font-tabular-nums text-lg font-bold mt-1">{item.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* DIAGNOSE -> DECIDE -> RECOVER Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* DIAGNOSE Card */}
        <div className="card-stitch p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/70 pb-3">
            <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center font-label-caps text-[11px] font-bold">1</div>
            <h3 className="font-headline-md text-body-md font-bold text-primary uppercase tracking-wider">DIAGNOSE</h3>
          </div>
          <p className="font-body-sm text-body-sm text-secondary">Root causes identified by failure diagnostician:</p>
          <div className="space-y-2 font-body-sm text-body-sm">
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50/70 border border-slate-200/60">
              <span className="text-secondary font-medium">Insufficient Funds</span>
              <span className="font-tabular-nums font-bold text-primary">{insufficientFundsCount} payments</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50/70 border border-slate-200/60">
              <span className="text-secondary font-medium">Authentication Timeout</span>
              <span className="font-tabular-nums font-bold text-primary">{timeoutCount} payments</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50/70 border border-slate-200/60">
              <span className="text-secondary font-medium">Daily Limit Exceeded</span>
              <span className="font-tabular-nums font-bold text-primary">{limitCount} payments</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50/70 border border-slate-200/60">
              <span className="text-secondary font-medium">Temporary Bank Failure</span>
              <span className="font-tabular-nums font-bold text-primary">{bankFailureCount} payments</span>
            </div>
          </div>
        </div>

        {/* DECIDE Card */}
        <div className="card-stitch p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/70 pb-3">
            <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center font-label-caps text-[11px] font-bold">2</div>
            <h3 className="font-headline-md text-body-md font-bold text-primary uppercase tracking-wider">DECIDE</h3>
          </div>
          <p className="font-body-sm text-body-sm text-secondary">Selected strategy per failure profile:</p>
          <div className="space-y-2 font-body-sm text-body-sm">
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50/70 border border-slate-200/60">
              <span className="text-secondary font-medium">Payment Link</span>
              <span className="font-tabular-nums font-semibold text-primary">Razorpay Test Mode</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50/70 border border-slate-200/60">
              <span className="text-secondary font-medium">Smart Retry</span>
              <span className="font-tabular-nums font-semibold text-primary">Optimal Window</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50/70 border border-slate-200/60">
              <span className="text-secondary font-medium">Send Nudge</span>
              <span className="font-tabular-nums font-semibold text-primary">Interactive Prompt</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50/70 border border-slate-200/60">
              <span className="text-secondary font-medium">B2B Chase</span>
              <span className="font-tabular-nums font-semibold text-primary">High-Value Escalation</span>
            </div>
          </div>
        </div>

        {/* RECOVER Card */}
        <div className="card-stitch p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/70 pb-3">
            <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center font-label-caps text-[11px] font-bold">3</div>
            <h3 className="font-headline-md text-body-md font-bold text-primary uppercase tracking-wider">RECOVER</h3>
          </div>
          <p className="font-body-sm text-body-sm text-secondary">Recovery outcome classification:</p>
          <div className="space-y-2 font-body-sm text-body-sm">
            <div className="flex justify-between items-center p-3 rounded-lg bg-status-recovered/10 border border-status-recovered/20 text-status-recovered">
              <span className="font-semibold">Successfully Recovered</span>
              <span className="font-tabular-nums font-bold">₹{recoveredAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-status-pending/10 border border-status-pending/20 text-status-pending">
              <span className="font-semibold">Human Approval Required</span>
              <span className="font-tabular-nums font-bold">{pendingApprovals.length} pending</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-status-failure/10 border border-status-failure/20 text-status-failure">
              <span className="font-semibold">Guardrail Blocked</span>
              <span className="font-tabular-nums font-bold">Max attempts cap</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Audit Table */}
      <div className="card-stitch p-6 space-y-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline-md text-body-md font-bold text-primary">Live Transaction Stream</h3>
            <p className="font-body-sm text-body-sm text-secondary">Recent payment failure records with guardrail decisions</p>
          </div>
          <button
            onClick={() => onNavigate('transactions')}
            className="font-body-sm text-body-sm font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>All Payments ({payments.length})</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/70">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead>
              <tr className="border-b border-slate-200/70 bg-slate-50/80 text-secondary font-label-caps text-label-caps">
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Payment ID</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Failure Reason</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Strategy</th>
                <th className="py-3.5 px-4">Guardrail Result</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.slice(0, 6).map((p) => {
                const customer = getCustomerName(p.id);
                const isCaptured = p.status === 'captured';
                const isHighValue = (p.amount || 0) >= 10000;

                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectPayment(p)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-primary">{customer}</td>
                    <td className="py-3.5 px-4 font-tabular-nums text-secondary">#{p.id}</td>
                    <td className="py-3.5 px-4 font-tabular-nums font-bold text-primary">
                      ₹{(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-secondary truncate max-w-[200px]">
                      {p.failure_reason || 'Failure'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-label-caps text-label-caps border font-bold ${
                          isCaptured
                            ? 'bg-status-recovered/10 text-status-recovered border-status-recovered/20'
                            : 'bg-status-failure/10 text-status-failure border-status-failure/20'
                        }`}
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-tabular-nums text-[11px] text-secondary">PAYMENT_LINK</td>
                    <td className="py-3.5 px-4">
                      {isHighValue ? (
                        <span className="px-2.5 py-0.5 rounded-full font-label-caps text-label-caps bg-status-pending/10 text-status-pending border border-status-pending/20 font-bold">
                          HUMAN_APPROVAL
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full font-label-caps text-label-caps bg-status-recovered/10 text-status-recovered border border-status-recovered/20 font-bold">
                          ALLOW
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-primary font-semibold hover:underline text-[12px] flex items-center justify-end gap-1">
                        Inspect <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

