import React, { useState } from 'react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Search, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import PullToRefresh from '@/components/ui/PullToRefresh';

function relativeTime(dateStr) {
  if (!dateStr) return '';
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: false, locale: fr }); }
  catch { return ''; }
}

function ConvSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50">
      <div className="w-12 h-12 rounded-full shimmer shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 shimmer rounded-lg w-2/5" />
        <div className="h-3 shimmer rounded-lg w-3/4" />
      </div>
      <div className="h-3 shimmer rounded-lg w-8 shrink-0" />
    </div>
  );
}

export default function Messages() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const isPro = user?.user_type === 'professionnel';

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', user?.email],
    queryFn: () => isPro
      ? base44.entities.Conversation.filter({ professional_email: user.email }, '-last_message_at', 50)
      : base44.entities.Conversation.filter({ customer_email: user.email }, '-last_message_at', 50),
    enabled: !!user?.email,
    refetchInterval: 10000,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['myRequests', user?.email],
    queryFn: () => isPro
      ? base44.entities.ServiceRequestV2.filter({ professional_email: user.email }, '-updated_date', 50)
      : base44.entities.ServiceRequestV2.filter({ customer_email: user.email }, '-updated_date', 50),
    enabled: !!user?.email && conversations.length === 0,
  });

  const useConv = conversations.length > 0;
  const rawChats = useConv ? conversations : requests.filter(r => r.professional_email);

  const chats = rawChats.filter(item => {
    if (!search.trim()) return true;
    const name = useConv
      ? (isPro ? item.customer_name : item.professional_name)
      : item.professional_name;
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ['conversations', user?.email] });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-full bg-background">
        {/* Header */}
        <div
          className="bg-card/95 backdrop-blur-md border-b border-border/50 px-4 pt-4 pb-3 sticky top-0 z-20"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
        >
          <h1 className="text-xl font-semibold tracking-[-0.02em] mb-3">Messages</h1>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une conversation…"
              className="w-full h-10 pl-9 pr-8 rounded-lg bg-muted text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              style={{ fontSize: 16 }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div>
            {[1, 2, 3, 4].map(i => <ConvSkeleton key={i} />)}
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[#4F46E5]/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-[#4F46E5]" strokeWidth={1.5} />
            </div>
            <p className="text-base font-semibold">Aucun message</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Vos échanges avec les artisans apparaîtront ici.
            </p>
            <button
              onClick={() => navigate('/Home')}
              className="mt-6 bg-[#4F46E5] text-white text-sm font-semibold px-6 py-3 rounded-pill tap-scale"
            >
              Trouver un artisan
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {chats.map((item, i) => {
              const name = useConv
                ? (isPro ? item.customer_name : item.professional_name)
                : item.professional_name;
              const preview = useConv
                ? (item.last_message_preview || 'Démarrer la conversation')
                : item.category_name;
              const ts = useConv ? item.last_message_at : item.updated_date;
              const unread = useConv ? (item[isPro ? 'unread_count_pro' : 'unread_count_customer'] || 0) : 0;
              const hasUnread = unread > 0;
              const navigateTo = useConv
                ? (item.request_id ? `/Chat?requestId=${item.request_id}` : `/Chat?conversationId=${item.id}`)
                : `/Chat?requestId=${item.id}`;
              const initials = (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(navigateTo)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left tap-scale hover:bg-muted/30 transition-colors"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-[#4F46E5]/10 flex items-center justify-center text-sm font-bold text-[#4F46E5]">
                      {initials}
                    </div>
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#4F46E5] rounded-full border-2 border-card" />
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <p className={`text-sm truncate ${hasUnread ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                        {name || 'Professionnel'}
                      </p>
                      {ts && (
                        <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                          {relativeTime(ts)}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate ${hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {preview}
                    </p>
                  </div>

                  {/* Unread badge */}
                  {hasUnread && (
                    <span className="shrink-0 min-w-[20px] h-5 bg-[#4F46E5] text-white text-[11px] font-bold rounded-pill flex items-center justify-center px-1.5">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}