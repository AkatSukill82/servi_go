import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle, ChevronRight, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';

const STATUS_LABELS = {
  searching: 'Recherche en cours',
  pending_pro: 'En attente du pro',
  accepted: 'Acceptée',
  contract_pending: 'Contrat envoyé',
  contract_signed: 'Contrat signé',
  pro_en_route: 'Pro en route',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
  disputed: 'Litige',
};

const STATUS_COLOR = {
  searching: 'bg-orange-100 text-orange-700',
  pending_pro: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  contract_pending: 'bg-purple-100 text-purple-700',
  contract_signed: 'bg-indigo-100 text-indigo-700',
  pro_en_route: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  disputed: 'bg-red-100 text-red-700',
};

export default function Messages() {
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isPro = user?.user_type === 'professionnel';

  // Load conversations — works for both client and pro
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', user?.email],
    queryFn: async () => {
      if (isPro) {
        return base44.entities.Conversation.filter({ professional_email: user.email }, '-last_message_at', 50);
      }
      return base44.entities.Conversation.filter({ customer_email: user.email }, '-last_message_at', 50);
    },
    enabled: !!user?.email,
    refetchInterval: 10000,
  });

  // Fallback: also load requests for users who don't have Conversation records yet
  const { data: requests = [] } = useQuery({
    queryKey: ['myRequests', user?.email],
    queryFn: () => {
      if (isPro) return base44.entities.ServiceRequestV2.filter({ professional_email: user.email }, '-updated_date', 50);
      return base44.entities.ServiceRequestV2.filter({ customer_email: user.email }, '-updated_date', 50);
    },
    enabled: !!user?.email && conversations.length === 0,
  });

  // If conversations exist, use them; otherwise fall back to requests
  const useConversations = conversations.length > 0;
  const chats = useConversations
    ? conversations
    : requests.filter(r => r.professional_email);

  return (
    <div className="min-h-full bg-background">
      <div className="px-5 pt-7 pb-4">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Messages</h1>
        <p className="text-sm text-muted-foreground">Vos conversations avec les artisans</p>
      </div>

      {isLoading ? (
        <div className="space-y-3 px-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : chats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <MessageCircle className="w-8 h-8 text-primary" />
          </div>
          <p className="font-semibold text-lg">Aucune conversation</p>
          <p className="text-sm text-muted-foreground mt-1">
            Vos échanges avec les artisans apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-2 px-4 pb-8">
          {chats.map((item, i) => {
            // Support both Conversation and ServiceRequestV2 shapes
            const isConv = useConversations;
            const proName = isConv ? item.professional_name : item.professional_name;
            const subtitle = isConv
              ? (item.last_message_preview || 'Démarrer la conversation')
              : item.category_name;
            const timestamp = isConv ? item.last_message_at : item.updated_date;
            const status = !isConv ? item.status : null;
            const unread = isConv && item[isPro ? 'unread_count_pro' : 'unread_count_customer'];
            const navigateTo = isConv
              ? (item.request_id ? `/Chat?requestId=${item.request_id}` : `/Chat?conversationId=${item.id}`)
              : `/Chat?requestId=${item.id}`;

            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(navigateTo)}
                className="w-full bg-card rounded-2xl border border-border p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
                    {(proName || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-semibold text-sm truncate">{proName || 'Professionnel'}</p>
                    {timestamp && (
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: fr })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                  {status && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${STATUS_COLOR[status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[status] || status}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}