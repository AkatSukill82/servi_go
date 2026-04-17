import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'à l\'instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

export default function TopBar({ title, subtitle }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), staleTime: 60000 });

  const { data: notifs = [] } = useQuery({
    queryKey: ['unreadNotifs', user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user.email, is_read: false }, '-created_date', 20),
    enabled: !!user?.email,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const unreadCount = notifs.length;

  const markAllRead = async () => {
    await Promise.all(notifs.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    queryClient.invalidateQueries({ queryKey: ['unreadNotifs', user?.email] });
  };

  const handleNotifClick = (notif) => {
    base44.entities.Notification.update(notif.id, { is_read: true }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['unreadNotifs', user?.email] });
    setNotifOpen(false);
    if (notif.action_url) navigate(notif.action_url);
  };

  return (
    <>
      <div
        className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border/50"
        style={{ paddingTop: 0 }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left: title + subtitle */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold tracking-[-0.01em] truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 leading-none mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" /> {subtitle}
              </p>
            )}
          </div>

          {/* Right: notification bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="w-10 h-10 rounded-full flex items-center justify-center tap-scale relative bg-muted/60"
            >
              <Bell className="w-5 h-5 text-foreground" strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#EF4444] rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications dropdown */}
      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setNotifOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[calc(env(safe-area-inset-top)+56px)] right-3 z-50 w-80 bg-card border border-border rounded-xl shadow-float overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-[#4F46E5] font-medium">Tout marquer lu</button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
                {notifs.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">Aucune nouvelle notification</p>
                  </div>
                ) : notifs.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className="w-full px-4 py-3 text-left hover:bg-[#4F46E5]/5 transition-colors bg-[#4F46E5]/5"
                  >
                    <p className="text-sm font-medium text-foreground leading-tight">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.created_date)}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}