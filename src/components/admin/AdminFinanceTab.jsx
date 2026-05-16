import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Euro, TrendingUp, Users, CreditCard, AlertCircle } from 'lucide-react';

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

  const activeSubs = allSubs.filter(s => s.status === 'active');
  const trialSubs  = allSubs.filter(s => s.status === 'trial');
  const expiredSubs = allSubs.filter(s => s.status === 'expired');

  const monthRevenue = activeSubs.length * 10;
  const totalSubRevenue = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const totalMissionRevenue = allRequests.reduce((s, r) => s + (r.commission || 0), 0);

  const completedThisMonth = allRequests.filter(r =>
    r.updated_date && new Date(r.updated_date) >= monthStart
  );
  const missionRevenueThisMonth = completedThisMonth.reduce((s, r) => s + (r.commission || 0), 0);

  const recentPayments = payments.slice(0, 10);

  const kpis = [
    { label: 'Abonnements actifs', value: activeSubs.length, sub: `${trialSubs.length} en essai`, icon: Users, color: 'bg-green-50 text-green-600' },
    { label: 'Revenus abo. ce mois', value: `${monthRevenue} €`, sub: `${activeSubs.length} × 10 €`, icon: Euro, color: 'bg-blue-50 text-blue-600' },
    { label: 'Revenus abo. total', value: `${totalSubRevenue.toFixed(0)} €`, sub: 'Cumul paiements', icon: CreditCard, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Commissions missions', value: `${totalMissionRevenue.toFixed(0)} €`, sub: `${missionRevenueThisMonth.toFixed(0)} € ce mois`, icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
    { label: 'Abonnements expirés', value: expiredSubs.length, sub: 'À relancer', icon: AlertCircle, color: 'bg-red-50 text-red-500' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            </div>
            <p className="text-2xl font-black">{value}</p>
            <p className="text-xs font-semibold text-foreground mt-0.5">{label}</p>
            <p className="text-[10px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Historique paiements */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <p className="text-sm font-semibold">Derniers paiements d'abonnement</p>
        </div>
        {recentPayments.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Aucun paiement enregistré</div>
        ) : (
          <div className="divide-y divide-border">
            {recentPayments.map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  p.status === 'paid' ? 'bg-green-500' : p.status === 'failed' ? 'bg-red-500' : 'bg-yellow-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.professional_name || p.professional_email}</p>
                  <p className="text-xs text-muted-foreground">{p.payment_date ? new Date(p.payment_date).toLocaleDateString('fr-BE') : '—'}</p>
                </div>
                <p className={`text-sm font-bold shrink-0 ${p.status === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                  {p.status === 'paid' ? '+' : ''}{p.amount} €
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Répartition abonnements */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <p className="text-sm font-semibold">Répartition des abonnements</p>
        {[
          { label: 'Actifs', count: activeSubs.length, color: 'bg-green-500' },
          { label: 'Essai gratuit', count: trialSubs.length, color: 'bg-blue-400' },
          { label: 'Expirés', count: expiredSubs.length, color: 'bg-red-400' },
          { label: 'Annulés', count: allSubs.filter(s => s.status === 'cancelled').length, color: 'bg-gray-400' },
        ].map(({ label, count, color }) => {
          const total = allSubs.length || 1;
          const pct = Math.round((count / total) * 100);
          return (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">{count} ({pct}%)</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}