import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, subDays, subMonths, isAfter, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Calendar, Filter, ChevronDown, CheckCircle2, Clock, XCircle, Loader2, AlertCircle } from 'lucide-react';
import MissionHistoryCard from '@/components/history/MissionHistoryCard';

const PERIOD_OPTIONS = [
  { label: 'Tout', value: 'all' },
  { label: '7 derniers jours', value: '7d' },
  { label: '30 derniers jours', value: '30d' },
  { label: '3 derniers mois', value: '3m' },
  { label: '6 derniers mois', value: '6m' },
];

const STATUS_OPTIONS = [
  { label: 'Tous les statuts', value: 'all' },
  { label: 'Terminés', value: 'completed' },
  { label: 'En cours', value: 'in_progress' },
  { label: 'Acceptés', value: 'accepted' },
  { label: 'Annulés', value: 'cancelled' },
];

function getPeriodStart(period) {
  const now = new Date();
  switch (period) {
    case '7d': return subDays(now, 7);
    case '30d': return subDays(now, 30);
    case '3m': return subMonths(now, 3);
    case '6m': return subMonths(now, 6);
    default: return null;
  }
}

export default function MissionHistory() {
  const [period, setPeriod] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isPro = user?.user_type === 'professionnel';

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['missionHistory', user?.email, isPro],
    queryFn: () => {
      if (!user?.email) return [];
      const filter = isPro
        ? { professional_email: user.email }
        : { customer_email: user.email };
      return base44.entities.ServiceRequestV2.filter(filter, '-created_date', 100);
    },
    enabled: !!user?.email,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['allInvoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 200),
    enabled: !!user?.email,
  });

  const invoiceMap = useMemo(() => {
    const map = {};
    invoices.forEach(inv => { map[inv.request_id] = inv; });
    return map;
  }, [invoices]);

  const filtered = useMemo(() => {
    const periodStart = getPeriodStart(period);
    return requests.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (periodStart) {
        const date = parseISO(r.created_date);
        if (!isAfter(date, periodStart)) return false;
      }
      return true;
    });
  }, [requests, period, statusFilter]);

  const stats = useMemo(() => {
    const completed = filtered.filter(r => r.status === 'completed');
    const total = completed.reduce((sum, r) => sum + (r.total_price || 0), 0);
    return { count: filtered.length, completedCount: completed.length, totalAmount: total };
  }, [filtered]);

  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label;
  const statusLabel = STATUS_OPTIONS.find(o => o.value === statusFilter)?.label;

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-4">
        <h1 className="text-xl font-bold text-foreground">Historique des missions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isPro ? 'Vos interventions passées' : 'Vos demandes de service'}
        </p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Stats banner */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.count}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completedCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Terminés</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalAmount.toFixed(0)}€</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{isPro ? 'Gagné' : 'Dépensé'}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {/* Period filter */}
          <div className="relative flex-1">
            <button
              onClick={() => { setShowPeriodMenu(v => !v); setShowStatusMenu(false); }}
              aria-label="Filtrer par période"
              className="w-full flex items-center justify-between gap-1 bg-card border border-border rounded-xl px-3 py-2.5 text-sm font-medium min-h-[44px]"
            >
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="truncate">{periodLabel}</span>
              </div>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${showPeriodMenu ? 'rotate-180' : ''}`} />
            </button>
            {showPeriodMenu && (
              <div className="absolute top-full mt-1 left-0 right-0 z-30 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setPeriod(opt.value); setShowPeriodMenu(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${period === opt.value ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status filter */}
          <div className="relative flex-1">
            <button
              onClick={() => { setShowStatusMenu(v => !v); setShowPeriodMenu(false); }}
              aria-label="Filtrer par statut"
              className="w-full flex items-center justify-between gap-1 bg-card border border-border rounded-xl px-3 py-2.5 text-sm font-medium min-h-[44px]"
            >
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Filter className="w-4 h-4 shrink-0" />
                <span className="truncate">{statusLabel}</span>
              </div>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
            </button>
            {showStatusMenu && (
              <div className="absolute top-full mt-1 left-0 right-0 z-30 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setStatusFilter(opt.value); setShowStatusMenu(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${statusFilter === opt.value ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Chargement de l'historique…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <FileText className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold text-foreground">Aucune mission trouvée</p>
            <p className="text-sm text-muted-foreground">Essayez de modifier vos filtres</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(request => (
              <MissionHistoryCard
                key={request.id}
                request={request}
                invoice={invoiceMap[request.id]}
                isPro={isPro}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}