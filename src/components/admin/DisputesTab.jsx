import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, ChevronDown, ChevronUp, AlertTriangle, Scale } from 'lucide-react';
import { toast } from 'sonner';

const DISPUTE_STATUS = {
  open:              { label: 'Ouvert',          bg: 'bg-amber-100 text-amber-800' },
  in_review:         { label: 'En cours',         bg: 'bg-blue-100 text-blue-800' },
  resolved_customer: { label: 'Résolu · Client',  bg: 'bg-emerald-100 text-emerald-800' },
  resolved_pro:      { label: 'Résolu · Pro',     bg: 'bg-emerald-100 text-emerald-800' },
  closed:            { label: 'Fermé',            bg: 'bg-slate-100 text-slate-600' },
};

const FILTER_OPTIONS = [
  { value: 'all',       label: 'Tous' },
  { value: 'open',      label: 'Ouverts' },
  { value: 'in_review', label: 'En cours' },
  { value: 'closed',    label: 'Fermés' },
];

export default function DisputesTab() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [adminNote, setAdminNote] = useState({});
  const [filter, setFilter] = useState('all');

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['adminDisputes'],
    queryFn: () => base44.entities.Dispute.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, dispute }) => {
      await base44.entities.Dispute.update(id, data);
      const isResolved = data.status?.startsWith('resolved');
      if (isResolved && dispute) {
        const inFavorOf = data.status === 'resolved_customer' ? 'client' : 'professionnel';
        const msg = `Votre litige a été résolu en faveur du ${inFavorOf}.${data.admin_note ? ' Note : ' + data.admin_note : ''}`;
        await Promise.all([
          dispute.customer_email && base44.entities.Notification.create({
            recipient_email: dispute.customer_email, recipient_type: 'particulier',
            type: 'dispute_resolved', title: 'Litige résolu', body: msg,
            request_id: dispute.request_id, action_url: `/Chat?requestId=${dispute.request_id}`,
          }),
          dispute.professional_email && base44.entities.Notification.create({
            recipient_email: dispute.professional_email, recipient_type: 'professionnel',
            type: 'dispute_resolved', title: 'Litige résolu', body: msg,
            request_id: dispute.request_id, action_url: `/Chat?requestId=${dispute.request_id}`,
          }),
        ].filter(Boolean));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDisputes'] });
      toast.success('Litige mis à jour');
    },
  });

  const filtered = filter === 'all' ? disputes : disputes.filter(d => d.status === filter);
  const openCount = disputes.filter(d => d.status === 'open' || d.status === 'in_review').length;

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: disputes.length, color: 'text-slate-700' },
          { label: 'Ouverts', value: openCount, color: openCount > 0 ? 'text-amber-600' : 'text-slate-700' },
          { label: 'Résolus', value: disputes.filter(d => d.status?.startsWith('resolved')).length, color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
            <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {FILTER_OPTIONS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              filter === f.value ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Aucun litige</p>
          <p className="text-xs text-slate-400 mt-1">Tout est en ordre !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const s = DISPUTE_STATUS[d.status] || DISPUTE_STATUS.open;
            const isOpen = expanded === d.id;
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : d.id)}
                  className="w-full text-left p-4 cursor-pointer active:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Scale className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-bold text-slate-900 truncate">{d.reason}</p>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${s.bg}`}>{s.label}</span>
                      </div>
                      <p className="text-xs text-slate-500">{d.customer_name} <span className="text-slate-300">vs</span> {d.professional_name}</p>
                      {d.amount_disputed > 0 && (
                        <p className="text-xs font-semibold text-red-600 mt-0.5">{d.amount_disputed} € en litige</p>
                      )}
                    </div>
                    <div className="shrink-0 mt-1">
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                    {d.description && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-600 leading-relaxed">{d.description}</p>
                      </div>
                    )}
                    <textarea
                      rows={2}
                      value={adminNote[d.id] ?? d.admin_note ?? ''}
                      onChange={e => setAdminNote(n => ({ ...n, [d.id]: e.target.value }))}
                      placeholder="Note interne (visible admin uniquement)…"
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                    />
                    <div className="flex flex-wrap gap-2">
                      {d.status !== 'in_review' && (
                        <button
                          onClick={() => updateMutation.mutate({ id: d.id, data: { status: 'in_review', admin_note: adminNote[d.id] ?? d.admin_note }, dispute: d })}
                          className="text-xs px-3 py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold cursor-pointer active:scale-95 transition-transform"
                        >Prendre en charge</button>
                      )}
                      <button
                        onClick={() => updateMutation.mutate({ id: d.id, data: { status: 'resolved_customer', admin_note: adminNote[d.id] ?? d.admin_note }, dispute: d })}
                        className="text-xs px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-semibold cursor-pointer active:scale-95 transition-transform"
                      >Résolu → Client</button>
                      <button
                        onClick={() => updateMutation.mutate({ id: d.id, data: { status: 'resolved_pro', admin_note: adminNote[d.id] ?? d.admin_note }, dispute: d })}
                        className="text-xs px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-semibold cursor-pointer active:scale-95 transition-transform"
                      >Résolu → Pro</button>
                      <button
                        onClick={() => updateMutation.mutate({ id: d.id, data: { status: 'closed', admin_note: adminNote[d.id] ?? d.admin_note }, dispute: d })}
                        className="text-xs px-3 py-2 rounded-xl bg-slate-100 text-slate-600 font-semibold cursor-pointer active:scale-95 transition-transform"
                      >Fermer</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}