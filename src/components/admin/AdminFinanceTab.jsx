import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Euro, TrendingUp, Users, CreditCard, AlertCircle, ArrowUpRight } from 'lucide-react';

export default function AdminFinanceTab() {
  const { data: allSubs = [], isLoading: loadingSubs } = useQuery({
    queryKey: ['adminFinanceSubs'],
    queryFn: () => base44.entities.ProSubscription.list('-created_date', 500),
  });
  const { data: allRequests = [], isLoading: loadingReqs } = useQuery({
    queryKey: ['adminFinanceRequests'],
    queryFn: () => base44.entities.ServiceRequestV2.filter({ status: 'completed' }, '-created_date', 500),
  });
  const { data: payments = [], isLoading: loadingPay } = useQuery({
    queryKey: ['adminPaymentHistory'],
    queryFn: () => base44.entities.PaymentHistory.list('-created_date', 200),
  });

  const isLoading = loadingSubs || loadingReqs || loadingPay;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const activeSubs   = allSubs.filter(s => s.status === 'active');
  const trialSubs    = allSubs.filter(s => s.status === 'trial');
  const expiredSubs  = allSubs.filter(s => s.status === 'expired');
  const cancelledSubs = allSubs.filter(s => s.status === 'cancelled');

  const monthRevenue         = activeSubs.length * 10;
  const totalSubRevenue      = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const totalMissionRevenue  = allRequests.reduce((s, r) => s + (r.commission || 0), 0);
  const completedThisMonth   = allRequests.filter(r => r.updated_date && new Date(r.updated_date) >= monthStart);
  const missionRevenueMonth  = completedThisMonth.reduce((s, r) => s + (r.commission || 0), 0);

  const kpis = [
    { label: 'Abonnements actifs',  value: activeSubs.length,              sub: `${trialSubs.length} en essai gratuit`,    icon: Users,         light: 'bg-emerald-50 text-emerald-600' },
    { label: 'Revenus abo. / mois', value: `${monthRevenue} €`,            sub: `${activeSubs.length} × 10 €`,             icon: Euro,          light: 'bg-blue-50 text-blue-600' },
    { label: 'Total abonnements',   value: `${totalSubRevenue.toFixed(0)} €`, sub: 'Cumul tous paiements',                  icon: CreditCard,    light: 'bg-indigo-50 text-indigo-600' },
    { label: 'Commissions missions',value: `${totalMissionRevenue.toFixed(0)} €`, sub: `${missionRevenueMonth.toFixed(0)} € ce mois`, icon: TrendingUp, light: 'bg-violet-50 text-violet-600' },
    { label: 'Expirés / à relancer',value: expiredSubs.length,             sub: 'Abonnements expirés',                     icon: AlertCircle,   light: 'bg-red-50 text-red-500' },
  ];

  const breakdown = [
    { label: 'Actifs',       count: activeSubs.length,   color: 'bg-emerald-500' },
    { label: 'Essai',        count: trialSubs.length,    color: 'bg-blue-400' },
    { label: 'Expirés',      count: expiredSubs.length,  color: 'bg-red-400' },
    { label: 'Annulés',      count: cancelledSubs.length,color: 'bg-slate-300' },
  ];

  const total = allSubs.length || 1;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis.map(({ label, value, sub, icon: Icon, light }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${light}`}>
                <Icon style={{ width: 18, height: 18 }} />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <p className="text-2xl font-black text-slate-900 tabular-nums">{value}</p>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">{label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Répartition abonnements */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <p className="text-sm font-bold text-slate-900">Répartition des abonnements</p>
        <div className="space-y-3">
          {breakdown.map(({ label, count, color }) => {
            const pct = Math.round((count / total) * 100);
            return (
              <div key={label}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">{count} <span className="text-slate-400">({pct}%)</span></span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historique paiements */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">Derniers paiements</p>
          <span className="text-[10px] text-slate-400">{payments.length} enregistrés</span>
        </div>
        {payments.length === 0 ? (
          <div className="py-12 text-center">
            <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Aucun paiement enregistré</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {payments.slice(0, 12).map(p => (
              <div key={p.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  p.status === 'paid' ? 'bg-emerald-500' : p.status === 'failed' ? 'bg-red-500' : 'bg-amber-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.professional_name || p.professional_email}</p>
                  <p className="text-[10px] text-slate-400">
                    {p.payment_date ? new Date(p.payment_date).toLocaleDateString('fr-BE') : '—'}
                    {p.payment_method ? ` · ${p.payment_method}` : ''}
                  </p>
                </div>
                <span className={`text-sm font-bold tabular-nums shrink-0 ${p.status === 'paid' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {p.status === 'paid' ? '+' : ''}{p.amount} €
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}