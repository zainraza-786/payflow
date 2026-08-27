import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  ShieldCheck,
  History,
  Settings,
  Zap,
  X,
  CheckCircle2,
  Terminal,
  User,
  Activity,
  AlertOctagon,
  BarChart3,
  PieChart,
  Bot,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'transactions'
  | 'payments'
  | 'analytics'
  | 'approvals'
  | 'exceptions'
  | 'livefeed'
  | 'audit'
  | 'baseline'
  | 'assistant'
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
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions' as NavTab, label: 'Transactions', icon: CreditCard },
    { id: 'analytics' as NavTab, label: 'Analytics', icon: PieChart },
    {
      id: 'approvals' as NavTab,
      label: 'Human Approval',
      icon: ShieldCheck,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      id: 'exceptions' as NavTab,
      label: 'Exceptions',
      icon: AlertOctagon,
      badge: exceptionsCount > 0 ? exceptionsCount : undefined,
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    },
    { id: 'livefeed' as NavTab, label: 'Live Agent Feed', icon: Activity },
    { id: 'audit' as NavTab, label: 'Audit Trail', icon: History },
    { id: 'baseline' as NavTab, label: 'VS Baseline', icon: BarChart3 },
    { id: 'assistant' as NavTab, label: 'AI Assistant', icon: Bot },
    { id: 'settings' as NavTab, label: 'System Settings', icon: Settings },
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-50 border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center text-white shadow-xs">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-base tracking-tight leading-none">PayFlow</h1>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Revenue Recovery Platform</p>
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-3 py-1.5 bg-emerald-500/10 rounded border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></div>
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                System Online
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 font-medium">v1.0</span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-slate-200 text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badgeColor || 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="px-4 py-4 border-t border-slate-200 space-y-2 text-xs bg-slate-50">
          <div className="flex items-center space-x-2 text-slate-600 text-[11px] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>FastAPI Engine (Port 8000)</span>
          </div>

          <div className="flex items-center space-x-2 text-slate-600 text-[11px] font-medium">
            <Terminal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="font-mono text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
              RAZORPAY TEST MODE
            </span>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center space-x-2 text-slate-700">
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-slate-800">Finance Controller</span>
          </div>
        </div>
      </aside>
    </>
  );
};
