import React from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  Zap,
  Activity,
  AlertOctagon,
  Lock,
} from 'lucide-react';
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
}

export const Overview: React.FC<OverviewProps> = ({
  payments,
  pendingApprovals,
  onSelectPayment,
  onNavigate,
  onRunDemoBatch,
  isBatchRunning,
}) => {
  // Compute metrics truthfully from state data
  const totalFailuresCount = payments.length;

  const atRiskPayments = payments.filter((p) => p.status === 'failed');
  const atRiskAmount = atRiskPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const capturedPayments = payments.filter((p) => p.status === 'captured');
  const recoveredAmount = capturedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const recoveryRate =
    totalFailuresCount > 0
      ? ((capturedPayments.length / totalFailuresCount) * 100).toFixed(1)
      : '0.0';

  // Diagnostic counts
  const insufficientFundsCount = payments.filter((p) =>
    (p.failure_reason || '').toLowerCase().includes('insufficient')
  ).length;
  const timeoutCount = payments.filter((p) =>
    (p.failure_reason || '').toLowerCase().includes('timeout')
  ).length;
  const limitCount = payments.filter((p) =>
    (p.failure_reason || '').toLowerCase().includes('limit')
  ).length;
  const bankFailureCount = Math.max(0, totalFailuresCount - (insufficientFundsCount + timeoutCount + limitCount));

  // Synthetic Customer Names for Demo Display
  const getCustomerName = (id: number) => {
    const names = ['Rohan Mehta', 'Sneha Kulkarni', 'Acme Demo Pvt Ltd', 'Demo Customer', 'Priya Sharma', 'Vikram Patel'];
    return names[id % names.length];
  };

  return (
    <div className="space-y-6">
      {/* DEMO MODE Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5">
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white uppercase tracking-wider">
            DEMO MODE — SYNTHETIC DATA
          </span>
          <p className="text-amber-900 font-medium">
            Demonstration data only. No real customer payments or real-money transactions are being processed.
          </p>
        </div>
        <span className="text-[10px] font-mono text-amber-800 font-semibold shrink-0">
          Razorpay Test Mode Active
        </span>
      </div>

      {/* Top Banner / Control Center Header */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            PAYFLOW RECOVERY COMMAND CENTER
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            AI-powered payment recovery under deterministic guardrails.
          </p>
        </div>

        <button
          onClick={onRunDemoBatch}
          disabled={isBatchRunning}
          className="flex items-center space-x-2 px-4 py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 shrink-0"
        >
          <Zap className={`w-4 h-4 fill-white ${isBatchRunning ? 'animate-spin' : ''}`} />
          <span>{isBatchRunning ? 'Processing Demo Batch...' : '⚡ RUN DEMO RECOVERY BATCH'}</span>
        </button>
      </div>

      {/* Clickable KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Revenue at Risk */}
        <div
          onClick={() => onNavigate('transactions')}
          className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-rose-400 cursor-pointer transition-colors group shadow-2xs"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 group-hover:text-rose-700 uppercase tracking-wider transition-colors">
              REVENUE AT RISK
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold text-rose-600 tracking-tight">
                ₹{atRiskAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{atRiskPayments.length} payments pending</p>
          </div>
        </div>

        {/* KPI 2: Revenue Recovered */}
        <div
          onClick={() => onNavigate('transactions')}
          className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-400 cursor-pointer transition-colors group shadow-2xs"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 group-hover:text-emerald-700 uppercase tracking-wider transition-colors">
              REVENUE RECOVERED
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold text-emerald-600 tracking-tight">
                ₹{recoveredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{capturedPayments.length} recovered</p>
          </div>
        </div>

        {/* KPI 3: Recovery Rate */}
        <div
          onClick={() => onNavigate('analytics')}
          className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-blue-400 cursor-pointer transition-colors group shadow-2xs"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-700 uppercase tracking-wider transition-colors">
              RECOVERY RATE
            </span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold text-slate-900 tracking-tight">
                {recoveryRate}%
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Analytics view &rarr;</p>
          </div>
        </div>

        {/* KPI 4: Pending Approvals */}
        <div
          onClick={() => onNavigate('approvals')}
          className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-amber-400 cursor-pointer transition-colors group shadow-2xs"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 group-hover:text-amber-700 uppercase tracking-wider transition-colors">
              HUMAN APPROVALS
            </span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold text-amber-600 tracking-tight">
                {pendingApprovals.length}
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">₹10,000+ threshold</p>
          </div>
        </div>

        {/* KPI 5: Guardrail Blocks */}
        <div
          onClick={() => onNavigate('exceptions')}
          className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-rose-400 cursor-pointer transition-colors group shadow-2xs"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 group-hover:text-rose-700 uppercase tracking-wider transition-colors">
              GUARDRAIL BLOCKS
            </span>
            <Lock className="w-4 h-4 text-slate-700" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold text-slate-900 tracking-tight">
                1
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Max 2 attempts rule</p>
          </div>
        </div>
      </div>

      {/* Visual Recovery Pipeline Stepper */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              RECOVERY STATUS DISTRIBUTION
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Real-time Batch Status</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { stage: 'FAILED', count: totalFailuresCount, color: 'bg-rose-50 border-rose-200 text-rose-800' },
            { stage: 'DIAGNOSED', count: totalFailuresCount, color: 'bg-slate-100 border-slate-200 text-slate-800' },
            { stage: 'STRATEGY SELECTED', count: totalFailuresCount, color: 'bg-slate-100 border-slate-200 text-slate-800' },
            { stage: 'GUARDRAIL CHECK', count: totalFailuresCount, color: 'bg-slate-100 border-slate-200 text-slate-800' },
            { stage: 'HUMAN APPROVAL', count: pendingApprovals.length, color: 'bg-amber-50 border-amber-200 text-amber-800' },
            { stage: 'RECOVERY', count: atRiskPayments.length, color: 'bg-blue-50 border-blue-200 text-blue-800' },
            { stage: 'RECOVERED', count: capturedPayments.length, color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
          ].map((item, idx) => (
            <div key={idx} className={`p-3 rounded border text-center font-mono ${item.color}`}>
              <div className="text-[10px] font-bold uppercase tracking-tight">{item.stage}</div>
              <div className="text-lg font-bold mt-1">{item.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* DIAGNOSE -> DECIDE -> RECOVER Visual Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* DIAGNOSE Card */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
            <div className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">1</div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">DIAGNOSE</h3>
          </div>
          <p className="text-xs text-slate-500">Root causes identified by failure diagnostician:</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Insufficient Funds</span>
              <span className="font-mono font-bold text-slate-900">{insufficientFundsCount} payments</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Authentication Timeout</span>
              <span className="font-mono font-bold text-slate-900">{timeoutCount} payments</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Daily Limit Exceeded</span>
              <span className="font-mono font-bold text-slate-900">{limitCount} payments</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Temporary Bank Failure</span>
              <span className="font-mono font-bold text-slate-900">{bankFailureCount} payments</span>
            </div>
          </div>
        </div>

        {/* DECIDE Card */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
            <div className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">2</div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">DECIDE</h3>
          </div>
          <p className="text-xs text-slate-500">Selected strategy per failure profile:</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Payment Link</span>
              <span className="font-mono font-semibold text-slate-900">Razorpay Test Mode</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Smart Retry</span>
              <span className="font-mono font-semibold text-slate-900">Optimal Window</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Send Nudge</span>
              <span className="font-mono font-semibold text-slate-900">Interactive Prompt</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-700">B2B Chase</span>
              <span className="font-mono font-semibold text-slate-900">High-Value Escalation</span>
            </div>
          </div>
        </div>

        {/* RECOVER Card */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
            <div className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">3</div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">RECOVER</h3>
          </div>
          <p className="text-xs text-slate-500">Recovery outcome classification:</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-900">
              <span className="font-semibold">Successfully Recovered</span>
              <span className="font-mono font-bold">₹{recoveredAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-amber-50 border border-amber-200 text-amber-900">
              <span className="font-semibold">Human Approval Required</span>
              <span className="font-mono font-bold">{pendingApprovals.length} pending</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-rose-50 border border-rose-200 text-rose-900">
              <span className="font-semibold">Guardrail Blocked</span>
              <span className="font-mono font-bold">Max attempts limit</span>
            </div>
          </div>
        </div>
      </div>

      {/* High-Priority Action Items Section */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <AlertOctagon className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">HIGH-PRIORITY ACTIONS</h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Requires Operator Attention</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded bg-amber-50 border border-amber-200 space-y-2">
            <div className="flex justify-between items-center font-bold text-amber-900 font-mono">
              <span>₹25,000.00 INR</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-200 text-amber-900">APPROVAL REQUIRED</span>
            </div>
            <p className="text-amber-800 text-[11px]">Reason: High-value recovery exceeds ₹10,000 threshold.</p>
            <button
              onClick={() => onNavigate('approvals')}
              className="text-[11px] font-bold text-amber-900 hover:underline flex items-center gap-1"
            >
              Review in Approval Queue &rarr;
            </button>
          </div>

          <div className="p-3.5 rounded bg-rose-50 border border-rose-200 space-y-2">
            <div className="flex justify-between items-center font-bold text-rose-900 font-mono">
              <span>₹22,000.00 INR</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-200 text-rose-900">GUARDRAIL BLOCKED</span>
            </div>
            <p className="text-rose-800 text-[11px]">Reason: Max attempt limit reached (2/2 attempts).</p>
            <button
              onClick={() => onNavigate('exceptions')}
              className="text-[11px] font-bold text-rose-900 hover:underline flex items-center gap-1"
            >
              Inspect in Exceptions &rarr;
            </button>
          </div>

          <div className="p-3.5 rounded bg-slate-100 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center font-bold text-slate-900 font-mono">
              <span>₹8,500.00 INR</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-300 text-slate-800">RECOVERY ATTEMPT FAILED</span>
            </div>
            <p className="text-slate-700 text-[11px]">Reason: Bank timeout during link creation.</p>
            <button
              onClick={() => onNavigate('transactions')}
              className="text-[11px] font-bold text-slate-900 hover:underline flex items-center gap-1"
            >
              View Details in Transactions &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Audit Table */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Transaction Audit Table</h3>
            <p className="text-xs text-slate-500">Synthetic payment failure records with guardrail results</p>
          </div>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
          >
            All Transactions ({payments.length}) &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Payment ID</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Failure Reason</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Strategy</th>
                <th className="py-2.5 px-3">Guardrail Result</th>
                <th className="py-2.5 px-3 text-right">Action</th>
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
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-medium text-slate-900">{customer}</td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-600">#{p.id}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      ₹{(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-slate-600 truncate max-w-[180px]">
                      {p.failure_reason || 'Failure'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isCaptured
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700">PAYMENT_LINK</td>
                    <td className="py-3 px-3">
                      {isHighValue ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          HUMAN_APPROVAL
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ALLOW
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-slate-900 font-semibold hover:underline text-[11px]">Inspect &rarr;</span>
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
