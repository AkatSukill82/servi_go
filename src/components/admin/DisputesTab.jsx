import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const DISPUTE_STATUS = {
  open: { label: 'Ouvert', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  in_review: { label: 'En cours', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  resolved_customer: { label: 'Résolu (client)', color: 'bg-green-100 text-green-700 border-green-200' },
  resolved_pro: { label: 'Résolu (pro)', color: 'bg-green-100 text-green-700 border-green-200' },
  closed: { label: 'Fermé', color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export default function DisputesTab() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [adminNote, setAdminNote] = useState({});

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
        const msg = `Votre litige a été résolu en faveur du ${inFavorOf}. ${data.admin_note ? 'Note : ' + data.admin_note : ''}`;
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

  const openCount = disputes.filter(d => d.status === 'open' || d.status === 'in_review').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">{disputes.length} litige{disputes.length !== 1 ? 's' : ''}</p>
        {openCount > 0 && <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200 text-xs">{openCount} ouvert{openCount !== 1 ? 's' : ''}</Badge>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun litige en cours</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map(d => {
            const s = DISPUTE_STATUS[d.status] || DISPUTE_STATUS.open;
            const isOpen = expanded === d.id;
            return (
              <motion.div key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-border overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : d.id)}
                  className="w-full text-left p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{d.reason}</p>
                      <Badge className={`${s.color} border text-xs shrink-0`}>{s.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{d.customer_name} vs {d.professional_name}</p>
                    {d.amount_disputed > 0 && <p className="text-xs text-muted-foreground">{d.amount_disputed} € en litige</p>}
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                    {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
                    <textarea
                      rows={2}
                      value={adminNote[d.id] ?? d.admin_note ?? ''}
                      onChange={e => setAdminNote(n => ({ ...n, [d.id]: e.target.value }))}
                      placeholder="Note interne (visible admin uniquement)..."
                      className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-muted/40 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <div className="flex flex-wrap gap-2">
                      {d.status !== 'in_review' && (
                        <button onClick={() => updateMutation.mutate({ id: d.id, data: { status: 'in_review', admin_note: adminNote[d.id] ?? d.admin_note }, dispute: d })}
                          className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 bg-blue-50 font-medium">
                          Prendre en charge
                        </button>
                      )}
                      <button onClick={() => updateMutation.mutate({ id: d.id, data: { status: 'resolved_customer', admin_note: adminNote[d.id] ?? d.admin_note }, dispute: d })}
                        className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-700 bg-green-50 font-medium">
                        Résolu → Client
                      </button>
                      <button onClick={() => updateMutation.mutate({ id: d.id, data: { status: 'resolved_pro', admin_note: adminNote[d.id] ?? d.admin_note }, dispute: d })}
                        className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-700 bg-green-50 font-medium">
                        Résolu → Pro
                      </button>
                      <button onClick={() => updateMutation.mutate({ id: d.id, data: { status: 'closed', admin_note: adminNote[d.id] ?? d.admin_note }, dispute: d })}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground bg-muted font-medium">
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
