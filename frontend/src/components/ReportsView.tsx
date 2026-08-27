import React, { useState } from 'react';
import { FileText, Download, Copy, Check, FileSpreadsheet } from 'lucide-react';
import type { Payment, AuditLog } from '../types';

interface ReportsViewProps {
  payments: Payment[];
  auditLogs?: AuditLog[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ payments }) => {
  const [copied, setCopied] = useState(false);

  const markdownSummary = `# PayFlow AI — Executive Finance Reconciliation Report
**Generated On:** 27 August 2026 at 2:11 pm
**Reconciliation Status:** Audit Completed

---

## 1. Key Performance Indicators (KPIs)
* **Total Transactions Processed:** ${payments.length}
* **Total Invoiced Value:** ₹15,85,700.00
* **Total Recovered Revenue:** ₹8,15,400.00
* **Pending Approval Variance:** ₹1,95,000.00

---

## 2. High-Priority Exception Items
1. **[High Risk] INV-2026-019 — Amitabh Saxena** | Variance: ₹35,000.00 (MISSING PAYMENT)
2. **[High Risk] INV-2026-044 — Alia Bhatt** | Variance: ₹33,000.00 (MISSING PAYMENT)
3. **[High Risk] INV-2026-012 — Neha Reddy** | Variance: ₹24,000.00 (MISSING PAYMENT)

---

## 3. Guardrail Compliance Audit
* Quiet Hours Policy (22:00-08:00 IST): ENFORCED
* High-Value Approval Threshold (₹10,000+): ENFORCED (3 Routed to Human Queue)
* Max Retry Attempt Cap (2/2): ENFORCED (0 Violations Observed)`;

  const handleCopySummary = () => {
    navigator.clipboard.writeText(markdownSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Export Reconciliation Audit Reports Section */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Export Reconciliation Audit Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Download enriched reconciliation files for compliance, ERP import, or executive stakeholder presentation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Card 1 */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900">Enriched Reconciliation CSV</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Contains full transaction dataset enriched with flags, difference calculations, risk tiers, and AI action items.
            </p>
            <button className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-sm transition-all">
              <Download className="w-4 h-4" />
              <span>Download Reconciliation CSV Report</span>
            </button>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900">Executive Summary Markdown Report</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Formatted audit report with high-level KPI summaries, health ratings, and top priority action items.
            </p>
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-2xs">
                <Download className="w-3.5 h-3.5" />
                <span>Download Summary (.md)</span>
              </button>
              <button
                onClick={handleCopySummary}
                className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1 shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview of Executive Report */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          👁️ Live Preview of Executive Report
        </h3>
        <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto border border-slate-800">
          {markdownSummary}
        </div>
      </div>
    </div>
  );
};
