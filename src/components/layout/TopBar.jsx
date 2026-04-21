import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ServiGoIcon } from '@/components/brand/ServiGoLogo';

const BRAND = '#6C5CE7';

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
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const unreadCount = notifs.length;

  const markAllRead = async () => {
    for (const n of notifs) {
      await base44.entities.Notification.update(n.id, { is_read: true });
    }
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
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/40"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-3 px-4 h-16">

          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #6C5CE7, #a78bfa)', boxShadow: '0 2px 10px rgba(108,92,231,0.3)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="rgba(255,255,255,0.2)"/>
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-base font-black tracking-tight" style={{ color: BRAND }}>ServiGo</span>
          </div>

          {/* Greeting + location — centered */}
          <div className="flex-1 min-w-0 text-center">
            <p className="text-sm font-bold truncate text-foreground leading-tight">{title}</p>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-0.5 leading-none mt-0.5">
                <MapPin className="w-2.5 h-2.5 shrink-0" style={{ color: BRAND }} />
                <span className="truncate">{subtitle}</span>
              </p>
            )}
          </div>

          {/* Bell */}
          <div className="relative shrink-0">
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center tap-scale relative"
              style={{ background: unreadCount > 0 ? `${BRAND}12` : 'hsl(var(--muted))' }}
            >
              <Bell className="w-5 h-5" style={{ color: unreadCount > 0 ? BRAND : undefined }} strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                  style={{ background: '#E17055' }}>
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
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="fixed top-[calc(env(safe-area-inset-top)+64px)] right-3 z-50 w-80 bg-card border border-border rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 8px 32px rgba(108,92,231,0.14)' }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-bold">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs font-semibold" style={{ color: BRAND }}>Tout marquer lu</button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
                {notifs.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">Aucune nouvelle notification</p>
                  </div>
                ) : notifs.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    style={{ background: `${BRAND}06` }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: BRAND }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">{n.title}</p>
                        {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_date)}</p>
                      </div>
                    </div>
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