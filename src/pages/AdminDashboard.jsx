import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Navigate } from 'react-router-dom';
import {
  Activity, Euro, Receipt, AlertTriangle, Ban, Flag,
  Ticket, FileText, Shield, Mail, Menu, X, ChevronRight,
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
  { key: 'overview',     label: 'Aperçu',       icon: Activity,       color: 'text-blue-500' },
  { key: 'finance',      label: 'Finances',      icon: Euro,           color: 'text-green-500' },
  { key: 'documents',    label: 'Documents',     icon: Receipt,        color: 'text-indigo-500' },
  { key: 'disputes',     label: 'Litiges',       icon: AlertTriangle,  color: 'text-yellow-500' },
  { key: 'blacklist',    label: 'Blacklist',     icon: Ban,            color: 'text-red-500' },
  { key: 'reports',      label: 'Signalements',  icon: Flag,           color: 'text-orange-500' },
  { key: 'tickets',      label: 'Tickets SAV',   icon: Ticket,         color: 'text-purple-500' },
  { key: 'dac7',         label: 'DAC7',          icon: FileText,       color: 'text-teal-500' },
  { key: 'independence', label: 'Indépendance',  icon: Shield,         color: 'text-sky-500' },
  { key: 'email',        label: 'Email',         icon: Mail,           color: 'text-pink-500' },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: pendingReports = [] } = useQuery({
    queryKey: ['adminPendingReports'],
    queryFn: () => base44.entities.Report.filter({ status: 'pending' }, '-created_date', 200),
    enabled: currentUser?.role === 'admin',
    staleTime: 30000,
  });

  const { data: disputes = [] } = useQuery({
    queryKey: ['adminDisputes'],
    queryFn: () => base44.entities.Dispute.list('-created_date', 100),
    enabled: currentUser?.role === 'admin',
  });

  const { data: newTickets = [] } = useQuery({
    queryKey: ['adminNewTicketsCount'],
    queryFn: () => base44.entities.SupportTicket.filter({ status: 'new' }, '-created_date', 200),
    enabled: currentUser?.role === 'admin',
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-center px-6 bg-background">
        <div>
          <p className="text-4xl mb-3">🔒</p>
          <p className="text-lg font-bold">Accès administrateur requis</p>
          <p className="text-sm text-muted-foreground mt-1">Cette page est réservée aux administrateurs ServiGo.</p>
        </div>
      </div>
    );
  }

  const openDisputes = disputes.filter(d => d.status === 'open' || d.status === 'in_review').length;
  const badges = {
    disputes: openDisputes || null,
    reports:  pendingReports.length || null,
    tickets:  newTickets.length || null,
  };

  const activeTab = TABS.find(t => t.key === tab);

  const handleTabChange = (key) => {
    setTab(key);
    setSidebarOpen(false);
  };

  return (
    <div className="fixed inset-0 flex bg-background overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      {/* ── SIDEBAR DESKTOP ── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-card h-full overflow-y-auto">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-black text-sm tracking-tight">ServiGo</p>
              <p className="text-[10px] text-muted-foreground">Administration</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {TABS.map(({ key, label, icon: Icon, color }) => {
            const badge = badges[key];
            const isActive = tab === key;
            return (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary-foreground' : color}`} />
                <span className="flex-1 truncate">{label}</span>
                {badge && (
                  <span className={`text-[10px] font-bold text-white rounded-full min-w-5 h-5 flex items-center justify-center px-1 ${
                    isActive ? 'bg-white/30' : key === 'reports' ? 'bg-red-500' : key === 'disputes' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border shrink-0">
          <p className="text-[10px] text-muted-foreground text-center">Connecté : {currentUser?.email}</p>
        </div>
      </aside>

      {/* ── SIDEBAR MOBILE (drawer) ── */}
      {sidebarOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col overflow-y-auto"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className="px-4 py-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <p className="font-black text-sm">Admin ServiGo</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-0.5">
              {TABS.map(({ key, label, icon: Icon, color }) => {
                const badge = badges[key];
                const isActive = tab === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleTabChange(key)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                      isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary-foreground' : color}`} />
                    <span className="flex-1">{label}</span>
                    {badge && (
                      <span className={`text-[10px] font-bold text-white rounded-full min-w-5 h-5 flex items-center justify-center px-1 ${
                        isActive ? 'bg-white/30' : key === 'reports' ? 'bg-red-500' : key === 'disputes' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}>
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>
        </>
      )}

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top header */}
        <header className="shrink-0 h-14 border-b border-border bg-card flex items-center px-4 gap-3">
          {/* Hamburger mobile */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            {activeTab && (
              <>
                <activeTab.icon className={`w-4 h-4 shrink-0 ${activeTab.color}`} />
                <h1 className="font-bold text-base truncate">{activeTab.label}</h1>
                {badges[tab] && (
                  <span className={`text-[10px] font-bold text-white rounded-full px-2 py-0.5 ${
                    tab === 'reports' ? 'bg-red-500' : tab === 'disputes' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}>
                    {badges[tab]} en attente
                  </span>
                )}
              </>
            )}
          </div>

          <p className="hidden md:block text-xs text-muted-foreground shrink-0">
            {new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </header>

        {/* Tab content */}
        <main className="flex-1 overflow-y-auto px-4 pt-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>
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
          className="md:hidden shrink-0 border-t border-border bg-card flex overflow-x-auto"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)', scrollbarWidth: 'none' }}
        >
          {TABS.map(({ key, label, icon: Icon }) => {
            const badge = badges[key];
            const isActive = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative flex-1 shrink-0 flex flex-col items-center gap-0.5 py-2.5 px-1 text-[9px] font-semibold min-w-[52px] transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                <span className="truncate w-full text-center">{label}</span>
                {badge && (
                  <span className="absolute top-1.5 right-1/2 translate-x-3 text-[8px] font-bold text-white rounded-full w-3.5 h-3.5 flex items-center justify-center bg-red-500">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
                {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full" />}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}