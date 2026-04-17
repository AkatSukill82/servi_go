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
    <div className="min-h-full bg-background">
      {/* Header */}
      <div
        className="bg-card/95 backdrop-blur-md border-b border-border/50 sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-[-0.02em]">Messages</h1>
          {totalUnread > 0 && (
            <span className="text-xs font-bold bg-[#EF4444] text-white rounded-pill min-w-[20px] h-5 flex items-center justify-center px-1.5">
              {totalUnread}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="divide-y divide-border/50">
        {isLoading ? (
          [1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-12 h-12 rounded-full shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 shimmer rounded-lg w-2/5" />
                <div className="h-3 shimmer rounded-lg w-3/4" />
              </div>
            </div>
          ))
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="w-20 h-20 rounded-full bg-[#4F46E5]/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-[#4F46E5]" strokeWidth={1.5} />
            </div>
            <p className="text-base font-semibold">Aucun message</p>
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
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left tap-scale hover:bg-muted/30 transition-colors"
              >
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-[#4F46E5]/10 flex items-center justify-center text-sm font-bold text-[#4F46E5]">
                    {initials}
                  </div>
                  {hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#4F46E5] rounded-full border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <p className={`text-sm truncate ${hasUnread ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                      {conv.customer_name || 'Client'}
                    </p>
                    <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                      {relativeTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {conv.last_message_preview || 'Démarrez la conversation'}
                  </p>
                </div>
                {hasUnread && (
                  <span className="shrink-0 min-w-[20px] h-5 bg-[#4F46E5] text-white text-[11px] font-bold rounded-pill flex items-center justify-center px-1.5">
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