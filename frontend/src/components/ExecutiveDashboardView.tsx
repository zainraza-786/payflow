import React, { useState } from 'react';
import { AlertTriangle, TrendingUp, Activity, ShieldCheck, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { Payment, ApprovalResult } from '../types';

interface ExecutiveDashboardViewProps {
  payments: Payment[];
  pendingApprovals: ApprovalResult[];
  onSelectPayment: (payment: Payment) => void;
}

export const ExecutiveDashboardView: React.FC<ExecutiveDashboardViewProps> = ({
  payments,
  pendingApprovals,
  onSelectPayment,
}) => {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(8801);

  const atRiskPayments = payments.filter((p) => p.status === 'failed');
  const atRiskAmount = atRiskPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const capturedPayments = payments.filter((p) => p.status === 'captured');
  const recoveredAmount = capturedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const recoveryRate = payments.length > 0 ? ((capturedPayments.length / payments.length) * 100).toFixed(1) : '0.0';

  const handleCopyEmail = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const highPriorityCases = [
    {
      id: 8801,
      ref: 'INV-2026-019',
      customer: 'Amitabh Saxena',
      amount: 35000,
      badge: 'MISSING PAYMENT',
      rootCause: 'No payment received for invoice INV-2026-019 (Uncollected amount: ₹35,000.00).',
      nextStep: 'Trigger automated payment reminder email/SMS to customer with direct payment link.',
      subject: 'Friendly Reminder: Outstanding Invoice INV-2026-019 Payment',
      body: `Dear Amitabh Saxena,\n\nWe hope you are doing well.\n\nOur automated finance controller indicates that Invoice INV-2026-019 for ₹35,000.00 remains unpaid.\n\nTo ensure uninterrupted services, please complete the payment at your earliest convenience using our instant Razorpay link:\n👉 https://rzp.io/i/demo-INV-2026-019\n\nWarm regards,\nFinance Operations Team\nPayFlow AI Controller`,
    },
    {
      id: 8802,
      ref: 'INV-2026-044',
      customer: 'Alia Bhatt',
      amount: 33000,
      badge: 'MISSING PAYMENT',
      rootCause: 'High-value corporate payment exceeded daily authorization limit (₹33,000.00).',
      nextStep: 'Escalate to B2B Chase strategy and issue split payment link.',
      subject: 'Urgent: Corporate Invoice INV-2026-044 Payment Limit Exceeded',
      body: `Dear Alia Bhatt,\n\nInvoice INV-2026-044 for ₹33,000.00 requires immediate re-authorization due to bank daily caps.\n\nPlease authorize via link: https://rzp.io/i/demo-INV-2026-044`,
    },
    {
      id: 8803,
      ref: 'INV-2026-012',
      customer: 'Neha Reddy',
      amount: 24000,
      badge: 'APPROVAL REQUIRED',
      rootCause: 'High-value recovery exceeds configured threshold (₹24,000 >= ₹10,000).',
      nextStep: 'Awaiting human compliance officer approval in authorization queue.',
      subject: 'Authorization Required: High-Value Recovery Attempt',
      body: `Dear Compliance Team,\n\nPayment INV-2026-012 for ₹24,000.00 is held in the Human Approval Queue.`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>REVENUE AT RISK</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ₹{atRiskAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Across current synthetic batch</p>
        </div>

        {/* KPI 2 */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>REVENUE RECOVERED</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600">
            ₹{recoveredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Money actually recovered</p>
        </div>

        {/* KPI 3 */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>RECOVERY RATE</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {recoveryRate}%
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Of all observed payment failures</p>
        </div>

        {/* KPI 4 */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>HUMAN APPROVALS</span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {pendingApprovals.length}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Pending operator authorization</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Donut Chart / Recovery Status Distribution */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Recovery Status Distribution
          </h3>

          <div className="flex items-center justify-center py-4 relative">
            <div className="w-36 h-36 rounded-full border-12 border-emerald-500 border-t-amber-500 border-r-blue-500 flex items-center justify-center flex-col">
              <span className="text-2xl font-bold text-slate-900 font-mono">{recoveryRate}%</span>
              <span className="text-[10px] font-medium text-slate-500 uppercase">Recovered</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
            <div className="p-2 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium">
              <span className="block font-bold">58.6%</span>
              <span className="text-[10px]">Recovered</span>
            </div>
            <div className="p-2 rounded bg-amber-50 text-amber-900 border border-amber-200 font-medium">
              <span className="block font-bold">25.0%</span>
              <span className="text-[10px]">Pending Approval</span>
            </div>
            <div className="p-2 rounded bg-slate-100 text-slate-800 border border-slate-200 font-medium">
              <span className="block font-bold">16.4%</span>
              <span className="text-[10px]">Blocked</span>
            </div>
          </div>
        </div>

        {/* Right: Strategy Distribution */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Strategy Distribution & Channel Performance
          </h3>

          <div className="space-y-3 pt-2 text-xs">
            {[
              { label: 'Payment Link (Razorpay Test Mode)', pct: 60, color: 'bg-blue-600' },
              { label: 'Smart Retry (Optimal Window)', pct: 25, color: 'bg-emerald-500' },
              { label: 'Send Nudge (Interactive)', pct: 10, color: 'bg-amber-500' },
              { label: 'B2B Chase (Escalation)', pct: 5, color: 'bg-slate-700' },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>{item.label}</span>
                  <span className="font-mono">{item.pct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* High-Priority Action Items (Finance Controller Queue) */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              High-Priority Action Items (Finance Controller Queue)
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            Immediate Action Required
          </span>
        </div>

        <div className="space-y-3">
          {highPriorityCases.map((c) => {
            const isExpanded = expandedId === c.id;

            return (
              <div
                key={c.id}
                className="border border-slate-200 rounded-xl overflow-hidden text-xs transition-all shadow-2xs"
              >
                {/* Header Row */}
                <div
                  onClick={() => {
                    setExpandedId(isExpanded ? null : c.id);
                    const match = payments.find((p) => p.id === c.id);
                    if (match) onSelectPayment(match);
                  }}
                  className="p-4 bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center justify-between font-medium"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-slate-900">
                      [High Risk] {c.ref} — {c.customer} | Variance: ₹{c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                      {c.badge}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 bg-white border-t border-slate-200 space-y-4">
                    <div className="space-y-1.5 leading-relaxed text-slate-700">
                      <div className="flex items-start space-x-2">
                        <span className="text-base">🧠</span>
                        <div>
                          <strong className="text-slate-900">AI Root Cause:</strong> {c.rootCause}
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-base">💡</span>
                        <div>
                          <strong className="text-slate-900">Recommended Next Step:</strong> {c.nextStep}
                        </div>
                      </div>
                    </div>

                    {/* Outreach Email Box */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          ✉️ 1-Click Resolution Outreach Template
                        </span>
                        <button
                          onClick={() => handleCopyEmail(c.id, c.body)}
                          className="px-3 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
                        >
                          {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                          <span>{copiedId === c.id ? 'Copied!' : 'Copy Email'}</span>
                        </button>
                      </div>

                      <div className="font-mono text-slate-700 text-[11px] space-y-1 whitespace-pre-wrap bg-white p-3 rounded border border-slate-200">
                        <div className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                          Subject: {c.subject}
                        </div>
                        <div className="pt-1">{c.body}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
