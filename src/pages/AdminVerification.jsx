import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, CheckCircle, XCircle, FileText, User, BarChart2, TrendingUp, Euro, CreditCard, AlertTriangle, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'pending', label: 'En attente' },
  { value: 'verified', label: 'Vérifiés' },
  { value: 'rejected', label: 'Refusés' },
];

const DOCS = [
  { key: 'id_card_url', label: "Carte d'identité" },
  { key: 'insurance_url', label: "Assurance RC" },
  { key: 'onss_url', label: "ONSS / Indépendant" },
];

function DocLink({ url, label }) {
  if (!url) return <span className="text-xs text-muted-foreground italic">Non fourni</span>;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"><FileText className="w-3 h-3" />{label}</a>;
}

function ProCard({ pro, onApprove, onReject, isPending }) {
  const [expanded, setExpanded] = useState(false);
  const statusBadge = {
    pending: <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 border text-xs">⏳ En attente</Badge>,
    verified: <Badge className="bg-green-100 text-green-700 border-green-200 border text-xs">✓ Vérifié</Badge>,
    rejected: <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs">✗ Refusé</Badge>,
  }[pro.verification_status] || <Badge variant="secondary" className="text-xs">Sans statut</Badge>;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden font-bold text-primary text-lg">
            {pro.photo_url ? <img src={pro.photo_url} alt="" className="w-full h-full object-cover" /> : <User className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{pro.full_name}</p>
            <p className="text-xs text-muted-foreground">{pro.email}</p>
            <p className="text-xs text-muted-foreground">{pro.category_name || '—'}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {statusBadge}
          <button onClick={() => setExpanded(e => !e)} className="text-xs text-primary underline underline-offset-2">{expanded ? 'Réduire' : 'Voir documents'}</button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
          <div className="grid grid-cols-1 gap-2">
            {DOCS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <DocLink url={pro[key]} label="Ouvrir" />
              </div>
            ))}
          </div>
          {pro.verification_status !== 'verified' && (
            <div className="flex gap-2 pt-1">
              <Button onClick={() => onApprove(pro.id)} disabled={isPending} className="flex-1 h-10 rounded-xl bg-green-600 hover:bg-green-700 text-sm"><CheckCircle className="w-4 h-4 mr-1" />Approuver</Button>
              {pro.verification_status !== 'rejected' && (
                <Button onClick={() => onReject(pro.id)} disabled={isPending} variant="outline" className="flex-1 h-10 rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-sm"><XCircle className="w-4 h-4 mr-1" />Refuser</Button>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ProStatsTable({ pros }) {
  const { data: allRequests = [] } = useQuery({
    queryKey: ['allRequestsAdmin'],
    queryFn: () => base44.entities.ServiceRequestV2.list('-created_date', 500),
  });
  const stats = useMemo(() => pros.map(pro => {
    const jobs = allRequests.filter(r => r.professional_email === pro.email && ['accepted', 'completed', 'in_progress'].includes(r.status));
    return { ...pro, missions: jobs.length, revenue: jobs.reduce((s, j) => s + (j.base_price || 0), 0) };
  }).sort((a, b) => b.missions - a.missions), [pros, allRequests]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl p-4 border border-border"><p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />Total missions</p><p className="text-3xl font-bold">{stats.reduce((s, p) => s + p.missions, 0)}</p></div>
        <div className="bg-card rounded-xl p-4 border border-border"><p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Euro className="w-3.5 h-3.5" />Revenus estimés</p><p className="text-3xl font-bold">{stats.reduce((s, p) => s + p.revenue, 0).toFixed(0)} €</p></div>
      </div>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-10 px-4 py-2.5 border-b border-border bg-muted/50">
          <p className="col-span-5 text-xs font-semibold text-muted-foreground uppercase">Professionnel</p>
          <p className="col-span-2 text-xs font-semibold text-muted-foreground uppercase text-center">Missions</p>
          <p className="col-span-3 text-xs font-semibold text-muted-foreground uppercase text-right">Revenus</p>
        </div>
        {stats.map((pro, i) => (
          <div key={pro.id} className={`grid grid-cols-10 px-4 py-3 items-center ${i < stats.length - 1 ? 'border-b border-border/50' : ''}`}>
            <div className="col-span-5 flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold overflow-hidden">{pro.photo_url ? <img src={pro.photo_url} alt="" className="w-full h-full object-cover" /> : (pro.full_name?.[0] || '?')}</div>
              <div className="min-w-0"><p className="text-sm font-medium truncate">{pro.full_name}</p><p className="text-[10px] text-muted-foreground truncate">{pro.category_name || '—'}</p></div>
            </div>
            <div className="col-span-2 text-center"><span className="text-sm font-bold">{pro.missions}</span></div>
            <div className="col-span-3 text-right"><span className="text-sm font-semibold">{pro.revenue.toFixed(0)} €</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubscriptionsTab() {
  const queryClient = useQueryClient();
  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['allSubscriptions'],
    queryFn: () => base44.entities.ProSubscription.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ProSubscription.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['allSubscriptions'] }); toast.success('Statut mis à jour.'); },
  });

  const subColors = { active: 'bg-green-100 text-green-700', trial: 'bg-blue-100 text-blue-700', expired: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-600', pending_payment: 'bg-orange-100 text-orange-700' };
  const activeCount = subs.filter(s => s.status === 'active' || s.status === 'trial').length;
  const revenue = activeCount * 10;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl p-4 border border-border"><p className="text-xs text-muted-foreground mb-1">Abonnements actifs</p><p className="text-3xl font-bold text-brand-green">{activeCount}</p></div>
        <div className="bg-card rounded-xl p-4 border border-border"><p className="text-xs text-muted-foreground mb-1">Revenus mensuels</p><p className="text-3xl font-bold">{revenue} €</p></div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : subs.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground"><CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Aucun abonnement</p></div>
      ) : (
        <div className="space-y-3">
          {subs.map(sub => (
            <div key={sub.id} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">{sub.professional_name}</p>
                  <p className="text-xs text-muted-foreground">{sub.professional_email}</p>
                  {sub.renewal_date && <p className="text-xs text-muted-foreground">Renouvellement : {sub.renewal_date}</p>}
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${subColors[sub.status] || 'bg-gray-100 text-gray-600'}`}>{sub.status}</span>
              </div>
              <div className="flex gap-2">
                {sub.status !== 'active' && <Button size="sm" onClick={() => updateMutation.mutate({ id: sub.id, status: 'active' })} className="flex-1 h-8 rounded-xl text-xs bg-green-600 hover:bg-green-700">Activer</Button>}
                {sub.status === 'active' && <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: sub.id, status: 'expired' })} className="flex-1 h-8 rounded-xl text-xs border-red-200 text-red-600">Expirer</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IdentityVerifTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('pending_review');
  const [expanded, setExpanded] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: verifs = [], isLoading } = useQuery({
    queryKey: ['allIdentityVerifs'],
    queryFn: () => base44.entities.IdentityVerification.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, reason, userEmail, userName }) => {
      await base44.entities.IdentityVerification.update(id, { status, rejection_reason: reason || null });
      const eidStatus = status === 'approved' ? 'verified' : 'rejected';
      const users = await base44.entities.User.filter({ contact_email: userEmail });
      if (users[0]) await base44.entities.User.update(users[0].id, { eid_status: eidStatus, verification_status: status === 'approved' ? 'verified' : 'rejected' });
      await base44.integrations.Core.SendEmail({
        to: userEmail,
        subject: status === 'approved' ? '✅ Identité vérifiée — ServiGo' : '❌ Vérification refusée — ServiGo',
        body: status === 'approved'
          ? `Bonjour ${userName},\n\nVotre identité a été vérifiée avec succès. Vous pouvez maintenant accéder à toutes les fonctionnalités ServiGo.\n\nL'équipe ServiGo`
          : `Bonjour ${userName},\n\nVotre vérification d'identité a été refusée.\nRaison : ${reason}\n\nVeuillez soumettre à nouveau vos documents.\n\nL'équipe ServiGo`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allIdentityVerifs'] });
      setExpanded(null);
      setRejectReason('');
      toast.success('Dossier mis à jour.');
    },
  });

  const filters = [{ v: 'pending_review', l: 'En attente' }, { v: 'approved', l: 'Approuvés' }, { v: 'rejected', l: 'Refusés' }];
  const filtered = verifs.filter(v => v.status === filter);
  const pendingCount = verifs.filter(v => v.status === 'pending_review').length;

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
          <p className="text-sm text-orange-700 font-medium">{pendingCount} dossier{pendingCount > 1 ? 's' : ''} en attente de vérification</p>
        </div>
      )}
      <div className="flex gap-2">
        {filters.map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${filter === f.v ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'}`}>{f.l}</button>
        ))}
      </div>
      {isLoading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground"><ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Aucun dossier</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(v => (
            <div key={v.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{v.user_name || v.user_email}</p>
                  <p className="text-xs text-muted-foreground">{v.user_email}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${v.user_type === 'professionnel' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{v.user_type}</span>
                </div>
                <button onClick={() => setExpanded(expanded === v.id ? null : v.id)} className="text-xs text-primary underline">{expanded === v.id ? 'Réduire' : 'Voir'}</button>
              </div>
              {expanded === v.id && (
                <div className="space-y-2 border-t border-border/40 pt-3">
                  {[['Recto eID', v.eid_front_url], ['Verso eID', v.eid_back_url], ['Selfie', v.selfie_url], ['Assurance', v.insurance_url], ['ONSS', v.onss_url]].map(([label, url]) =>
                    url ? (
                      <div key={label} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                        <span className="text-xs font-medium text-muted-foreground">{label}</span>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline"><Eye className="w-3 h-3" />Voir</a>
                      </div>
                    ) : null
                  )}
                  {v.status === 'pending_review' && (
                    <div className="space-y-2 pt-1">
                      <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Raison du refus (si refus)" className="w-full text-sm border border-border rounded-xl px-3 py-2" />
                      <div className="flex gap-2">
                        <Button onClick={() => updateMutation.mutate({ id: v.id, status: 'approved', userEmail: v.user_email, userName: v.user_name })} disabled={updateMutation.isPending} className="flex-1 h-9 rounded-xl bg-green-600 hover:bg-green-700 text-sm"><CheckCircle className="w-3.5 h-3.5 mr-1" />Approuver</Button>
                        <Button onClick={() => updateMutation.mutate({ id: v.id, status: 'rejected', reason: rejectReason, userEmail: v.user_email, userName: v.user_name })} disabled={updateMutation.isPending || !rejectReason} variant="outline" className="flex-1 h-9 rounded-xl border-red-200 text-red-600 text-sm"><XCircle className="w-3.5 h-3.5 mr-1" />Refuser</Button>
                      </div>
                    </div>
                  )}
                  {v.rejection_reason && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">Raison : {v.rejection_reason}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsTab() {
  const queryClient = useQueryClient();
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['allReports'],
    queryFn: () => base44.entities.Report.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Report.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['allReports'] }); toast.success('Signalement mis à jour.'); },
  });

  const statusColors = { pending: 'text-orange-600 bg-orange-100', under_review: 'text-blue-600 bg-blue-100', resolved_warning: 'text-yellow-700 bg-yellow-100', resolved_banned: 'text-red-700 bg-red-100', dismissed: 'text-gray-600 bg-gray-100' };
  const priorityColors = { urgent: 'text-red-600', high: 'text-orange-600', medium: 'text-yellow-600', low: 'text-green-600' };
  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-700 font-medium">{pendingCount} signalement{pendingCount > 1 ? 's' : ''} en attente de traitement</p>
        </div>
      )}
      {isLoading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground"><AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Aucun signalement</p></div>
      ) : (
        <div className="space-y-3">
          {reports.map(rep => (
            <div key={rep.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm truncate">{rep.reported_user_name || rep.reported_user_email}</p>
                    <span className={`text-[10px] font-bold ${priorityColors[rep.priority] || ''}`}>{rep.priority?.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Signalé par : {rep.reported_by_email}</p>
                  <p className="text-xs font-medium mt-1">Motif : {rep.reason?.replace(/_/g, ' ')}</p>
                  {rep.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rep.description}</p>}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${statusColors[rep.status] || 'bg-gray-100 text-gray-600'}`}>{rep.status?.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex gap-2">
                {rep.status === 'pending' && <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: rep.id, status: 'under_review' })} className="flex-1 h-8 rounded-xl text-xs">Examiner</Button>}
                {['pending', 'under_review'].includes(rep.status) && (
                  <>
                    <Button size="sm" onClick={() => updateMutation.mutate({ id: rep.id, status: 'resolved_warning' })} className="flex-1 h-8 rounded-xl text-xs bg-yellow-500 hover:bg-yellow-600">Avertissement</Button>
                    <Button size="sm" onClick={() => updateMutation.mutate({ id: rep.id, status: 'dismissed' })} variant="outline" className="flex-1 h-8 rounded-xl text-xs">Ignorer</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminVerification() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('verif');
  const [filter, setFilter] = useState('pending');

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: pros = [], isLoading } = useQuery({
    queryKey: ['allPros'],
    queryFn: () => base44.entities.User.filter({ user_type: 'professionnel' }, '-created_date', 100),
    enabled: currentUser?.role === 'admin',
  });

  const { data: reportsCount = 0 } = useQuery({
    queryKey: ['pendingReportsCount'],
    queryFn: () => base44.entities.Report.filter({ status: 'pending' }, '-created_date', 50).then(r => r.length),
    enabled: currentUser?.role === 'admin',
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, pro }) => {
      await base44.entities.User.update(id, { verification_status: status });
      await base44.integrations.Core.SendEmail({
        to: pro.email,
        subject: status === 'verified' ? '✅ Votre compte ServiGo est vérifié !' : '❌ Votre dossier ServiGo a été refusé',
        body: status === 'verified'
          ? `Bonjour ${pro.full_name},\n\nFélicitations ! Votre compte est maintenant vérifié. Vous bénéficiez du badge "Pro Vérifié ✓".\n\nL'équipe ServiGo`
          : `Bonjour ${pro.full_name},\n\nNous ne pouvons pas valider votre compte pour le moment (documents incomplets ou illisibles). Veuillez soumettre à nouveau vos documents.\n\nL'équipe ServiGo`,
      });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['allPros'] });
      toast.success(status === 'verified' ? 'Pro approuvé !' : 'Pro refusé.');
    },
  });

  if (currentUser && currentUser.role !== 'admin') {
    return <div className="min-h-screen flex items-center justify-center text-center px-6"><div><p className="text-2xl mb-2">🔒</p><p className="font-semibold">Accès administrateurs uniquement</p></div></div>;
  }

  const filtered = filter === 'all' ? pros
    : filter === 'pending' ? pros.filter(p => p.verification_status === 'pending' || (p.id_card_url && !p.verification_status))
    : pros.filter(p => p.verification_status === filter);
  const pendingCount = pros.filter(p => p.verification_status === 'pending' || (p.id_card_url && !p.verification_status)).length;

  const { data: pendingIdentityCount = 0 } = useQuery({
    queryKey: ['pendingIdentityCount'],
    queryFn: () => base44.entities.IdentityVerification.filter({ status: 'pending_review' }, '-created_date', 50).then(r => r.length),
    enabled: currentUser?.role === 'admin',
  });

  const tabs = [
    { key: 'identity', label: 'Identités', icon: <ShieldCheck className="w-3.5 h-3.5" />, badge: pendingIdentityCount },
    { key: 'verif', label: 'Pros', icon: <User className="w-3.5 h-3.5" />, badge: pendingCount },
    { key: 'subscriptions', label: 'Abonnements', icon: <CreditCard className="w-3.5 h-3.5" />, badge: 0 },
    { key: 'reports', label: 'Signalements', icon: <AlertTriangle className="w-3.5 h-3.5" />, badge: reportsCount },
    { key: 'stats', label: 'Stats', icon: <BarChart2 className="w-3.5 h-3.5" />, badge: 0 },
  ];

  return (
    <div className="min-h-screen bg-background px-4 pt-6 pb-20 max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gestion de la plateforme ServiGo</p>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors shrink-0 ${tab === t.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'}`}>
            {t.icon} {t.label}
            {t.badge > 0 && <span className={`text-xs font-bold rounded-full px-1.5 ${tab === t.key ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {tab === 'identity' && <IdentityVerifTab />}
      {tab === 'stats' && <ProStatsTable pros={pros} />}
      {tab === 'subscriptions' && <SubscriptionsTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'verif' && (
        <>
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {STATUS_FILTERS.map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)} className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${filter === f.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'}`}>{f.label}</button>
            ))}
          </div>
          {isLoading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Aucun professionnel dans cette catégorie</p></div>
          ) : (
            <div className="space-y-3">
              {filtered.map(pro => (
                <ProCard key={pro.id} pro={pro} onApprove={id => updateMutation.mutate({ id, status: 'verified', pro })} onReject={id => updateMutation.mutate({ id, status: 'rejected', pro })} isPending={updateMutation.isPending} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}