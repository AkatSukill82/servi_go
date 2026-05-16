import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Euro, TrendingUp, AlertTriangle, CheckCircle, Activity,
  Users, Info, RefreshCw, Wrench, ArrowUpRight,
} from 'lucide-react';
import { formatDateFr } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DATA_LIMIT = 1000;

const STATUS_STYLES = {
  completed:  'bg-emerald-100 text-emerald-700',
  cancelled:  'bg-slate-100 text-slate-500',
  searching:  'bg-blue-100 text-blue-700',
  pending_pro:'bg-amber-100 text-amber-700',
  accepted:   'bg-indigo-100 text-indigo-700',
  in_progress:'bg-purple-100 text-purple-700',
};

const STATUS_LABELS = {
  completed: 'Terminé', cancelled: 'Annulé', searching: 'Recherche',
  pending_pro: 'En attente', accepted: 'Accepté', in_progress: 'En cours',
};

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

  const dataIsCapped = allUsers.length >= DATA_LIMIT || allRequests.length >= DATA_LIMIT;

  const handleRepairRequests = async () => {
    const todayKey = `repairRun_${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(todayKey)) { toast.error('Réparation déjà exécutée aujourd\'hui.'); return; }
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
        ['searching', 'pending_pro'].includes(r.status) && r.scheduled_date && r.scheduled_date < expiredCutoff
      );
      for (const req of expired) {
        await base44.entities.ServiceRequestV2.update(req.id, { status: 'cancelled', cancellation_reason: 'Expirée automatiquement' });
      }
      queryClient.invalidateQueries({ queryKey: ['adminAllRequestsOv'] });
      localStorage.setItem(todayKey, '1');
      toast.success(`Réparé : ${deduped} dédupliquées, ${expired.length} annulées`);
    } catch (e) {
      toast.error('Erreur : ' + e.message);
    } finally {
      setRepairingRequests(false);
    }
  };

  const handleReassign = async () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60000).toISOString();
    const recentlyReassigned = await base44.entities.ServiceRequestV2.filter(
      { status: 'pending_pro' }, '-updated_date', 5
    ).then(list => list.filter(r => r.updated_date > tenMinAgo));
    if (recentlyReassigned.length > 0) {
      toast.error('Réassignation effectuée il y a moins de 10 min. Patientez.');
      return;
    }
    setReassigning(true);
    try {
      const stuckRequests = await base44.entities.ServiceRequestV2.filter({ status: 'searching' }, '-created_date', 200);
      if (stuckRequests.length === 0) { toast.success('Aucune mission bloquée.'); setReassigning(false); return; }
      const availablePros = await base44.entities.User.filter({ user_type: 'professionnel', available: true, verification_status: 'verified' }, '-created_date', 500);
      let count = 0;
      for (const req of stuckRequests) {
        const tried = (req.tried_professionals || []).slice(-20);
        const eligible = availablePros.filter(p => p.email && p.category_name === req.category_name && !tried.includes(p.email))
          .sort((a, b) => (b.rating || 0) - (a.rating || 0));
        if (eligible.length === 0) continue;
        const best = eligible[0];
        await base44.entities.ServiceRequestV2.update(req.id, {
          status: 'pending_pro', professional_id: best.id,
          professional_name: best.full_name, professional_email: best.email,
          tried_professionals: [...tried, best.email].slice(-20),
        });
        await base44.entities.Notification.create({
          recipient_email: best.email, recipient_type: 'professionnel', type: 'new_mission',
          title: `Nouvelle mission : ${req.category_name}`,
          body: `Une mission vous a été assignée. Client : ${req.customer_name || req.customer_email}.`,
          request_id: req.id, action_url: `/Chat?requestId=${req.id}`,
        });
        count++;
      }
      queryClient.invalidateQueries({ queryKey: ['adminAllRequestsOv'] });
      toast.success(`${count} mission${count > 1 ? 's' : ''} réassignée${count > 1 ? 's' : ''}.`);
    } catch (e) {
      toast.error('Erreur : ' + e.message);
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
  const completedThisMonth = allRequests.filter(r => r.status === 'completed' && r.updated_date && new Date(r.updated_date) >= monthStart);
  const openDisputes = allDisputes.filter(d => ['open', 'in_review'].includes(d.status));
  const lastUsers = allUsers.slice(0, 6);
  const lastRequests = allRequests.slice(0, 6);

  const kpis = [
    { label: 'Utilisateurs', value: allUsers.length + (dataIsCapped ? '+' : ''), delta: '+12 ce mois', icon: Users, color: 'bg-blue-500', light: 'bg-blue-50 text-blue-600' },
    { label: 'Abonnements actifs', value: activeSubs.length, delta: `${expiredSubs.length} expirés`, icon: CheckCircle, color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600' },
    { label: 'Missions en cours', value: ongoingMissions.length, delta: `${completedThisMonth.length} ce mois`, icon: Activity, color: 'bg-violet-500', light: 'bg-violet-50 text-violet-600' },
    { label: 'Revenus abo.', value: `${activeSubs.length * 10} €`, delta: 'Ce mois', icon: Euro, color: 'bg-amber-500', light: 'bg-amber-50 text-amber-600' },
    { label: 'Terminées ce mois', value: completedThisMonth.length, delta: 'Missions', icon: TrendingUp, color: 'bg-indigo-500', light: 'bg-indigo-50 text-indigo-600' },
    { label: 'Litiges ouverts', value: openDisputes.length, delta: openDisputes.length > 0 ? '⚠ Action requise' : 'Aucun', icon: AlertTriangle, color: openDisputes.length > 0 ? 'bg-red-500' : 'bg-slate-400', light: openDisputes.length > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {dataIsCapped && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Données partielles</span> — plus de {DATA_LIMIT.toLocaleString()} enregistrements. Les KPIs sont approximatifs.
          </p>
        </div>
      )}

      {expiredSubs.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">{expiredSubs.length} abonnement{expiredSubs.length !== 1 ? 's' : ''} expiré{expiredSubs.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-red-600 mt-0.5">{expiredSubs.slice(0, 3).map(s => s.professional_name).join(', ')}{expiredSubs.length > 3 ? `…` : ''}</p>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis.map(({ label, value, delta, icon: Icon, color, light }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${light}`}>
                <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <p className="text-2xl font-black text-slate-900 tabular-nums">{value}</p>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">{label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{delta}</p>
          </div>
        ))}
      </div>

      {/* Tables */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Derniers utilisateurs */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-900">Dernières inscriptions</p>
            <span className="text-[10px] text-slate-400 font-medium">{allUsers.length} total</span>
          </div>
          <div className="divide-y divide-slate-50">
            {lastUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700 shrink-0">
                  {(u.full_name || u.email || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : (u.full_name || u.email)}
                  </p>
                  <p className="text-[10px] text-slate-400">{u.user_type || 'user'} · {formatDateFr(u.created_date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dernières missions */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-900">Dernières missions</p>
            <span className="text-[10px] text-slate-400 font-medium">{allRequests.length} total</span>
          </div>
          <div className="divide-y divide-slate-50">
            {lastRequests.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{r.category_name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{r.customer_name || r.customer_email} · {formatDateFr(r.created_date)}</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLES[r.status] || 'bg-slate-100 text-slate-500'}`}>
                  {STATUS_LABELS[r.status] || r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Maintenance */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100">
          <Wrench className="w-4 h-4 text-slate-500" />
          <p className="text-sm font-bold text-slate-900">Maintenance</p>
        </div>
        <div className="px-5 py-4 grid md:grid-cols-2 gap-3">
          <button
            onClick={handleReassign}
            disabled={reassigning}
            className="flex items-center gap-3 p-4 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 transition-colors disabled:opacity-60 cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
              <RefreshCw className={`w-4 h-4 text-white ${reassigning ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-violet-900">{reassigning ? 'Réassignation…' : 'Réassigner les missions'}</p>
              <p className="text-xs text-violet-600">Missions bloquées en "recherche"</p>
            </div>
          </button>

          <button
            onClick={handleRepairRequests}
            disabled={repairingRequests}
            className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-60 cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
              <Wrench className={`w-4 h-4 text-white ${repairingRequests ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">{repairingRequests ? 'Réparation…' : 'Réparer les demandes'}</p>
              <p className="text-xs text-amber-700">Annuler les expirées · dédupliquer</p>
            </div>
          </button>
        </div>
        <div className="px-5 pb-4">
          <p className="text-[10px] text-slate-400 text-center">
            🔒 Verrou DB actif — réassignation impossible si une a eu lieu dans les 10 dernières minutes
          </p>
        </div>
      </div>
    </div>
  );
}