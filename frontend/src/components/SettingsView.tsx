import React from 'react';
import { Settings, CheckCircle2 } from 'lucide-react';

interface SettingsViewProps {
  backendOnline: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ backendOnline }) => {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-1">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-slate-700" />
          <h2 className="text-base font-semibold text-slate-900">System Telemetry & Status</h2>
        </div>
        <p className="text-xs text-slate-500">
          Environment configuration status and active security boundaries. Secrets are redacted and stored strictly server-side in `.env`.
        </p>
      </div>

      {/* Configuration Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Card 1: Environment Status */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-xs">Environment Mode</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              TEST MODE
            </span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Razorpay Test Mode keys (`rzp_test_...`) are active. Zero real-money transactions occur. External API endpoints route strictly to test mode.
          </p>
        </div>

        {/* Card 2: Backend API Status */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-xs">FastAPI Engine Status</span>
            {backendOnline ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ONLINE (Port 8000)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                OFFLINE
              </span>
            )}
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            FastAPI application entrypoint `app.main:app` handles webhook ingestion, workflow orchestration, and approval state management.
          </p>
        </div>

        {/* Card 3: Webhook HMAC Verification */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-xs">Webhook Verification</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              HMAC-SHA256 ACTIVE
            </span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            All incoming webhooks at `POST /webhooks/razorpay` are verified against the configured webhook secret using constant-time signature comparison.
          </p>
        </div>

        {/* Card 4: Safety & Guardrail Engine */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-xs">Guardrail Protection</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              FAIL-CLOSED
            </span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Quiet hours (22:00-08:00 IST), maximum 2 attempt limits, and ₹10,000 high-value human approval thresholds are strictly enforced by the backend.
          </p>
        </div>
      </div>
    </div>
  );
};
