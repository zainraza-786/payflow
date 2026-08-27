import React from 'react';
import { Menu, Play, Search, CheckCircle2, XCircle, Bell } from 'lucide-react';
import type { NavTab } from './Sidebar';

interface TopBarProps {
  activeTab?: NavTab;
  setMobileOpen: (open: boolean) => void;
  backendOnline: boolean;
  onOpenDemoModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  setMobileOpen,
  backendOnline,
  onOpenDemoModal,
}) => {
  return (
    <header className="h-14 w-full border-b border-slate-200 bg-white flex justify-between items-center px-6 sticky top-0 z-40">
      {/* Left: Mobile Menu & Search */}
      <div className="flex items-center space-x-3 flex-1 max-w-lg">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative flex items-center w-full h-8 rounded border border-slate-200 bg-slate-50 overflow-hidden focus-within:border-slate-900 transition-colors">
          <div className="grid place-items-center h-full w-8 text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search transactions, clients, or audits..."
            className="w-full text-xs font-normal text-slate-900 bg-transparent pr-2 placeholder-slate-400 outline-none border-none ring-0 focus:ring-0 p-0"
          />
        </div>
      </div>

      {/* Right: Telemetry & Actions */}
      <div className="flex items-center space-x-3">
        {/* Backend Connectivity Status */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium bg-slate-100 border border-slate-200">
          {backendOnline ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-slate-700 text-[11px] font-semibold">API Online</span>
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span className="text-rose-700 text-[11px] font-semibold">API Offline</span>
            </>
          )}
        </div>

        {/* Demo Simulator Launcher */}
        <button
          onClick={onOpenDemoModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-xs"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>Simulate Demo Webhook</span>
        </button>

        <button className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-600 rounded-full"></span>
        </button>
      </div>
    </header>
  );
};
