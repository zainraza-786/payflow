import React from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';

export type NavTab =
  | 'overview'
  | 'transactions'
  | 'analytics'
  | 'approvals'
  | 'exceptions'
  | 'livefeed'
  | 'audit'
  | 'baseline'
  | 'assistant'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  pendingApprovalsCount: number;
  exceptionsCount: number;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingApprovalsCount,
  exceptionsCount,
  mobileOpen,
  setMobileOpen,
}) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: 'dashboard' },
    { id: 'transactions' as NavTab, label: 'Payments', icon: 'payments' },
    {
      id: 'exceptions' as NavTab,
      label: 'Recovery Queue',
      icon: 'assignment_return',
      badge: exceptionsCount > 0 ? exceptionsCount : undefined,
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    },
    {
      id: 'approvals' as NavTab,
      label: 'Human Approvals',
      icon: 'gavel',
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    { id: 'assistant' as NavTab, label: 'AI Assistant', icon: 'smart_toy' },
    { id: 'analytics' as NavTab, label: 'Financial Analytics', icon: 'monitoring' },
    { id: 'livefeed' as NavTab, label: 'Live Agent Feed', icon: 'sensors' },
    { id: 'audit' as NavTab, label: 'Audit Trail', icon: 'history' },
    { id: 'baseline' as NavTab, label: 'VS Baseline', icon: 'analytics' },
    { id: 'reports' as NavTab, label: 'Export & Reports', icon: 'description' },
    { id: 'settings' as NavTab, label: 'Settings', icon: 'settings' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-surface-base border-r border-border-subtle flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header matching Stitch Institutional Style */}
        <div className="px-5 py-5 border-b border-border-subtle/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
                <span className="material-symbols-outlined text-white text-[20px]">account_balance_wallet</span>
              </div>
              <div>
                <h1 className="font-headline-md text-headline-md font-bold text-primary tracking-tight leading-none">Payflow</h1>
                <p className="font-body-sm text-body-sm text-secondary mt-0.5 font-medium">Fintech Ops Platform</p>
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-3 py-1.5 bg-status-recovered/10 rounded-lg border border-status-recovered/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-status-recovered animate-pulse"></div>
              <span className="font-label-caps text-label-caps text-status-recovered font-bold">
                System Online
              </span>
            </div>
            <span className="font-tabular-nums text-[11px] text-secondary font-medium">v1.0</span>
          </div>
        </div>

        {/* Main Desktop Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold select-none transition-colors duration-150 group ${
                  isActive
                    ? 'text-primary font-bold'
                    : 'text-secondary hover:text-primary hover:bg-slate-100/60'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-sidebar-pill"
                    className="absolute inset-0 rounded-lg bg-surface-subtle border border-border-subtle/90 shadow-2xs z-0 pointer-events-none"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}

                <div className="relative z-10 flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-[20px] transition-colors duration-150 ${
                      isActive ? 'text-primary' : 'text-slate-500 group-hover:text-primary'
                    }`}
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                  <span className="font-body-md text-body-md">{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className={`relative z-10 px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Info matching Stitch Status footer */}
        <div className="px-4 py-4 border-t border-border-subtle/80 space-y-2 text-xs bg-surface-base">
          <div className="flex items-center gap-2 text-secondary text-[11px] font-medium">
            <span className="material-symbols-outlined text-status-recovered text-[16px]">wifi</span>
            <span>API Online</span>
          </div>

          <div className="flex items-center gap-2 text-secondary text-[11px] font-medium">
            <span className="material-symbols-outlined text-status-pending text-[16px]">terminal</span>
            <span className="font-tabular-nums text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-semibold">
              RAZORPAY TEST MODE
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

