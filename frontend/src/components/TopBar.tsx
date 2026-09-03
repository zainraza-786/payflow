import React from 'react';

interface TopBarProps {
  setMobileOpen: (open: boolean) => void;
  backendOnline: boolean;
  onOpenDemoModal: () => void;
  onRunDemoBatch?: () => void;
  isBatchRunning?: boolean;
  onGoToLanding?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  setMobileOpen,
  backendOnline,
  onOpenDemoModal,
  onRunDemoBatch,
  isBatchRunning,
  onGoToLanding,
}) => {
  return (
    <header className="h-16 w-full border-b border-border-subtle/80 bg-white/90 backdrop-blur-md flex justify-between items-center px-4 lg:px-6 sticky top-0 z-40">
      {/* Left: Mobile Menu & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-subtle lg:hidden"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        <div className="relative flex items-center w-full h-9 rounded-lg border border-border-subtle/80 bg-slate-100/60 overflow-hidden focus-within:bg-white focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all">
          <div className="grid place-items-center h-full w-9 text-slate-400">
            <span className="material-symbols-outlined text-[18px]">search</span>
          </div>
          <input
            type="text"
            placeholder="Search transactions, customers, or audit logs..."
            className="w-full font-body-sm text-body-sm text-primary bg-transparent pr-3 placeholder-secondary outline-none border-none ring-0 focus:ring-0 p-0 font-medium"
          />
        </div>
      </div>

      {/* Right: Telemetry & Actions */}
      <div className="flex items-center gap-3">
        {onGoToLanding && (
          <button
            onClick={onGoToLanding}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-container border border-border-subtle/80 text-primary font-body-sm text-body-sm font-semibold transition-colors"
            title="Return to Landing Page"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Landing Page</span>
          </button>
        )}

        {/* Backend Status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-body-sm bg-surface-subtle border border-border-subtle/80 font-medium">
          <span
            className={`material-symbols-outlined text-[16px] ${
              backendOnline ? 'text-status-recovered' : 'text-status-failure animate-pulse'
            }`}
          >
            {backendOnline ? 'wifi' : 'wifi_off'}
          </span>
          <span className="font-label-caps text-label-caps text-primary">
            {backendOnline ? 'API Online' : 'API Offline'}
          </span>
        </div>

        {/* Environment Tag */}
        <span className="hidden xl:inline-block font-label-caps text-label-caps text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-bold">
          RAZORPAY TEST MODE
        </span>

        {/* Live Batch Action */}
        {onRunDemoBatch && (
          <button
            onClick={onRunDemoBatch}
            disabled={isBatchRunning}
            className="btn-stitch flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-slate-800 text-white font-body-sm text-body-sm font-semibold shadow-xs disabled:opacity-50"
          >
            <span
              className={`material-symbols-outlined text-[16px] ${
                isBatchRunning ? 'animate-spin' : ''
              }`}
            >
              {isBatchRunning ? 'refresh' : 'bolt'}
            </span>
            <span>{isBatchRunning ? 'Running Batch...' : 'Run Live Batch'}</span>
          </button>
        )}

        {/* Demo Webhook Simulator Drawer Trigger */}
        <button
          onClick={onOpenDemoModal}
          className="btn-stitch p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-subtle transition-colors relative"
          title="Simulate Payment Webhook"
        >
          <span className="material-symbols-outlined text-[20px]">terminal</span>
        </button>
      </div>
    </header>
  );
};

