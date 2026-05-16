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
  { key: 'overview', label: 'Aperçu', icon: Activity },
  { key: 'finance', label: 'Finances', icon: Euro },
  { key: 'documents', label: 'Docs', icon: Receipt },
  { key: 'disputes', label: 'Litiges', icon: AlertTriangle },
  { key: 'blacklist', label: 'Blacklist', icon: Ban },
  { key: 'reports', label: 'Rapports', icon: Flag },
  { key: 'tickets', label: 'Tickets', icon: Ticket },
  { key: 'dac7', label: 'DAC7', icon: FileText },
  { key: 'independence', label: 'Indép.', icon: Shield },
  { key: 'email', label: 'Email', icon: Mail },
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

  // Auto-réassignation déplacée dans OverviewTab (bouton manuel) → supprime les race conditions

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-center px-6">
        <div><p className="text-2xl mb-2">🔒</p><p className="font-semibold">Accès réservé aux administrateurs</p></div>
      </div>
    );
  }

  const openDisputes = disputes.filter(d => d.status === 'open' || d.status === 'in_review').length;

  return (
    <div className="fixed inset-0 overflow-y-auto bg-background">
      <div className="px-4 pt-6 pb-20 w-full md:max-w-2xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight">Admin · Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Vue globale de la plateforme</p>
        </div>

        <div className="grid grid-cols-4 gap-1.5 mb-5">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[11px] font-medium border transition-colors ${
                tab === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-center leading-tight">{label}</span>
              {key === 'disputes' && openDisputes > 0 && (
                <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-yellow-500 text-white rounded-full w-4 h-4 flex items-center justify-center">{openDisputes}</span>
              )}
              {key === 'reports' && pendingReports.length > 0 && (
                <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">{pendingReports.length}</span>
              )}
              {key === 'tickets' && newTickets.length > 0 && (
                <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center">{newTickets.length > 9 ? '9+' : newTickets.length}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab />}
        {tab === 'finance' && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Onglet finances en développement</p>
          </div>
        )}
        {tab === 'documents' && <AdminDocumentsTab />}
        {tab === 'disputes' && <DisputesTab />}
        {tab === 'blacklist' && <BlacklistTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'tickets' && <SupportTicketsTab />}
        {tab === 'dac7' && <DAC7Tab />}
        {tab === 'independence' && <IndependenceTab />}
        {tab === 'email' && (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-5 text-center space-y-3">
              <Mail className="w-10 h-10 mx-auto text-primary opacity-70" />
              <p className="font-semibold">Test d'envoi d'email</p>
              <p className="text-sm text-muted-foreground">Envoyez un email de test pour vérifier la configuration.</p>
              <button onClick={() => window.location.href = '/AdminTestEmail'} className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl text-sm">
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
