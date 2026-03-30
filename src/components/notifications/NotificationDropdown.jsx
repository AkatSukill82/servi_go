import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Zap, FileText, Star, AlertTriangle, CreditCard, MessageCircle, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const NOTIF_ICONS = {
  new_mission: { icon: Zap, color: 'text-violet-600 bg-violet-50' },
  mission_accepted: { icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  contract_to_sign: { icon: FileText, color: 'text-blue-600 bg-blue-50' },
  contract_signed: { icon: FileText, color: 'text-green-600 bg-green-50' },
  pro_en_route: { icon: Zap, color: 'text-violet-600 bg-violet-50' },
  mission_completed: { icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  review_request: { icon: Star, color: 'text-yellow-600 bg-yellow-50' },
  dispute_opened: { icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  subscription_renewal: { icon: CreditCard, color: 'text-violet-600 bg-violet-50' },
  subscription_expired: { icon: CreditCard, color: 'text-red-600 bg-red-50' },
  subscription_activated: { icon: CreditCard, color: 'text-green-600 bg-green-50' },
  message_received: { icon: MessageCircle, color: 'text-blue-600 bg-blue-50' },
  new_review: { icon: Star, color: 'text-yellow-600 bg-yellow-50' },
};

function getNotifUrl(n) {
  if (n.request_id) {
    const chatTypes = ['mission_accepted', 'contract_to_sign', 'contract_signed', 'pro_en_route', 'mission_started', 'mission_completed', 'message_received', 'new_review', 'dispute_opened'];
    if (chatTypes.includes(n.type)) return `/Chat?requestId=${n.request_id}`;
    if (n.type === 'new_mission') return `/ProDashboard`;
  }
  if (n.type === 'subscription_renewal' || n.type === 'subscription_expired' || n.type === 'subscription_activated') return '/ProSubscription';
  if (n.action_url) return n.action_url;
  return null;
}

export default function NotificationDropdown({ userEmail }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifDropdown', userEmail],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: userEmail }, '-created_date', 10),
    enabled: !!userEmail,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifDropdown', userEmail] }),
  });

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full bg-card border border-border shadow-sm active:scale-95 transition-transform"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-foreground" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-[200] overflow-hidden"
            style={{ top: '100%' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  <Check className="w-3 h-3" /> Tout marquer comme lu
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Tout est à jour !</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Vos notifications apparaîtront ici.</p>
                </div>
              ) : (
                notifications.slice(0, 8).map(n => {
                  const config = NOTIF_ICONS[n.type] || { icon: Bell, color: 'text-muted-foreground bg-muted' };
                  const Icon = config.icon;
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors cursor-pointer hover:bg-muted/40 ${!n.is_read ? 'bg-primary/5' : ''}`}
                      onClick={() => {
                        if (!n.is_read) base44.entities.Notification.update(n.id, { is_read: true }).then(() => queryClient.invalidateQueries({ queryKey: ['notifDropdown', userEmail] }));
                        setOpen(false);
                        const url = getNotifUrl(n);
                        if (url) navigate(url);
                      }}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-sm leading-tight ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                          {!n.is_read && <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1" />}
                        </div>
                        {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {n.created_date ? formatDistanceToNow(new Date(n.created_date), { locale: fr, addSuffix: true }) : ''}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}