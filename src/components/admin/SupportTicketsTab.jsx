import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Ticket, ChevronDown, ChevronUp, MessageSquare, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG = {
  new:              { label: 'Nouveau',          color: 'bg-blue-100 text-blue-700 border-blue-200' },
  in_progress:      { label: 'En cours',         color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  waiting_customer: { label: 'Attente client',   color: 'bg-orange-100 text-orange-700 border-orange-200' },
  resolved:         { label: 'Résolu',           color: 'bg-green-100 text-green-700 border-green-200' },
  closed:           { label: 'Fermé',            color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Faible', color: 'bg-gray-100 text-gray-500' },
  medium: { label: 'Moyen', color: 'bg-yellow-100 text-yellow-700' },
  high:   { label: 'Élevé', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
};

const CATEGORY_LABELS = {
  support_technique: '🔧 Support technique',
  question_service:  '📋 Question service',
  faq_generale:      '❓ FAQ générale',
  facturation:       '💳 Facturation',
  compte:            '👤 Compte',
  autre:             '📌 Autre',
};

const STATUS_TRANSITIONS = [
  { value: 'new',              label: 'Nouveau' },
  { value: 'in_progress',      label: 'En cours' },
  { value: 'waiting_customer', label: 'Attente client' },
  { value: 'resolved',         label: 'Résolu' },
  { value: 'closed',           label: 'Fermé' },
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

  const dateStr = ticket.created_date ? (() => {
    try { return format(new Date(ticket.created_date), 'dd MMM yyyy HH:mm', { locale: fr }); } catch { return ticket.created_date; }
  })() : '';

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-[10px] text-muted-foreground">#{ticket.id.slice(-6).toUpperCase()}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priority.color}`}>{priority.label}</span>
            </div>
            <p className="font-semibold text-sm truncate">{ticket.subject}</p>
            <p className="text-xs text-muted-foreground truncate">{ticket.customer_name} · {ticket.customer_email}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {ticket.category && <span className="text-[10px] text-muted-foreground">{CATEGORY_LABELS[ticket.category] || ticket.category}</span>}
              <span className="text-[10px] text-muted-foreground">{dateStr}</span>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-3">
          {/* AI summary */}
          {ticket.ai_summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-blue-700 uppercase mb-1">Résumé IA</p>
              <p className="text-xs text-blue-900">{ticket.ai_summary}</p>
            </div>
          )}

          {/* Original request */}
          {ticket.customer_request && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Demande originale</p>
              <p className="text-xs text-gray-700 italic">"{ticket.customer_request}"</p>
            </div>
          )}

          {/* Conversation */}
          {ticket.conversation_context && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Historique de la conversation</p>
              <div className="bg-muted/40 rounded-xl p-3 max-h-48 overflow-y-auto">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{ticket.conversation_context}</p>
              </div>
            </div>
          )}

          {/* Status change */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Changer le statut</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_TRANSITIONS.filter(s => s.value !== ticket.status).map(s => (
                <button key={s.value} onClick={() => updateMut.mutate({ status: s.value, ...(s.value === 'resolved' ? { resolved_at: new Date().toISOString() } : {}) })}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${STATUS_CONFIG[s.value]?.color} border`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Admin response */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Réponse admin</p>
            <textarea
              rows={3}
              value={response}
              onChange={e => setResponse(e.target.value)}
              placeholder="Répondre au client (envoyé par email)..."
              className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-muted/40 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={() => updateMut.mutate({ admin_response: response })}
              disabled={updateMut.isPending || !response.trim()}
              className="mt-2 text-xs px-4 py-2 rounded-lg text-white font-semibold disabled:opacity-40 flex items-center gap-1.5"
              style={{ backgroundColor: '#1a1a2e' }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {updateMut.isPending ? 'Enregistrement...' : 'Enregistrer la réponse'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
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

  const filtered = tickets.filter(t => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchStatus && matchPriority;
  });

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total', value: tickets.length, icon: Ticket, color: 'text-blue-600' },
          { label: 'Nouveaux', value: newCount, icon: AlertTriangle, color: 'text-orange-600' },
          { label: 'Résolus', value: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length, icon: CheckCircle, color: 'text-green-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card rounded-xl border border-border p-3 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <p className="text-lg font-bold">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {[{ value: 'all', label: 'Tous' }, ...STATUS_TRANSITIONS].map(s => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${statusFilter === s.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}>
              {s.label}
              {s.value === 'new' && newCount > 0 && (
                <span className="ml-1.5 bg-orange-500 text-white rounded-full text-[9px] px-1.5 py-0.5">{newCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[{ value: 'all', label: 'Toutes priorités' }, ...Object.entries(PRIORITY_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))].map(p => (
            <button key={p.value} onClick={() => setPriorityFilter(p.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${priorityFilter === p.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <Ticket className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun ticket</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => <TicketCard key={t.id} ticket={t} />)}
        </div>
      )}
    </div>
  );
}