import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Euro, CheckCircle, XCircle, CalendarDays } from 'lucide-react';
import { subDays, subWeeks, subMonths, format, startOfWeek, startOfMonth, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

const PERIODS = [
  { key: '7d', label: '7 jours' },
  { key: '4w', label: '4 semaines' },
  { key: '6m', label: '6 mois' },
];

export default function ProStats({ userEmail }) {
  const [period, setPeriod] = useState('4w');

  const { data: allJobs = [] } = useQuery({
    queryKey: ['proAllJobs', userEmail],
    queryFn: () => base44.entities.ServiceRequestV2.filter({ professional_email: userEmail }, '-created_date', 200),
    enabled: !!userEmail,
  });

  const { data: allReceived = [] } = useQuery({
    queryKey: ['proAllReceived', userEmail],
    queryFn: () => base44.entities.ServiceRequestV2.filter({ customer_email: userEmail }),
    enabled: false, // not needed
  });

  const stats = useMemo(() => {
    const now = new Date();
    const accepted = allJobs.filter(j => ['accepted', 'completed', 'in_progress'].includes(j.status));
    const declined = allJobs.filter(j => j.status === 'cancelled');
    const total = allJobs.length;
    const acceptanceRate = total > 0 ? Math.round((accepted.length / total) * 100) : 0;
    const totalRevenue = accepted.reduce((s, j) => s + (j.base_price || 0), 0);

    // Chart data
    let chartData = [];
    if (period === '7d') {
      chartData = Array.from({ length: 7 }, (_, i) => {
        const day = subDays(now, 6 - i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const jobs = accepted.filter(j => j.created_date?.startsWith?.(dayStr) || (j.created_date && format(new Date(j.created_date), 'yyyy-MM-dd') === dayStr));
        return {
          label: format(day, 'EEE', { locale: fr }),
          revenus: jobs.reduce((s, j) => s + (j.base_price || 0), 0),
          missions: jobs.length,
        };
      });
    } else if (period === '4w') {
      chartData = Array.from({ length: 4 }, (_, i) => {
        const weekStart = startOfWeek(subWeeks(now, 3 - i), { weekStartsOn: 1 });
        const weekEnd = subDays(startOfWeek(subWeeks(now, 2 - i), { weekStartsOn: 1 }), 1);
        const jobs = accepted.filter(j => {
          if (!j.created_date) return false;
          const d = new Date(j.created_date);
          return d >= weekStart && d <= weekEnd;
        });
        return {
          label: `S${format(weekStart, 'w')}`,
          revenus: jobs.reduce((s, j) => s + (j.base_price || 0), 0),
          missions: jobs.length,
        };
      });
    } else {
      chartData = Array.from({ length: 6 }, (_, i) => {
        const monthStart = startOfMonth(subMonths(now, 5 - i));
        const monthEnd = startOfMonth(subMonths(now, 4 - i));
        const jobs = accepted.filter(j => {
          if (!j.created_date) return false;
          const d = new Date(j.created_date);
          return d >= monthStart && d < monthEnd;
        });
        return {
          label: format(monthStart, 'MMM', { locale: fr }),
          revenus: jobs.reduce((s, j) => s + (j.base_price || 0), 0),
          missions: jobs.length,
        };
      });
    }

    // Current period revenue
    const periodStart = period === '7d' ? subDays(now, 7) : period === '4w' ? subWeeks(now, 4) : subMonths(now, 6);
    const periodJobs = accepted.filter(j => j.created_date && new Date(j.created_date) >= periodStart);
    const periodRevenue = periodJobs.reduce((s, j) => s + (j.base_price || 0), 0);

    return { accepted, total, acceptanceRate, totalRevenue, periodRevenue, chartData, periodJobs };
  }, [allJobs, period]);

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <Euro className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-xs text-muted-foreground font-medium">Revenus (période)</p>
          </div>
          <p className="text-2xl font-bold tracking-tight">{stats.periodRevenue.toFixed(0)} €</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-xs text-muted-foreground font-medium">Taux d'acceptation</p>
          </div>
          <p className="text-2xl font-bold tracking-tight">{stats.acceptanceRate}%</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{stats.accepted.length} / {stats.total} missions</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" strokeWidth={1.8} />
            <p className="text-xs text-muted-foreground font-medium">Total missions</p>
          </div>
          <p className="text-2xl font-bold tracking-tight">{stats.accepted.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <Euro className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-xs text-muted-foreground font-medium">Revenus totaux</p>
          </div>
          <p className="text-2xl font-bold tracking-tight">{stats.totalRevenue.toFixed(0)} €</p>
        </div>
      </div>

      {/* Period toggle */}
      <div className="flex gap-2">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              period === p.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <p className="text-xs font-semibold text-muted-foreground mb-3">Revenus (€)</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={stats.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
              formatter={(val) => [`${val} €`, 'Revenus']}
            />
            <Bar dataKey="revenus" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Missions bar */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <p className="text-xs font-semibold text-muted-foreground mb-3">Missions acceptées</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={stats.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
              formatter={(val) => [val, 'Missions']}
            />
            <Bar dataKey="missions" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}