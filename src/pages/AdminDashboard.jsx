import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Euro, TrendingUp, AlertTriangle, Ban, CheckCircle, XCircle, BarChart2, Users, Clock, ChevronDown, ChevronUp, Activity, Flag } from 'lucide-react';
import { formatPrice, formatDateFr } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TABS = [
  { key: 'overview', label: 'Vue d\'ensemble', icon: Activity },
  { key: 'finance', label: 'Finances', icon: Euro },
  { key: 'disputes', label: 'Litiges', icon: AlertTriangle },
  { key: 'blacklist', label: 'Blacklist', icon: Ban },
  { key: 'reports', label: 'Signalements', icon: Flag },
];

const REASON_LABELS = {
  comportement_agressif: 'Comportement agressif',
  arnaque: 'Arnaque',
  no_show: 'No-show',
  travail_non_conforme: 'Travail non conforme',
  fausse_identite: 'Fausse identité',
  harcelement: 'Harcèlement',
  danger_securite: 'Danger sécurité',
  autre: 'Autre',
};

const PRIORITY_CONFIG = {
  low: { label: 'Faible', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Moyen', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'Haut', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
};

const REPORT_STATUS = [
  { value: 'all', label: 'Tous' },
  { value: 'pending', label: 'En attente' },
  { value: 'under_review', label: 'En examen' },
  { value: 'resolved_warning', label: 'Avertissement' },
  { value: 'resolved_banned', label: 'Banni' },
  { value: 'dismissed', label: 'Rejeté' },
];

function ReportsTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['adminReports'],
    queryFn: () => base44.entities.Report.list('-created_date', 200),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, report }) => {
      await base44.entities.Report.update(id, data);
      if (data.user_suspended) {
        const users = await base44.entities.User.filter({ email: report.reported_user_email }, '-created_date', 1);
        if (users.length > 0) await base44.entities.User.update(users[0].id, { is_blacklisted: true, blacklist_reason: `Banni suite signalement: ${REASON_LABELS[report.reason] || report.reason}` });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      toast.success('Signalement mis à jour');
    },
  });

  const filtered = statusFilter === 'all' ? reports : reports.filter(r => r.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {REPORT_STATUS.map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${statusFilter === s.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}>
            {s.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <Flag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun signalement</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const priority = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.medium;
            return (
              <div key={r.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{r.reported_user_name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.reported_user_type === 'professionnel' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {r.reported_user_type === 'professionnel' ? 'Pro' : 'Client'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{r.reported_user_email}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-medium text-foreground">{REASON_LABELS[r.reason] || r.reason}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priority.color}`}>{priority.label}</span>
                    </div>
                  </div>
                </div>
                {r.description && <p className="text-xs text-muted-foreground leading-relaxed">{r.description}</p>}
                <div className="flex flex-wrap gap-2">
                  {r.status !== 'under_review' && (
                    <button onClick={() => updateMutation.mutate({ id: r.id, data: { status: 'under_review' }, report: r })}
                      className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 bg-blue-50 font-medium">En examen</button>
                  )}
                  <button onClick={() => updateMutation.mutate({ id: r.id, data: { status: 'resolved_warning', user_suspended: false }, report: r })}
                    className="text-xs px-3 py-1.5 rounded-lg border border-yellow-200 text-yellow-700 bg-yellow-50 font-medium">Avertissement</button>
                  <button onClick={() => updateMutation.mutate({ id: r.id, data: { status: 'resolved_banned', user_suspended: true }, report: r })}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-700 bg-red-50 font-medium">Bannir</button>
                  <button onClick={() => updateMutation.mutate({ id: r.id, data: { status: 'dismissed' }, report: r })}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground bg-muted font-medium">Rejeter</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const queryClient = useQueryClient();
  const { data: allUsers = [] } = useQuery({ queryKey: ['adminUsers'], queryFn: () => base44.entities.User.list('-created_date', 500) });
  const { data: allSubs = [] } = useQuery({ queryKey: ['adminSubs'], queryFn: () => base44.entities.ProSubscription.list('-created_date', 200) });
  const { data: allRequests = [] } = useQuery({ queryKey: ['adminAllRequestsOv'], queryFn: () => base44.entities.ServiceRequestV2.list('-created_date', 500) });
  const { data: allDisputes = [] } = useQuery({ queryKey: ['adminDisputesOv'], queryFn: () => base44.entities.Dispute.list('-created_date', 100) });

  // Auto-expire past subscriptions
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    allSubs.forEach(s => {
      if (s.status === 'active' && s.renewal_date && s.renewal_date < today) {
        base44.entities.ProSubscription.update(s.id, { status: 'expired' }).catch(() => {});
      }
    });
  }, [allSubs]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = now.toISOString().split('T')[0];

  const activeSubs = allSubs.filter(s => s.status === 'active' || s.status === 'trial');
  const expiredSubs = allSubs.filter(s => s.status === 'expired' && s.renewal_date && s.renewal_date < today);
  const ongoingMissions = allRequests.filter(r => !['completed', 'cancelled'].includes(r.status));
  const completedThisMonth = allRequests.filter(r => r.status === 'completed' && r.updated_date && new Date(r.updated_date) >= monthStart);
  const monthRevenue = activeSubs.length * 10;
  const openDisputes = allDisputes.filter(d => ['open', 'in_review'].includes(d.status));
  const lastUsers = allUsers.slice(0, 5);
  const lastRequests = allRequests.slice(0, 5);

  const kpis = [
    { label: 'Utilisateurs inscrits', value: allUsers.length, icon: Users, color: 'text-blue-600' },
    { label: 'Abonnements actifs', value: activeSubs.length, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Abonnements expirés', value: expiredSubs.length, icon: AlertTriangle, color: 'text-red-500' },
    { label: 'Missions en cours', value: ongoingMissions.length, icon: Activity, color: 'text-orange-600' },
    { label: 'Terminées ce mois', value: completedThisMonth.length, icon: TrendingUp, color: 'text-purple-600' },
    { label: 'Revenus abonnements', value: `${monthRevenue} €`, icon: Euro, color: 'text-green-700' },
    { label: 'Litiges ouverts', value: openDisputes.length, icon: AlertTriangle, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-4">
      {/* Expired subscriptions alert */}
      {expiredSubs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-700">{expiredSubs.length} abonnement{expiredSubs.length !== 1 ? 's' : ''} expiré{expiredSubs.length !== 1 ? 's' : ''}</h3>
          </div>
          <div className="space-y-1.5">
            {expiredSubs.slice(0, 5).map(s => (
              <p key={s.id} className="text-xs text-red-600">
                <span className="font-medium">{s.professional_name}</span> — Date d'expiration : {s.renewal_date}
              </p>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`w-3.5 h-3.5 ${color}`} strokeWidth={1.8} />
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
            </div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <p className="text-xs font-semibold text-muted-foreground px-4 py-3 border-b border-border">Dernières inscriptions</p>
        {lastUsers.map((u, i) => (
          <div key={u.id} className={`flex items-center gap-3 px-4 py-3 ${i < lastUsers.length - 1 ? 'border-b border-border/50' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{(u.full_name || u.email || '?')[0].toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : (u.full_name || u.email)}</p>
              <p className="text-xs text-muted-foreground">{u.user_type || 'user'} · {formatDateFr(u.created_date)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <p className="text-xs font-semibold text-muted-foreground px-4 py-3 border-b border-border">Dernières missions</p>
        {lastRequests.map((r, i) => (
          <div key={r.id} className={`flex items-center gap-3 px-4 py-3 ${i < lastRequests.length - 1 ? 'border-b border-border/50' : ''}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{r.category_name}</p>
              <p className="text-xs text-muted-foreground truncate">{r.customer_name || r.customer_email} · {formatDateFr(r.created_date)}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
              r.status === 'completed' ? 'bg-green-100 text-green-700' :
              r.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
              'bg-blue-100 text-blue-700'
            }`}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DISPUTE_STATUS = {
  open: { label: 'Ouvert', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  in_review: { label: 'En cours', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  resolved_customer: { label: 'Résolu (client)', color: 'bg-green-100 text-green-700 border-green-200' },
  resolved_pro: { label: 'Résolu (pro)', color: 'bg-green-100 text-green-700 border-green-200' },
  closed: { label: 'Fermé', color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

// ─── Finance Tab ─────────────────────────────────────────────────────────────
function FinanceTab() {
  const [period, setPeriod] = useState('all');

  const { data: requests = [] } = useQuery({
    queryKey: ['adminAllRequests'],
    queryFn: () => base44.entities.ServiceRequestV2.list('-created_date', 500),
  });

  const stats = useMemo(() => {
    const now = new Date();
    let filtered = requests.filter(r => ['accepted', 'completed', 'in_progress'].includes(r.status));

    if (period === 'week') {
      const since = new Date(now - 7 * 86400000);
      filtered = filtered.filter(r => r.created_date && new Date(r.created_date) >= since);
    } else if (period === 'month') {
      const since = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(r => r.created_date && new Date(r.created_date) >= since);
    }

    const ca = filtered.reduce((s, r) => s + (r.total_price || 0), 0);
    const commission = filtered.reduce((s, r) => s + (r.commission || (r.base_price || 0) * 0.10), 0);
    const tva = filtered.reduce((s, r) => {
      const base = (r.base_price || 0) + (r.commission || (r.base_price || 0) * 0.10);
      return s + base * 0.21;
    }, 0);
    const proRevenue = filtered.reduce((s, r) => s + (r.base_price || 0), 0);

    return { ca, commission, tva, proRevenue, count: filtered.length };
  }, [requests, period]);

  // Last 6 months breakdown
  const monthlyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - 4 + i, 1);
      const jobs = requests.filter(r =>
        ['accepted', 'completed', 'in_progress'].includes(r.status) &&
        r.created_date && new Date(r.created_date) >= m && new Date(r.created_date) < mEnd
      );
      return {
        label: format(m, 'MMM', { locale: fr }),
        ca: jobs.reduce((s, r) => s + (r.total_price || 0), 0),
        commission: jobs.reduce((s, r) => s + (r.commission || (r.base_price || 0) * 0.10), 0),
        count: jobs.length,
      };
    });
  }, [requests]);

  const maxCa = Math.max(...monthlyData.map(m => m.ca), 1);

  return (
    <div className="space-y-4">
      {/* Period filter */}
      <div className="flex gap-2">
        {[['all', 'Tout'], ['week', '7 jours'], ['month', 'Ce mois']].map((item) => (
          <button key={item[0]} onClick={() => setPeriod(item[0])}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${period === item[0] ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}>
            {item[1]}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'CA total TTC', value: `${stats.ca.toFixed(0)} €`, icon: TrendingUp, color: 'text-foreground' },
          { label: 'Commissions (10%)', value: `${stats.commission.toFixed(0)} €`, icon: Euro, color: 'text-blue-600' },
          { label: 'TVA collectée (21%)', value: `${stats.tva.toFixed(0)} €`, icon: BarChart2, color: 'text-orange-600' },
          { label: 'Missions payées', value: stats.count, icon: CheckCircle, color: 'text-green-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`w-3.5 h-3.5 ${color}`} strokeWidth={1.8} />
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
            </div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* Monthly bar chart */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <p className="text-xs font-semibold text-muted-foreground mb-4">CA mensuel (6 derniers mois)</p>
        <div className="flex items-end gap-2 h-32">
          {monthlyData.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              <p className="text-[10px] text-muted-foreground">{m.ca > 0 ? `${m.ca.toFixed(0)}€` : ''}</p>
              <div className="w-full bg-muted rounded-t-md" style={{ height: `${(m.ca / maxCa) * 80}px`, minHeight: m.ca > 0 ? 4 : 0 }} />
              <p className="text-[10px] font-medium capitalize">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Commission table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-4 px-4 py-2.5 border-b border-border bg-muted/50">
          {['Mois', 'CA', 'Comm.', 'Missions'].map(h => (
            <p key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right first:text-left">{h}</p>
          ))}
        </div>
        {monthlyData.map((m, i) => (
          <div key={i} className={`grid grid-cols-4 px-4 py-2.5 ${i < 5 ? 'border-b border-border/50' : ''}`}>
            <p className="text-sm font-medium capitalize">{m.label}</p>
            <p className="text-sm text-right">{m.ca.toFixed(0)} €</p>
            <p className="text-sm text-right text-blue-600 font-medium">{m.commission.toFixed(0)} €</p>
            <p className="text-sm text-right">{m.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Disputes Tab ─────────────────────────────────────────────────────────────
function DisputesTab() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [adminNote, setAdminNote] = useState({});

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['adminDisputes'],
    queryFn: () => base44.entities.Dispute.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, dispute }) => {
      await base44.entities.Dispute.update(id, data);
      const isResolved = data.status?.startsWith('resolved');
      if (isResolved && dispute) {
        const inFavorOf = data.status === 'resolved_customer' ? 'client' : 'professionnel';
        const msg = `Votre litige a été résolu en faveur du ${inFavorOf}. ${data.admin_note ? 'Note : ' + data.admin_note : ''}`;
        await Promise.all([
          dispute.customer_email && base44.entities.Notification.create({
            recipient_email: dispute.customer_email, recipient_type: 'particulier',
            type: 'dispute_resolved', title: 'Litige résolu', body: msg,
            request_id: dispute.request_id, action_url: `/Chat?requestId=${dispute.request_id}`,
          }),
          dispute.professional_email && base44.entities.Notification.create({
            recipient_email: dispute.professional_email, recipient_type: 'professionnel',
            type: 'dispute_resolved', title: 'Litige résolu', body: msg,
            request_id: dispute.request_id, action_url: `/Chat?requestId=${dispute.request_id}`,
          }),
        ].filter(Boolean));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDisputes'] });
      toast.success('Litige mis à jour');
    },
  });

  const openCount = disputes.filter(d => d.status === 'open' || d.status === 'in_review').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">{disputes.length} litige{disputes.length !== 1 ? 's' : ''}</p>
        {openCount > 0 && <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200 text-xs">{openCount} ouvert{openCount !== 1 ? 's' : ''}</Badge>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun litige en cours</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map(d => {
            const s = DISPUTE_STATUS[d.status] || DISPUTE_STATUS.open;
            const isOpen = expanded === d.id;
            return (
              <motion.div key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-border overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : d.id)}
                  className="w-full text-left p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{d.reason}</p>
                      <Badge className={`${s.color} border text-xs shrink-0`}>{s.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{d.customer_name} vs {d.professional_name}</p>
                    {d.amount_disputed > 0 && <p className="text-xs text-muted-foreground">{d.amount_disputed} € en litige</p>}
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                    {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}

                    {/* Note admin */}
                    <textarea
                      rows={2}
                      value={adminNote[d.id] ?? d.admin_note ?? ''}
                      onChange={e => setAdminNote(n => ({ ...n, [d.id]: e.target.value }))}
                      placeholder="Note interne (visible admin uniquement)..."
                      className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-muted/40 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    />

                    {/* Status actions */}
                    <div className="flex flex-wrap gap-2">
                      {d.status !== 'in_review' && (
                        <button onClick={() => updateMutation.mutate({ id: d.id, data: { status: 'in_review', admin_note: adminNote[d.id] ?? d.admin_note }, dispute: d })}
                          className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 bg-blue-50 font-medium">
                          Prendre en charge
                        </button>
                      )}
                      <button onClick={() => updateMutation.mutate({ id: d.id, data: { status: 'resolved_customer', admin_note: adminNote[d.id] ?? d.admin_note }, dispute: d })}
                        className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-700 bg-green-50 font-medium">
                        Résolu → Client
                      </button>
                      <button onClick={() => updateMutation.mutate({ id: d.id, data: { status: 'resolved_pro', admin_note: adminNote[d.id] ?? d.admin_note }, dispute: d })}
                        className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-700 bg-green-50 font-medium">
                        Résolu → Pro
                      </button>
                      <button onClick={() => updateMutation.mutate({ id: d.id, data: { status: 'closed', admin_note: adminNote[d.id] ?? d.admin_note }, dispute: d })}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground bg-muted font-medium">
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Blacklist Tab ────────────────────────────────────────────────────────────
function BlacklistTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState({});

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['adminAllUsers'],
    queryFn: () => base44.entities.User.list('-created_date', 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAllUsers'] });
      toast.success('Utilisateur mis à jour');
    },
  });

  const blacklisted = users.filter(u => u.is_blacklisted);
  const filtered = users.filter(u =>
    !u.is_blacklisted &&
    (u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Blacklisted users */}
      {blacklisted.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Ban className="w-4 h-4 text-destructive" /> Utilisateurs bloqués ({blacklisted.length})
          </p>
          <div className="space-y-2">
            {blacklisted.map(u => (
              <div key={u.id} className="bg-card rounded-xl border border-destructive/30 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 text-sm font-bold text-destructive">
                  {u.full_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  {u.blacklist_reason && <p className="text-xs text-destructive mt-0.5 truncate">Motif : {u.blacklist_reason}</p>}
                </div>
                <button
                  onClick={() => updateMutation.mutate({ id: u.id, data: { is_blacklisted: false, blacklist_reason: '' } })}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-muted text-foreground font-medium shrink-0"
                >
                  Débloquer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search to add to blacklist */}
      <div>
        <p className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> Tous les utilisateurs
        </p>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring mb-3"
        />
        {search.length > 1 && (
          <div className="space-y-2">
            {filtered.slice(0, 10).map(u => (
              <div key={u.id} className="bg-card rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-bold">
                    {u.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.email} · {u.user_type || 'user'}</p>
                  </div>
                </div>
                <input
                  value={reason[u.id] || ''}
                  onChange={e => setReason(r => ({ ...r, [u.id]: e.target.value }))}
                  placeholder="Motif du blocage..."
                  className="w-full h-9 px-3 rounded-lg border border-border bg-muted/40 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={() => {
                    if (!reason[u.id]?.trim()) { toast.error('Indiquez un motif'); return; }
                    updateMutation.mutate({ id: u.id, data: { is_blacklisted: true, blacklist_reason: reason[u.id] } });
                    setReason(r => ({ ...r, [u.id]: '' }));
                    setSearch('');
                  }}
                  className="w-full text-xs py-2 rounded-lg bg-destructive text-white font-semibold"
                >
                  <Ban className="w-3 h-3 inline mr-1" /> Blacklister cet utilisateur
                </button>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucun résultat</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const { data: pendingReports = [] } = useQuery({
    queryKey: ['adminPendingReports'],
    queryFn: () => base44.entities.Report.filter({ status: 'pending' }, '-created_date', 200),
    enabled: true,
    staleTime: 30000,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Auto-réassignation des missions bloquées au chargement admin
  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    (async () => {
      try {
        // Fix ciblé : mission jardinier Thomas Verhaegen bloquée
        const STUCK_MISSION_ID = '69ca434ee96d5155ac7c6612';
        const GUILLAUME_ID = '69c3c465524bb57e83e1fed0';
        try {
          const missions = await base44.entities.ServiceRequestV2.filter({ id: STUCK_MISSION_ID });
          const stuck = missions[0];
          if (stuck && stuck.status === 'searching') {
            await base44.entities.ServiceRequestV2.update(STUCK_MISSION_ID, {
              status: 'pending_pro',
              professional_id: GUILLAUME_ID,
              professional_name: 'Guillaume Maes',
              professional_email: 'guillaume.maes@pro.be',
              tried_professionals: [...(stuck.tried_professionals || []), 'guillaume.maes@pro.be'],
            });
            await base44.entities.Notification.create({
              recipient_email: 'guillaume.maes@pro.be',
              recipient_type: 'professionnel',
              type: 'new_mission',
              title: `Nouvelle mission : ${stuck.category_name}`,
              body: `Une mission vous a été assignée. Client : ${stuck.customer_name || stuck.customer_email}.`,
              request_id: STUCK_MISSION_ID,
              action_url: `/Chat?requestId=${STUCK_MISSION_ID}`,
            });
          }
        } catch (e) { console.warn('Fix mission spécifique:', e); }

        const stuckRequests = await base44.entities.ServiceRequestV2.filter({ status: 'searching' }, '-created_date', 100);
        if (stuckRequests.length === 0) return;
        const availablePros = await base44.entities.User.filter({ user_type: 'professionnel', available: true, verification_status: 'verified' }, '-created_date', 200);
        for (const req of stuckRequests) {
          const tried = req.tried_professionals || [];
          const eligible = availablePros.filter(p =>
            p.email && p.category_name === req.category_name && !tried.includes(p.email)
          ).sort((a, b) => (b.rating || 0) - (a.rating || 0));
          if (eligible.length === 0) continue;
          const best = eligible[0];
          await base44.entities.ServiceRequestV2.update(req.id, {
            status: 'pending_pro',
            professional_id: best.id,
            professional_name: best.full_name,
            professional_email: best.email,
            tried_professionals: [...tried, best.email],
          });
          await base44.entities.Notification.create({
            recipient_email: best.email,
            recipient_type: 'professionnel',
            type: 'new_mission',
            title: `Nouvelle mission : ${req.category_name}`,
            body: `Une mission vous a été assignée. Client : ${req.customer_name || req.customer_email}.`,
            request_id: req.id,
            action_url: `/Chat?requestId=${req.id}`,
          });
        }
      } catch (e) {
        console.warn('Auto-reassign error:', e);
      }
    })();
  }, [currentUser?.role]);

  const { data: disputes = [] } = useQuery({
    queryKey: ['adminDisputes'],
    queryFn: () => base44.entities.Dispute.list('-created_date', 100),
    enabled: currentUser?.role === 'admin',
  });

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
    <div className="px-4 pt-6 pb-20 max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Admin · Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Vue globale de la plateforme</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              tab === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            {key === 'disputes' && openDisputes > 0 && (
              <span className="text-xs font-bold bg-yellow-500 text-white rounded-full px-1.5">{openDisputes}</span>
            )}
            {key === 'reports' && pendingReports.length > 0 && (
              <span className="text-xs font-bold bg-red-500 text-white rounded-full px-1.5">{pendingReports.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'finance' && <FinanceTab />}
      {tab === 'disputes' && <DisputesTab />}
      {tab === 'blacklist' && <BlacklistTab />}
      {tab === 'reports' && <ReportsTab />}
    </div>
    </div>
  );
}