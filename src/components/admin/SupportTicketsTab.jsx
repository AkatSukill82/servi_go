import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Ticket, ChevronDown, ChevronUp, MessageSquare, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG = {
  new:              { label: 'Nouveau',        bg: 'bg-blue-100 text-blue-800' },
  in_progress:      { label: 'En cours',       bg: 'bg-amber-100 text-amber-800' },
  waiting_customer: { label: 'Attente client', bg: 'bg-orange-100 text-orange-800' },
  resolved:         { label: 'Résolu',         bg: 'bg-emerald-100 text-emerald-800' },
  closed:           { label: 'Fermé',          bg: 'bg-slate-100 text-slate-600' },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Faible',  bg: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Moyen',  bg: 'bg-amber-100 text-amber-700' },
  high:   { label: 'Élevé',  bg: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', bg: 'bg-red-100 text-red-700' },
};

const CATEGORY_LABELS = {
  support_technique: '🔧 Technique',
  question_service: '📋 Service',
  faq_generale: '❓ FAQ',
  facturation: '💳 Facturation',
  compte: '👤 Compte',
  autre: '📌 Autre',
};

const STATUS_TRANSITIONS = [
  { value: 'new', label: 'Nouveau' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'waiting_customer', label: 'Attente client' },
  { value: 'resolved', label: 'Résolu' },
  { value: 'closed', label: 'Fermé' },
];

const FILTER_TABS = [
  { value: 'all', label: 'Tous' },
  { value: 'new', label: 'Nouveaux' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'resolved', label: 'Résolus' },
];

function TicketCard({ ticket }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [response, setResponse] = useState(ticket.admin_response || '');

  const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.new;
  const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;

  const updateMut = useMutation({
    mutationFn: (data) => base44.entities.SupportTicket.update(ticket.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSupportTickets'] });
      queryClient.invalidateQueries({ queryKey: ['adminNewTicketsCount'] });
      toast.success('Ticket mis à jour');
    },
  });

  const dateStr = ticket.created_date
    ? (() => { try { return format(new Date(ticket.created_date), 'dd MMM · HH:mm', { locale: fr }); } catch { return ''; } })()
    : '';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left p-4 cursor-pointer active:bg-slate-50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
            ticket.status === 'new' ? 'bg-blue-50' : ticket.status === 'resolved' ? 'bg-emerald-50' : 'bg-slate-50'
          }`}>
            <Ticket className={`w-4 h-4 ${
              ticket.status === 'new' ? 'text-blue-500' : ticket.status === 'resolved' ? 'text-emerald-500' : 'text-slate-400'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{ticket.id.slice(-6).toUpperCase()}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.bg}`}>{status.label}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priority.bg}`}>{priority.label}</span>
            </div>
            <p className="text-sm font-bold text-slate-900 truncate">{ticket.subject}</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">{ticket.customer_name || ticket.customer_email}</p>
            <div className="flex items-center gap-2 mt-1">
              {ticket.category && <span className="text-[10px] text-slate-400">{CATEGORY_LABELS[ticket.category] || ticket.category}</span>}
              {dateStr && <span className="text-[10px] text-slate-400">{dateStr}</span>}
            </div>
          </div>
          <div className="shrink-0 mt-1">
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
          {ticket.ai_summary && (
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
              <p className="text-[10px] font-bold text-violet-600 uppercase mb-1">✨ Résumé IA</p>
              <p className="text-xs text-violet-900">{ticket.ai_summary}</p>
            </div>
          )}
          {ticket.customer_request && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Demande originale</p>
              <p className="text-xs text-slate-700 leading-relaxed">"{ticket.customer_request}"</p>
            </div>
          )}
          {ticket.conversation_context && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Historique</p>
              <p className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">{ticket.conversation_context}</p>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Changer le statut</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_TRANSITIONS.filter(s => s.value !== ticket.status).map(s => (
                <button key={s.value}
                  onClick={() => updateMut.mutate({ status: s.value, ...(s.value === 'resolved' ? { resolved_at: new Date().toISOString() } : {}) })}
                  className={`text-xs px-3 py-2 rounded-xl font-semibold cursor-pointer active:scale-95 transition-transform ${STATUS_CONFIG[s.value]?.bg || 'bg-slate-100 text-slate-600'}`}
                >{s.label}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Réponse admin</p>
            <textarea
              rows={3}
              value={response}
              onChange={e => setResponse(e.target.value)}
              placeholder="Répondre au client…"
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
            />
            <button
              onClick={() => updateMut.mutate({ admin_response: response })}
              disabled={updateMut.isPending || !response.trim()}
              className="mt-2 w-full py-2.5 rounded-xl bg-violet-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer active:scale-95 transition-transform"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {updateMut.isPending ? 'Enregistrement…' : 'Enregistrer la réponse'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SupportTicketsTab() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['adminSupportTickets'],
    queryFn: () => base44.entities.SupportTicket.list('-created_date', 200),
    refetchInterval: 30000,
  });

  const newCount = tickets.filter(t => t.status === 'new').length;
  const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  const filtered = tickets.filter(t => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchStatus && matchPriority;
  });

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',    value: tickets.length, color: 'text-slate-800' },
          { label: 'Nouveaux', value: newCount,        color: newCount > 0 ? 'text-blue-600' : 'text-slate-800' },
          { label: 'Résolus',  value: resolved,        color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
            <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {FILTER_TABS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === f.value ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}>
              {f.label}
              {f.value === 'new' && newCount > 0 && (
                <span className="bg-blue-500 text-white rounded-full text-[9px] px-1.5 py-0.5 font-bold">{newCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {[{ value: 'all', label: 'Toutes priorités' }, ...Object.entries(PRIORITY_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))].map(p => (
            <button key={p.value} onClick={() => setPriorityFilter(p.value)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                priorityFilter === p.value ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-slate-600">Aucun ticket</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => <TicketCard key={t.id} ticket={t} />)}
        </div>
      )}
    </div>
  );
}