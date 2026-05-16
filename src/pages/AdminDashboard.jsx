import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, Euro, Receipt, AlertTriangle, Ban, Flag,
  Ticket, FileText, Shield, Mail, Menu, X, Bell, ChevronRight,
  Activity, TrendingUp, Users, Zap,
} from 'lucide-react';

import OverviewTab from '@/components/admin/OverviewTab';
import DisputesTab from '@/components/admin/DisputesTab';
import BlacklistTab from '@/components/admin/BlacklistTab';
import AdminDocumentsTab from '@/components/admin/AdminDocumentsTab';
import ReportsTab from '@/components/admin/ReportsTab';
import SupportTicketsTab from '@/components/admin/SupportTicketsTab';
import DAC7Tab from '@/components/admin/DAC7Tab';
import IndependenceTab from '@/components/admin/IndependenceTab';
import AdminFinanceTab from '@/components/admin/AdminFinanceTab';
import AdminEmailTab from '@/components/admin/AdminEmailTab';

const TABS = [
  { key: 'overview',     label: 'Vue d\'ensemble', icon: LayoutDashboard, group: 'Principal' },
  { key: 'finance',      label: 'Finances',         icon: Euro,            group: 'Principal' },
  { key: 'documents',    label: 'Documents',        icon: Receipt,         group: 'Principal' },
  { key: 'disputes',     label: 'Litiges',          icon: AlertTriangle,   group: 'Modération' },
  { key: 'reports',      label: 'Signalements',     icon: Flag,            group: 'Modération' },
  { key: 'blacklist',    label: 'Blacklist',        icon: Ban,             group: 'Modération' },
  { key: 'tickets',      label: 'Support',          icon: Ticket,          group: 'Outils' },
  { key: 'email',        label: 'Email',            icon: Mail,            group: 'Outils' },
  { key: 'dac7',         label: 'DAC7',             icon: FileText,        group: 'Conformité' },
  { key: 'independence', label: 'Indépendance',     icon: Shield,          group: 'Conformité' },
];

const GROUPS = ['Principal', 'Modération', 'Outils', 'Conformité'];

const BADGE_COLORS = {
  disputes: 'bg-amber-500',
  reports:  'bg-red-500',
  tickets:  'bg-blue-500',
};

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  const { data: pendingReports = [] } = useQuery({
    queryKey: ['adminPendingReports'],
    queryFn: () => base44.entities.Report.filter({ status: 'pending' }, '-created_date', 200),
    enabled: isAdmin,
    staleTime: 30000,
  });
  const { data: disputes = [] } = useQuery({
    queryKey: ['adminDisputes'],
    queryFn: () => base44.entities.Dispute.list('-created_date', 100),
    enabled: isAdmin,
  });
  const { data: newTickets = [] } = useQuery({
    queryKey: ['adminNewTicketsCount'],
    queryFn: () => base44.entities.SupportTicket.filter({ status: 'new' }, '-created_date', 200),
    enabled: isAdmin,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="w-5 h-5 border-2 border-violet-600/20 border-t-violet-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Accès restreint</h2>
          <p className="text-sm text-slate-500 mt-2">Cette page est réservée aux administrateurs ServiGo.</p>
        </div>
      </div>
    );
  }

  const openDisputes = disputes.filter(d => ['open', 'in_review'].includes(d.status)).length;
  const badges = {
    disputes: openDisputes || null,
    reports:  pendingReports.length || null,
    tickets:  newTickets.length || null,
  };
  const totalAlerts = (badges.disputes || 0) + (badges.reports || 0) + (badges.tickets || 0);

  const activeTab = TABS.find(t => t.key === tab);
  const initials = (currentUser?.full_name || currentUser?.email || 'A').slice(0, 2).toUpperCase();

  const handleTabChange = (key) => {
    setTab(key);
    setSidebarOpen(false);
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
            <Zap className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <p className="font-black text-sm text-slate-900 tracking-tight">ServiGo</p>
            <p className="text-[10px] text-slate-400 font-medium">Administration</p>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto space-y-5">
        {GROUPS.map(group => {
          const groupTabs = TABS.filter(t => t.group === group);
          return (
            <div key={group}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1.5">{group}</p>
              <div className="space-y-0.5">
                {groupTabs.map(({ key, label, icon: Icon }) => {
                  const badge = badges[key];
                  const isActive = tab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleTabChange(key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left ${
                        isActive
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 truncate">{label}</span>
                      {badge && (
                        <span className={`text-[10px] font-bold text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${
                          isActive ? 'bg-white/30' : BADGE_COLORS[key] || 'bg-slate-400'
                        }`}>
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-violet-700">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">{currentUser?.full_name || 'Admin'}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div
      className="fixed inset-0 flex bg-slate-50 overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* ── SIDEBAR DESKTOP ── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-slate-100 h-full">
        <SidebarContent />
      </aside>

      {/* ── DRAWER MOBILE ── */}
      {sidebarOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col shadow-2xl"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
              <span className="font-black text-sm text-slate-900">Menu</span>
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Fermer le menu"
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="shrink-0 h-14 bg-white border-b border-slate-100 flex items-center px-4 gap-3">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>

          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            {activeTab && (
              <>
                <activeTab.icon className="w-4 h-4 text-violet-600 shrink-0" />
                <h1 className="font-bold text-slate-900 text-[15px] truncate">{activeTab.label}</h1>
              </>
            )}
          </div>

          {/* Alert bell */}
          {totalAlerts > 0 && (
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50 cursor-pointer">
              <Bell className="w-4 h-4 text-amber-600" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {totalAlerts > 9 ? '9+' : totalAlerts}
              </span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
            <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-violet-700">{initials}</span>
            </div>
            <span className="text-xs font-semibold text-slate-600 max-w-[120px] truncate">
              {currentUser?.first_name || currentUser?.email?.split('@')[0] || 'Admin'}
            </span>
          </div>
        </header>

        {/* Content */}
        <main
          className="flex-1 overflow-y-auto px-4 md:px-6 pt-5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
        >
          <div className="max-w-5xl mx-auto">
            {tab === 'overview'     && <OverviewTab />}
            {tab === 'finance'      && <AdminFinanceTab />}
            {tab === 'documents'    && <AdminDocumentsTab />}
            {tab === 'disputes'     && <DisputesTab />}
            {tab === 'blacklist'    && <BlacklistTab />}
            {tab === 'reports'      && <ReportsTab />}
            {tab === 'tickets'      && <SupportTicketsTab />}
            {tab === 'dac7'         && <DAC7Tab />}
            {tab === 'independence' && <IndependenceTab />}
            {tab === 'email'        && <AdminEmailTab adminEmail={currentUser?.email} />}
          </div>
        </main>

        {/* ── BOTTOM NAV MOBILE ── */}
        <nav
          className="md:hidden shrink-0 bg-white border-t border-slate-100"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(({ key, label, icon: Icon }) => {
              const badge = badges[key];
              const isActive = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`relative flex-1 shrink-0 flex flex-col items-center gap-0.5 py-3 px-1 min-w-[52px] transition-colors cursor-pointer ${
                    isActive ? 'text-violet-600' : 'text-slate-400'
                  }`}
                >
                  <Icon style={{ width: 18, height: 18 }} />
                  <span className="text-[9px] font-semibold truncate w-full text-center">{label}</span>
                  {badge && (
                    <span className="absolute top-2 right-1/2 translate-x-2.5 text-[8px] font-bold text-white rounded-full w-3.5 h-3.5 flex items-center justify-center bg-red-500">
                      {badge}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-violet-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}