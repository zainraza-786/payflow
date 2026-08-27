import React from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  ArrowUpRight,
  Zap,
  Activity,
} from 'lucide-react';
import type { Payment, AuditLog, ApprovalResult } from '../types';
import type { NavTab } from './Sidebar';

interface OverviewProps {
  payments: Payment[];
  auditLogs: AuditLog[];
  pendingApprovals: ApprovalResult[];
  onSelectPayment: (payment: Payment) => void;
  onNavigate: (tab: NavTab) => void;
  onRunDemoBatch: () => void;
  isBatchRunning: boolean;
}

export const Overview: React.FC<OverviewProps> = ({
  payments,
  auditLogs,
  pendingApprovals,
  onNavigate,
  onRunDemoBatch,
  isBatchRunning,
}) => {
  // Compute metrics truthfully from state data
  const totalFailuresCount = payments.length;
  const totalFailuresAmount = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

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

  return (
    <div className="space-y-6">
      {/* Top Banner / Control Center Header */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white uppercase tracking-wider">
              PAYFLOW RECOVERY CONTROL CENTER
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              DEMO MODE — SYNTHETIC DATA
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1.5">
            Autonomous Payment Recovery & Guardrail Console
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic failure diagnosis, strategy selection, fail-closed guardrails, and revenue attribution.
          </p>
        </div>

        <button
          onClick={onRunDemoBatch}
          disabled={isBatchRunning}
          className="flex items-center space-x-2 px-4 py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 shrink-0"
        >
          <Zap className={`w-4 h-4 fill-white ${isBatchRunning ? 'animate-spin' : ''}`} />
          <span>{isBatchRunning ? 'Running Demo Recovery Batch...' : '⚡ RUN DEMO RECOVERY BATCH'}</span>
        </button>
      </div>

      {/* KPI Cards Row (High-Hierarchy Numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Payment Failures */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">PAYMENT FAILURES</span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold text-slate-900 tracking-tight block">
              {totalFailuresCount}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              ₹{totalFailuresAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} observed volume
            </p>
          </div>
        </div>

        {/* KPI 2: Revenue At Risk */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">REVENUE AT RISK</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold text-rose-600 tracking-tight block">
              ₹{atRiskAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              {atRiskPayments.length} payments pending recovery
            </p>
          </div>
        </div>

        {/* KPI 3: Pending Human Approvals */}
        <div
          onClick={() => onNavigate('approvals')}
          className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between cursor-pointer hover:border-amber-400 transition-colors group shadow-2xs"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 group-hover:text-amber-700 tracking-wider uppercase transition-colors">
              PENDING APPROVALS
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
            <p className="text-xs text-slate-500 mt-1">High-value authorization queue (₹10,000+)</p>
          </div>
        </div>

        {/* KPI 4: Recovered Revenue */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">RECOVERED REVENUE</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold text-emerald-600 tracking-tight block">
              ₹{recoveredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              {recoveryRate}% recovery rate ({capturedPayments.length} recovered)
            </p>
          </div>
        </div>
      </div>

      {/* Visual Recovery Pipeline Stepper Card */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              DETERMINISTIC RECOVERY PIPELINE STAGES
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">End-to-End Safety Execution</span>
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

      {/* Main Two-Column Layout: Guardrail Panel + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guardrail Safety Panel */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900">Guardrail Engine Protection</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              FAIL-CLOSED
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex justify-between items-center font-semibold text-slate-900">
                <span>High-Value Threshold</span>
                <span className="font-mono text-amber-700">₹10,000.00 INR</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Transactions $\ge$ ₹10,000 automatically trigger Human Approval Gate before execution.
              </p>
            </div>

            <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex justify-between items-center font-semibold text-slate-900">
                <span>Max Recovery Attempts</span>
                <span className="font-mono text-slate-900">2 attempts max</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Strict limit prevents duplicate charging or customer fatigue.
              </p>
            </div>

            <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex justify-between items-center font-semibold text-slate-900">
                <span>Quiet Hours Enforcement</span>
                <span className="font-mono text-slate-900">22:00 – 08:00 IST</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Automated customer outreach is blocked during night quiet hours.
              </p>
            </div>
          </div>
        </div>

        {/* Live Telemetry Feed */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-slate-200 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-semibold text-slate-900">Live Agent Telemetry Feed</h3>
            </div>
            <button
              onClick={() => onNavigate('livefeed')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Full Feed &rarr;
            </button>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {auditLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="p-3 rounded bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-[11px]">{log.event}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-slate-600 text-[11px]">{log.reason || `Payment #${log.payment_id} decision: ${log.decision}`}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
