import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Euro, AlertTriangle, Ban, Activity, Flag, Ticket, FileText, Shield, Mail, Receipt } from 'lucide-react';

import OverviewTab from '@/components/admin/OverviewTab';
import DisputesTab from '@/components/admin/DisputesTab';
import BlacklistTab from '@/components/admin/BlacklistTab';
import AdminDocumentsTab from '@/components/admin/AdminDocumentsTab';
import ReportsTab from '@/components/admin/ReportsTab';
import SupportTicketsTab from '@/components/admin/SupportTicketsTab';
import DAC7Tab from '@/components/admin/DAC7Tab';
import IndependenceTab from '@/components/admin/IndependenceTab';

const TABS = [
  { key: 'overview',     label: 'Aperçu',      icon: Activity },
  { key: 'finance',      label: 'Finances',     icon: Euro },
  { key: 'documents',    label: 'Documents',    icon: Receipt },
  { key: 'disputes',     label: 'Litiges',      icon: AlertTriangle },
  { key: 'blacklist',    label: 'Blacklist',    icon: Ban },
  { key: 'reports',      label: 'Rapports',     icon: Flag },
  { key: 'tickets',      label: 'Tickets',      icon: Ticket },
  { key: 'dac7',         label: 'DAC7',         icon: FileText },
  { key: 'independence', label: 'Indépendance', icon: Shield },
  { key: 'email',        label: 'Email',        icon: Mail },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');

  const { data: currentUser } = useQuery({
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

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-center px-6">
        <div><p className="text-2xl mb-2">🔒</p><p className="font-semibold">Accès réservé aux administrateurs</p></div>
      </div>
    );
  }

  const openDisputes = disputes.filter(d => d.status === 'open' || d.status === 'in_review').length;

  const badges = {
    disputes:     openDisputes > 0 ? openDisputes : null,
    reports:      pendingReports.length > 0 ? pendingReports.length : null,
    tickets:      newTickets.length > 0 ? (newTickets.length > 9 ? '9+' : newTickets.length) : null,
  };

  const badgeColor = {
    disputes: 'bg-yellow-500',
    reports:  'bg-red-500',
    tickets:  'bg-blue-500',
  };

  return (
    <div
      className="flex flex-col bg-background"
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight">Administration</h1>
            <p className="text-xs text-muted-foreground mt-0.5">ServiGo · Panel admin</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Tab bar — horizontal scroll */}
      <div
        className="shrink-0 flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-2"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {TABS.map(({ key, label, icon: Icon }) => {
          const badge = badges[key];
          const isActive = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="relative shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
              style={isActive
                ? { background: 'hsl(var(--primary))', color: 'white' }
                : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
              }
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
              {badge && (
                <span className={`absolute -top-1 -right-1 text-[9px] font-bold text-white rounded-full w-4 h-4 flex items-center justify-center ${badgeColor[key] || 'bg-gray-500'}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content — scrollable */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
      >
        {tab === 'overview'     && <OverviewTab />}
        {tab === 'documents'    && <AdminDocumentsTab />}
        {tab === 'disputes'     && <DisputesTab />}
        {tab === 'blacklist'    && <BlacklistTab />}
        {tab === 'reports'      && <ReportsTab />}
        {tab === 'tickets'      && <SupportTicketsTab />}
        {tab === 'dac7'         && <DAC7Tab />}
        {tab === 'independence' && <IndependenceTab />}

        {tab === 'finance' && (
          <div className="text-center py-12 text-muted-foreground">
            <Euro className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Onglet finances en développement</p>
          </div>
        )}

        {tab === 'email' && (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-5 text-center space-y-3">
              <Mail className="w-10 h-10 mx-auto text-primary opacity-70" />
              <p className="font-semibold">Test d'envoi d'email</p>
              <p className="text-sm text-muted-foreground">Envoyez un email de test pour vérifier la configuration.</p>
              <button
                onClick={() => window.location.href = '/AdminTestEmail'}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl text-sm"
              >
                <Mail className="w-4 h-4" /> Ouvrir le test email
              </button>
            </div>
            <div className="bg-muted/40 rounded-xl border border-border p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Automations actives</p>
              {[
                '✅ Nouvelle demande client → Email de confirmation',
                '🎉 Mission acceptée → Email au client',
                '📝 Contrat créé → Invitation à signer',
                '🚀 Abonnement Pro actif → Email de bienvenue',
              ].map((item, i) => (
                <p key={i} className="text-sm text-foreground">{item}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
