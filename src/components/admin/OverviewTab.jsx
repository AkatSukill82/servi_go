import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Euro, TrendingUp, AlertTriangle, CheckCircle, Activity, Users, Info } from 'lucide-react';
import { formatDateFr } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DATA_LIMIT = 1000; // augmenté — avertissement si atteint

export default function OverviewTab() {
  const queryClient = useQueryClient();
  const [repairingRequests, setRepairingRequests] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  const { data: allSubs = [] } = useQuery({
    queryKey: ['adminAllSubsOv'],
    queryFn: () => base44.entities.ProSubscription.list('-created_date', DATA_LIMIT),
  });
  const { data: allRequests = [] } = useQuery({
    queryKey: ['adminAllRequestsOv'],
    queryFn: () => base44.entities.ServiceRequestV2.list('-created_date', DATA_LIMIT),
  });
  const { data: allDisputes = [] } = useQuery({
    queryKey: ['adminDisputesOv'],
    queryFn: () => base44.entities.Dispute.list('-created_date', DATA_LIMIT),
  });
  const { data: allUsers = [] } = useQuery({
    queryKey: ['adminAllUsersOv'],
    queryFn: () => base44.entities.User.list('-created_date', DATA_LIMIT),
  });

  const dataIsCapped = allUsers.length >= DATA_LIMIT || allRequests.length >= DATA_LIMIT || allSubs.length >= DATA_LIMIT;

  // ─── Réparation demandes bloquées ────────────────────────────────────────────
  const handleRepairRequests = async () => {
    const todayKey = `repairRun_${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(todayKey)) {
      toast.error('Réparation déjà exécutée aujourd\'hui.');
      return;
    }
    setRepairingRequests(true);
    try {
      const pendingPros = await base44.entities.ServiceRequestV2.filter({ status: 'pending_pro' }, '-created_date', 500);
      let deduped = 0;
      for (const req of pendingPros) {
        if (req.tried_professionals?.length > 0) {
          const capped = [...new Set(req.tried_professionals)].slice(0, 20);
          if (capped.length !== req.tried_professionals.length) {
            await base44.entities.ServiceRequestV2.update(req.id, { tried_professionals: capped });
            deduped++;
          }
        }
      }
      const expiredCutoff = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
      const allReqs = await base44.entities.ServiceRequestV2.list('-created_date', 500);
      const expired = allReqs.filter(r =>
        ['searching', 'pending_pro'].includes(r.status) &&
        r.scheduled_date && r.scheduled_date < expiredCutoff
      );
      for (const req of expired) {
        await base44.entities.ServiceRequestV2.update(req.id, { status: 'cancelled', cancellation_reason: 'Expirée automatiquement' });
      }
      queryClient.invalidateQueries({ queryKey: ['adminAllRequestsOv'] });
      localStorage.setItem(todayKey, '1');
      toast.success(`Réparé: ${deduped} dédupliquées, ${expired.length} annulées`);
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    } finally {
      setRepairingRequests(false);
    }
  };

  // ─── Réassignation manuelle (bouton) — évite les race conditions ─────────────
  const handleReassign = async () => {
    // Verrou DB : vérifier si une réassignation a eu lieu dans les 10 dernières minutes
    // en cherchant une demande passée en pending_pro très récemment
    const tenMinAgo = new Date(Date.now() - 10 * 60000).toISOString();
    const recentlyReassigned = await base44.entities.ServiceRequestV2.filter(
      { status: 'pending_pro' }, '-updated_date', 5
    ).then(list => list.filter(r => r.updated_date > tenMinAgo));

    if (recentlyReassigned.length > 0) {
      toast.error('Une réassignation a déjà eu lieu dans les 10 dernières minutes. Attendez avant de relancer.');
      return;
    }

    setReassigning(true);
    try {
      const stuckRequests = await base44.entities.ServiceRequestV2.filter({ status: 'searching' }, '-created_date', 200);
      if (stuckRequests.length === 0) { toast.success('Aucune mission bloquée.'); setReassigning(false); return; }

      const availablePros = await base44.entities.User.filter(
        { user_type: 'professionnel', available: true, verification_status: 'verified' }, '-created_date', 500
      );

      let count = 0;
      for (const req of stuckRequests) {
        const tried = (req.tried_professionals || []).slice(-20); // cap à 20
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
          tried_professionals: [...tried, best.email].slice(-20),
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
        count++;
      }

      queryClient.invalidateQueries({ queryKey: ['adminAllRequestsOv'] });
      toast.success(`${count} mission${count > 1 ? 's' : ''} réassignée${count > 1 ? 's' : ''}.`);
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    } finally {
      setReassigning(false);
    }
  };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = now.toISOString().split('T')[0];

  const activeSubs = allSubs.filter(s => s.status === 'active' || s.status === 'trial');
  const expiredSubs = allSubs.filter(s => s.status === 'expired' && s.renewal_date && s.renewal_date < today);
  const ongoingMissions = allRequests.filter(r => !['completed', 'cancelled'].includes(r.status));
  const completedThisMonth = allRequests.filter(r =>
    r.status === 'completed' && r.updated_date && new Date(r.updated_date) >= monthStart
  );
  const monthRevenue = activeSubs.length * 10;
  const openDisputes = allDisputes.filter(d => ['open', 'in_review'].includes(d.status));
  const lastUsers = allUsers.slice(0, 5);
  const lastRequests = allRequests.slice(0, 5);

  const kpis = [
    { label: 'Utilisateurs inscrits', value: allUsers.length + (dataIsCapped ? '+' : ''), icon: Users, color: 'text-blue-600' },
    { label: 'Abonnements actifs', value: activeSubs.length, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Abonnements expirés', value: expiredSubs.length, icon: AlertTriangle, color: 'text-red-500' },
    { label: 'Missions en cours', value: ongoingMissions.length, icon: Activity, color: 'text-orange-600' },
    { label: 'Terminées ce mois', value: completedThisMonth.length, icon: TrendingUp, color: 'text-purple-600' },
    { label: 'Revenus abonnements', value: `${monthRevenue} €`, icon: Euro, color: 'text-green-700' },
    { label: 'Litiges ouverts', value: openDisputes.length, icon: AlertTriangle, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-4">
      {dataIsCapped && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            <span className="font-semibold">Données partielles</span> — la plateforme dépasse {DATA_LIMIT.toLocaleString()} enregistrements.
            Les KPIs ci-dessous sont approximatifs. Migrez vers des agrégations backend pour des chiffres exacts.
          </p>
        </div>
      )}

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

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <p className="text-xs font-semibold text-muted-foreground px-4 py-3 border-b border-border bg-muted/50">🔧 Maintenance</p>
        <div className="px-4 py-3 space-y-2">
          <Button onClick={handleReassign} disabled={reassigning} className="w-full h-10 text-xs rounded-lg bg-primary hover:bg-primary/90">
            {reassigning ? 'Réassignation...' : '🔄 Réassigner les missions bloquées'}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Verrou DB : impossible de lancer si une réassignation a eu lieu dans les 10 min.
          </p>
          <Button onClick={handleRepairRequests} disabled={repairingRequests} className="w-full h-10 text-xs rounded-lg bg-amber-600 hover:bg-amber-700">
            {repairingRequests ? 'Réparation...' : '🔨 Réparer les demandes bloquées'}
          </Button>
        </div>
      </div>
    </div>
  );
}
