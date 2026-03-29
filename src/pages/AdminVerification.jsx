import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, CheckCircle, XCircle, FileText, User, BarChart2, TrendingUp, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2 hover:text-primary/80"
    >
      <FileText className="w-3 h-3" /> {label}
    </a>
  );
}

function ProCard({ pro, onApprove, onReject, isPending }) {
  const [expanded, setExpanded] = useState(false);

  const statusBadge = {
    pending: <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 border text-xs">⏳ En attente</Badge>,
    verified: <Badge className="bg-green-100 text-green-700 border-green-200 border text-xs">✓ Vérifié</Badge>,
    rejected: <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs">✗ Refusé</Badge>,
  }[pro.verification_status] || <Badge variant="secondary" className="text-xs">Sans statut</Badge>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden"
    >
      <div className="p-4 flex items-start justify-between gap-3">
        {/* Avatar + info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden font-bold text-primary text-lg">
            {pro.photo_url
              ? <img src={pro.photo_url} alt={pro.full_name} className="w-full h-full object-cover" />
              : <User className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{pro.full_name}</p>
            <p className="text-xs text-muted-foreground">{pro.email}</p>
            <p className="text-xs text-muted-foreground">{pro.category_name || '—'}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {statusBadge}
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-primary underline underline-offset-2"
          >
            {expanded ? 'Réduire' : 'Voir documents'}
          </button>
        </div>
      </div>

      {/* Documents */}
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

          {/* Actions */}
          {pro.verification_status !== 'verified' && (
            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => onApprove(pro.id)}
                disabled={isPending}
                className="flex-1 h-10 rounded-xl bg-green-600 hover:bg-green-700 text-sm"
              >
                <CheckCircle className="w-4 h-4 mr-1" /> Approuver
              </Button>
              {pro.verification_status !== 'rejected' && (
                <Button
                  onClick={() => onReject(pro.id)}
                  disabled={isPending}
                  variant="outline"
                  className="flex-1 h-10 rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-sm"
                >
                  <XCircle className="w-4 h-4 mr-1" /> Refuser
                </Button>
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
    queryFn: () => base44.entities.ServiceRequest.list('-created_date', 500),
  });

  const statsPerPro = useMemo(() => {
    return pros.map(pro => {
      const jobs = allRequests.filter(r =>
        r.professional_email === pro.email &&
        (r.status === 'accepted' || r.status === 'completed' || r.status === 'in_progress')
      );
      const totalPaid = jobs.reduce((sum, j) => sum + (j.base_price || 0), 0);
      const totalCommission = jobs.reduce((sum, j) => sum + (j.commission || (j.base_price || 0) * 0.10), 0);
      const totalTva = jobs.reduce((sum, j) => {
        const base = (j.base_price || 0) + (j.commission || (j.base_price || 0) * 0.10);
        return sum + base * 0.21;
      }, 0);
      return { ...pro, missionsCount: jobs.length, totalPaid, totalCommission, totalTva };
    }).sort((a, b) => b.missionsCount - a.missionsCount);
  }, [pros, allRequests]);

  const totalMissions = statsPerPro.reduce((s, p) => s + p.missionsCount, 0);
  const totalRevenue = statsPerPro.reduce((s, p) => s + p.totalPaid, 0);
  const totalCommission = statsPerPro.reduce((s, p) => s + p.totalCommission, 0);
  const totalTva = statsPerPro.reduce((s, p) => s + p.totalTva, 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-xs text-muted-foreground font-medium">Total missions</p>
          </div>
          <p className="text-3xl font-bold tracking-tight">{totalMissions}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <Euro className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-xs text-muted-foreground font-medium">Total payé (pros)</p>
          </div>
          <p className="text-3xl font-bold tracking-tight">{totalRevenue.toFixed(0)} €</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <Euro className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-xs text-muted-foreground font-medium">Commission totale (10%)</p>
          </div>
          <p className="text-3xl font-bold tracking-tight">{totalCommission.toFixed(0)} €</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <Euro className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-xs text-muted-foreground font-medium">TVA totale (21%)</p>
          </div>
          <p className="text-3xl font-bold tracking-tight">{totalTva.toFixed(0)} €</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2.5 border-b border-border bg-muted/50">
          <p className="col-span-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Professionnel</p>
          <p className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Missions</p>
          <p className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Payé HT</p>
          <p className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Comm. 10%</p>
          <p className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">TVA 21%</p>
        </div>
        {statsPerPro.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Aucune donnée</p>
        ) : (
          statsPerPro.map((pro, i) => (
            <div
              key={pro.id}
              className={`grid grid-cols-12 px-4 py-3 items-center ${i < statsPerPro.length - 1 ? 'border-b border-border/50' : ''}`}
            >
              <div className="col-span-4 flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold overflow-hidden">
                  {pro.photo_url
                    ? <img src={pro.photo_url} alt="" className="w-full h-full object-cover" />
                    : (pro.full_name?.[0] || '?')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{pro.full_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{pro.category_name || '—'}</p>
                </div>
              </div>
              <div className="col-span-2 text-center">
                <span className={`text-sm font-bold ${pro.missionsCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {pro.missionsCount}
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm font-semibold">{pro.totalPaid.toFixed(0)} €</span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm text-blue-600 font-semibold">{pro.totalCommission.toFixed(0)} €</span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm text-orange-600 font-semibold">{pro.totalTva.toFixed(0)} €</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminVerification() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('verif');
  const [filter, setFilter] = useState('pending');


  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });


  const old_eidMutation = useMutation({
    mutationFn: async ({ id, status, user: u }) => {
      await base44.entities.User.update(id, { eid_status: status });
      await base44.integrations.Core.SendEmail({
        to: u.email,
        subject: status === 'verified' ? '✅ Votre identité ServiGo est vérifiée !' : '❌ Votre eID ServiGo a été refusé',
        body: status === 'verified'
          ? `Bonjour ${u.full_name},\n\nVotre carte eID a été vérifiée avec succès. Vous pouvez désormais faire des demandes de service sur ServiGo.\n\nL'équipe ServiGo`
          : `Bonjour ${u.full_name},\n\nVotre carte eID n'a pas pu être vérifiée (document illisible ou invalide). Veuillez en soumettre un nouveau dans votre profil.\n\nL'équipe ServiGo`,
      });
    },
    onSuccess: () => {},
  });

  const { data: pros = [], isLoading } = useQuery({
    queryKey: ['allPros'],
    queryFn: () => base44.entities.User.filter({ user_type: 'professionnel' }, '-created_date', 100),
    enabled: currentUser?.role === 'admin',
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, pro }) => {
      await base44.entities.User.update(id, { verification_status: status });

      const isVerified = status === 'verified';
      const subject = isVerified
        ? '✅ Votre compte ServiGo est vérifié !'
        : '❌ Votre dossier ServiGo a été refusé';
      const body = isVerified
        ? `Bonjour ${pro.full_name},\n\nFélicitations ! Votre dossier a été examiné et votre compte est maintenant vérifié.\n\nVous bénéficiez désormais du badge "Pro Vérifié ✓" visible par tous les clients, ce qui augmente votre crédibilité et vos chances d'obtenir des missions.\n\nConnectez-vous à ServiGo pour commencer à recevoir des demandes.\n\nL'équipe ServiGo`
        : `Bonjour ${pro.full_name},\n\nNous avons examiné votre dossier mais malheureusement nous ne pouvons pas valider votre compte pour le moment.\n\nCela peut être dû à des documents illisibles, expirés ou incomplets. Veuillez vous connecter à ServiGo et soumettre à nouveau vos documents dans la section "Mon profil".\n\nEn cas de questions, contactez notre support.\n\nL'équipe ServiGo`;

      await base44.integrations.Core.SendEmail({
        to: pro.email,
        subject,
        body,
      });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['allPros'] });
      toast.success(status === 'verified' ? 'Pro approuvé et notifié par email !' : 'Pro refusé et notifié par email.');
    },
  });

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <p className="text-2xl mb-2">🔒</p>
          <p className="font-semibold">Accès réservé aux administrateurs</p>
        </div>
      </div>
    );
  }

  const filtered = filter === 'all'
    ? pros
    : filter === 'pending'
    ? pros.filter(p => p.verification_status === 'pending' || (p.id_card_url && !p.verification_status))
    : pros.filter(p => p.verification_status === filter);

  const pendingCount = pros.filter(p => p.verification_status === 'pending' || (p.id_card_url && !p.verification_status)).length;

  return (
    <div className="min-h-screen bg-background px-4 pt-6 pb-20 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gestion des professionnels</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        <button
          onClick={() => setTab('verif')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === 'verif' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Vérifications
          {pendingCount > 0 && tab !== 'verif' && (
            <span className="text-xs font-bold bg-white/20 rounded-full px-1.5">{pendingCount}</span>
          )}
        </button>
        <button
          onClick={() => setTab('stats')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors shrink-0 ${
            tab === 'stats' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Statistiques
        </button>
      </div>

      {tab === 'stats' ? (
        <ProStatsTable pros={pros} />
      ) : (
        <>
          {/* Filters */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  filter === f.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:border-primary/30'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun professionnel dans cette catégorie</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(pro => (
                <ProCard
                  key={pro.id}
                  pro={pro}
                  onApprove={id => updateMutation.mutate({ id, status: 'verified', pro })}
                  onReject={id => updateMutation.mutate({ id, status: 'rejected', pro })}
                  isPending={updateMutation.isPending}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}