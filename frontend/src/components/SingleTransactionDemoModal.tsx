import React from 'react';
import { X } from 'lucide-react';
import type { Payment } from '../types';

interface SingleTransactionDemoModalProps {
  payment: Payment | null;
  onClose: () => void;
}

export const SingleTransactionDemoModal: React.FC<SingleTransactionDemoModalProps> = ({
  payment,
  onClose,
}) => {
  if (!payment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">
              SINGLE TRANSACTION DEMO WALKTHROUGH
            </span>
            <h3 className="text-sm font-bold text-slate-900 mt-1">Payment #{payment.id} Inspection</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {[
            { step: '1. Failure', desc: payment.failure_reason || 'Insufficient Funds' },
            { step: '2. Diagnosis', desc: 'Root cause identified: Insufficient account balance at authorization time.' },
            { step: '3. Decision', desc: 'Strategy selected: PAYMENT_LINK via Razorpay Test Mode.' },
            { step: '4. Guardrail', desc: (payment.amount || 0) >= 10000 ? 'Threshold >= ₹10,000 -> HUMAN_APPROVAL REQUIRED' : 'Guardrail Verdict: ALLOW' },
            { step: '5. Approval', desc: (payment.amount || 0) >= 10000 ? 'Pending operator authorization' : 'Auto-approved standard attempt' },
            { step: '6. Recovery', desc: payment.status === 'captured' ? 'Captured & Recovered' : 'Link generated, awaiting customer payment' },
            { step: '7. Audit', desc: 'Immutable telemetry log created' },
          ].map((item, idx) => (
            <div key={idx} className="p-2.5 rounded bg-slate-50 border border-slate-200 flex justify-between">
              <span className="font-bold text-slate-900">{item.step}</span>
              <span className="text-slate-700 font-medium">{item.desc}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs font-semibold">
            Close Walkthrough
          </button>
        </div>
      </div>
    </div>
  );
};
