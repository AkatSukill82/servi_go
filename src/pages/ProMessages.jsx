import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

function relativeTime(dateStr) {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: fr });
  } catch {
    return '';
  }
}

export default function ProMessages() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['proConversations', user?.email],
    queryFn: () => base44.entities.Conversation.filter(
      { professional_email: user.email },
      '-last_message_at',
      50
    ),
    enabled: !!user?.email,
    staleTime: 10000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.email) return;
    const unsub = base44.entities.Conversation.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['proConversations', user.email] });
    });
    return unsub;
  }, [user?.email, queryClient]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count_pro || 0), 0);

  return (
    <div className="min-h-full bg-[#F8F8F6]">
      {/* Header */}
      <div className="bg-white border-b border-border/50 shadow-sm px-5 pt-8 pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">Messages</h1>
          {totalUnread > 0 && (
            <span className="text-xs font-bold bg-red-500 text-white rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
              {totalUnread}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="px-4 py-3 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-foreground">Aucune conversation pour le moment</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">Vos échanges avec les clients apparaîtront ici</p>
          </div>
        ) : (
          conversations.map(conv => {
            const initials = (conv.customer_name || 'C').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const hasUnread = (conv.unread_count_pro || 0) > 0;
            return (
              <button
                key={conv.id}
                onClick={() => conv.request_id && navigate(`/Chat?requestId=${conv.request_id}`)}
                className="w-full bg-white rounded-2xl border border-border/50 shadow-sm px-4 py-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
              >
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {initials}
                  </div>
                  {hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-sm truncate ${hasUnread ? 'font-bold' : 'font-medium'}`}>
                      {conv.customer_name || 'Client'}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {relativeTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.last_message_preview || 'Démarrez la conversation'}
                  </p>
                </div>
                {hasUnread && (
                  <span className="shrink-0 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                    {conv.unread_count_pro}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}