import React from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  ArrowUpRight,
  Clock,
  Play,
} from 'lucide-react';
import type { Payment, AuditLog, ApprovalResult } from '../types';
import type { NavTab } from './Sidebar';

interface OverviewProps {
  payments: Payment[];
  auditLogs: AuditLog[];
  pendingApprovals: ApprovalResult[];
  onSelectPayment: (payment: Payment) => void;
  onNavigate: (tab: NavTab) => void;
  onOpenDemoModal: () => void;
}

export const Overview: React.FC<OverviewProps> = ({
  payments,
  auditLogs,
  pendingApprovals,
  onSelectPayment,
  onNavigate,
  onOpenDemoModal,
}) => {
  // Compute metrics truthfully from backend data
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Revenue Recovery Overview</h2>
          <p className="text-sm text-slate-500 mt-1">
            Monitor failed payments, failure diagnoses, safety guardrails, and recovered revenue.
          </p>
        </div>
        <button
          onClick={onOpenDemoModal}
          className="flex items-center space-x-2 px-3.5 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-xs shrink-0"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Launch Webhook Simulator</span>
        </button>
      </div>

      {/* KPI Cards Row (Stitch Grid Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Payment Failures */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:bg-slate-50/50 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">PAYMENT FAILURES</span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold text-slate-900 tracking-tight block">
              {totalFailuresCount}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              ₹{totalFailuresAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} total volume
            </p>
          </div>
        </div>

        {/* KPI 2: Revenue At Risk */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:bg-slate-50/50 transition-colors">
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

        {/* KPI 3: Pending Approvals */}
        <div
          onClick={() => onNavigate('approvals')}
          className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between cursor-pointer hover:border-amber-400/80 transition-colors group"
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
            <p className="text-xs text-slate-500 mt-1">High-value authorization queue</p>
          </div>
        </div>

        {/* KPI 4: Recovered Revenue */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:bg-slate-50/50 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">RECOVERED REVENUE</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold text-emerald-600 tracking-tight block">
              ₹{recoveredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              {recoveryRate}% recovery rate ({capturedPayments.length} payments)
            </p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Payments Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent Payment Failures</h3>
              <p className="text-xs text-slate-500">Real-time observed transactions needing attention</p>
            </div>
            <button
              onClick={() => onNavigate('payments')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
            >
              View all ({payments.length})
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800">No payment failure events observed yet</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Use the Webhook Simulator to trigger a test payment failure event.
              </p>
              <button
                onClick={onOpenDemoModal}
                className="mt-3 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-xs font-medium text-white shadow-xs"
              >
                Trigger Demo Webhook
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Payment ID</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Failure Reason</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.slice(0, 5).map((payment) => (
                    <tr
                      key={payment.id}
                      onClick={() => onSelectPayment(payment)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 font-mono font-medium text-slate-900">
                        #{payment.id} <span className="text-[10px] text-slate-500">({payment.razorpay_payment_id})</span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        ₹{(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-slate-600 truncate max-w-[180px]">
                        {payment.failure_reason || 'Unknown failure'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            payment.status === 'captured'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {payment.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-slate-900 font-semibold hover:underline text-[11px]">
                          Inspect &rarr;
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Live Audit Event Feed */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Audit Stream</h3>
              <p className="text-xs text-slate-500">Real-time telemetry log</p>
            </div>
            <button
              onClick={() => onNavigate('audit')}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              All events &rarr;
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No audit events logged yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {auditLogs.slice(0, 7).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded bg-slate-50 border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-slate-900 text-[11px]">
                      {log.event}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-tight">
                    {log.reason || `Payment #${log.payment_id} decision: ${log.decision}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
