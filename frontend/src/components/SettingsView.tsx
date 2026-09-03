import React from 'react';

interface SettingsViewProps {
  backendOnline: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ backendOnline }) => {
  return (
    <div className="space-y-6 max-w-5xl font-sans">
      {/* Header Banner */}
      <div className="card-stitch p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
            <span className="material-symbols-outlined text-[24px]">settings</span>
          </div>
          <div>
            <h2 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">
              Settings & Strategy Configuration
            </h2>
            <p className="font-body-sm text-body-sm text-secondary mt-0.5">
              Environment configuration, guardrail parameters, model training settings, and integration keys.
            </p>
          </div>
        </div>
        <span className="font-label-caps text-label-caps text-status-recovered bg-status-recovered/10 px-3 py-1 rounded-full border border-status-recovered/20 font-bold">
          SYSTEM ACTIVE
        </span>
      </div>

      {/* Configuration Status Grid matching Stitch Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-body-sm text-body-sm">
        {/* Card 1: Environment Status */}
        <div className="card-stitch p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-primary">Environment Mode</span>
            <span className="px-2.5 py-0.5 rounded-full font-label-caps text-label-caps bg-status-pending/10 text-status-pending border border-status-pending/20 font-bold">
              RAZORPAY TEST MODE
            </span>
          </div>
          <p className="text-secondary leading-relaxed">
            Razorpay Test Mode keys (`rzp_test_...`) are active. Zero real-money transactions occur. External API endpoints route strictly to sandbox.
          </p>
        </div>

        {/* Card 2: Backend API Engine Status */}
        <div className="card-stitch p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-primary">FastAPI Engine Telemetry</span>
            {backendOnline ? (
              <span className="px-2.5 py-0.5 rounded-full font-label-caps text-label-caps bg-status-recovered/10 text-status-recovered border border-status-recovered/20 flex items-center gap-1 font-bold">
                <span className="material-symbols-outlined text-[14px]">wifi</span> ONLINE (Port 8000)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full font-label-caps text-label-caps bg-status-failure/10 text-status-failure border border-status-failure/20 font-bold">
                OFFLINE
              </span>
            )}
          </div>
          <p className="text-secondary leading-relaxed">
            FastAPI engine handles webhook ingestion, failure diagnosis, workflow orchestration, and immutable audit logging.
          </p>
        </div>

        {/* Card 3: Webhook Verification */}
        <div className="card-stitch p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-primary">Webhook HMAC Verification</span>
            <span className="px-2.5 py-0.5 rounded-full font-label-caps text-label-caps bg-status-recovered/10 text-status-recovered border border-status-recovered/20 font-bold">
              HMAC-SHA256 ACTIVE
            </span>
          </div>
          <p className="text-secondary leading-relaxed">
            Incoming webhook payloads at `POST /webhooks/razorpay` are cryptographically verified against the secret signature.
          </p>
        </div>

        {/* Card 4: Safety & Guardrail Engine */}
        <div className="card-stitch p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-primary">Fail-Closed Guardrail Rules</span>
            <span className="px-2.5 py-0.5 rounded-full font-label-caps text-label-caps bg-status-recovered/10 text-status-recovered border border-status-recovered/20 font-bold">
              FAIL-CLOSED ARCHITECTURE
            </span>
          </div>
          <p className="text-secondary leading-relaxed">
            Quiet hours (22:00-08:00 IST), maximum 2 attempts cap, and ₹10,000 high-value human approval floor are strictly enforced.
          </p>
        </div>
      </div>
    </div>
  );
};

