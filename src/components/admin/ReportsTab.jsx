import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Flag, ShieldAlert, User } from 'lucide-react';
import { toast } from 'sonner';

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
  low:    { label: 'Faible',  bg: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Moyen',  bg: 'bg-amber-100 text-amber-700' },
  high:   { label: 'Haut',   bg: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', bg: 'bg-red-100 text-red-700' },
};

const STATUS_OPTIONS = [
  { value: 'all',             label: 'Tous' },
  { value: 'pending',         label: 'En attente' },
  { value: 'under_review',    label: 'En examen' },
  { value: 'resolved_warning',label: 'Avertissement' },
  { value: 'resolved_banned', label: 'Banni' },
  { value: 'dismissed',       label: 'Rejeté' },
];

const STATUS_BADGE = {
  pending:          'bg-amber-100 text-amber-800',
  under_review:     'bg-blue-100 text-blue-800',
  resolved_warning: 'bg-orange-100 text-orange-800',
  resolved_banned:  'bg-red-100 text-red-800',
  dismissed:        'bg-slate-100 text-slate-600',
};

export default function ReportsTab() {
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
        if (users.length > 0) {
          await base44.entities.User.update(users[0].id, {
            is_blacklisted: true,
            blacklist_reason: `Banni suite signalement : ${REASON_LABELS[report.reason] || report.reason}`,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      toast.success('Signalement mis à jour');
    },
  });

  const filtered = statusFilter === 'all' ? reports : reports.filter(r => r.status === statusFilter);
  const pendingCount = reports.filter(r => r.status === 'pending').length;

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',        value: reports.length },
          { label: 'En attente',   value: pendingCount,  urgent: pendingCount > 0 },
          { label: 'Bannis',       value: reports.filter(r => r.status === 'resolved_banned').length },
        ].map(({ label, value, urgent }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
            <p className={`text-2xl font-black tabular-nums ${urgent ? 'text-red-600' : 'text-slate-800'}`}>{value}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {STATUS_OPTIONS.map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === s.value ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
            <Flag className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-600">Aucun signalement</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const priority = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.medium;
            const statusBg = STATUS_BADGE[r.status] || 'bg-slate-100 text-slate-600';
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{r.reported_user_name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.reported_user_type === 'professionnel' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}>{r.reported_user_type === 'professionnel' ? 'Pro' : 'Client'}</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{r.reported_user_email}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1.5">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${priority.bg}`}>{priority.label}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${statusBg}`}>{STATUS_OPTIONS.find(s => s.value === r.status)?.label || r.status}</span>
                      <span className="text-xs font-medium text-slate-700">{REASON_LABELS[r.reason] || r.reason}</span>
                    </div>
                  </div>
                </div>

                {r.description && (
                  <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-slate-600 leading-relaxed">{r.description}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {r.status !== 'under_review' && (
                    <button
                      onClick={() => updateMutation.mutate({ id: r.id, data: { status: 'under_review' }, report: r })}
                      className="text-xs px-3 py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold cursor-pointer active:scale-95 transition-transform"
                    >En examen</button>
                  )}
                  <button
                    onClick={() => updateMutation.mutate({ id: r.id, data: { status: 'resolved_warning', user_suspended: false }, report: r })}
                    className="text-xs px-3 py-2 rounded-xl bg-amber-50 text-amber-700 font-semibold cursor-pointer active:scale-95 transition-transform"
                  >⚠ Avertissement</button>
                  <button
                    onClick={() => updateMutation.mutate({ id: r.id, data: { status: 'resolved_banned', user_suspended: true }, report: r })}
                    className="text-xs px-3 py-2 rounded-xl bg-red-50 text-red-700 font-semibold cursor-pointer active:scale-95 transition-transform"
                  >🚫 Bannir</button>
                  <button
                    onClick={() => updateMutation.mutate({ id: r.id, data: { status: 'dismissed' }, report: r })}
                    className="text-xs px-3 py-2 rounded-xl bg-slate-100 text-slate-600 font-semibold cursor-pointer active:scale-95 transition-transform"
                  >Rejeter</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}