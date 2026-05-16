import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Flag } from 'lucide-react';
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
