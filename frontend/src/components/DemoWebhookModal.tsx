import React, { useState } from 'react';
import { X, Play, Zap, CheckCircle2, ShieldAlert } from 'lucide-react';
import { sendWebhook } from '../services/api';

interface DemoWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
}

export const DemoWebhookModal: React.FC<DemoWebhookModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  if (!isOpen) return null;

  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<number>(15000);
  const [customRzpId, setCustomRzpId] = useState<string>(`pay_demo_${Date.now().toString().slice(-6)}`);

  const handleTriggerFailure = async (amountInRupees: number) => {
    const typeLabel = amountInRupees >= 10000 ? 'high-value' : 'low-value';
    setLoadingType(typeLabel);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const rzpId = `pay_demo_${Date.now().toString().slice(-6)}`;
      const amountPaise = amountInRupees * 100;

      const payload = {
        entity: 'event',
        account_id: 'acc_demo_runner',
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: rzpId,
              amount: amountPaise,
              currency: 'INR',
              status: 'failed',
              error_description: 'Payment failed due to insufficient funds',
            },
          },
        },
      };

      await sendWebhook(payload);
      setSuccessMsg(`Injected signed payment.failed webhook for ${rzpId} (₹${amountInRupees.toLocaleString()}).`);
      onRefreshData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send demo webhook');
    } finally {
      setLoadingType(null);
    }
  };

  const handleTriggerCapture = async () => {
    setLoadingType('capture');
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const amountPaise = customAmount * 100;
      const payload = {
        entity: 'event',
        account_id: 'acc_demo_runner',
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: customRzpId,
              amount: amountPaise,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      };

      await sendWebhook(payload);
      setSuccessMsg(`Injected signed payment.captured webhook for ${customRzpId}.`);
      onRefreshData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send capture webhook');
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl space-y-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-slate-900 text-white shadow-2xs">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Interactive Webhook Simulator</h3>
              <p className="text-xs text-slate-500">Trigger test webhook events signed locally with HMAC-SHA256</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Presets */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Demo Scenarios
          </label>

          {/* Preset 1: High-Value Failure */}
          <div className="p-3.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-900 block">High-Value Failure (₹15,000.00)</span>
              <span className="text-[11px] text-slate-500">Exceeds ₹10,000 threshold &rarr; Triggers HUMAN_APPROVAL gate</span>
            </div>
            <button
              onClick={() => handleTriggerFailure(15000)}
              disabled={loadingType !== null}
              className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center space-x-1 shadow-2xs"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{loadingType === 'high-value' ? 'Sending...' : 'Trigger'}</span>
            </button>
          </div>

          {/* Preset 2: Standard Failure */}
          <div className="p-3.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-900 block">Standard Failure (₹150.00)</span>
              <span className="text-[11px] text-slate-500">Under threshold &rarr; Standard recovery workflow</span>
            </div>
            <button
              onClick={() => handleTriggerFailure(150)}
              disabled={loadingType !== null}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center space-x-1 shadow-2xs"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{loadingType === 'low-value' ? 'Sending...' : 'Trigger'}</span>
            </button>
          </div>

          {/* Custom Capture Simulation */}
          <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs font-semibold text-slate-900 block">Simulate Capture Webhook</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={customRzpId}
                onChange={(e) => setCustomRzpId(e.target.value)}
                placeholder="Razorpay ID (e.g. pay_demo_123456)"
                className="px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 text-xs font-mono"
              />
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(Number(e.target.value))}
                placeholder="Amount (₹)"
                className="px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 text-xs font-mono"
              />
            </div>
            <button
              onClick={handleTriggerCapture}
              disabled={loadingType !== null}
              className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center space-x-1 shadow-2xs"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{loadingType === 'capture' ? 'Sending...' : 'Simulate Payment Capture'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
