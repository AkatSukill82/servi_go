import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BRAND } from '@/lib/theme';

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

export default function TopBar() {
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  const { data: notifs = [] } = useQuery({
    queryKey: ['unreadNotifs', user?.email],
    queryFn: () => base44.entities.Notification.filter(
      { recipient_email: user.email, is_read: false }, '-created_date', 20
    ),
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

  const city = user?.address?.split(',')[0]?.trim() || 'Belgique';

  return (
    <>
      <div className="sticky top-0 z-30 bg-background border-b border-border/80" style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between px-5 h-14 relative">

          {/* Location pill */}
          <button
            onClick={() => navigate('/Map')}
            className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5 active:scale-95 transition-transform shrink-0 z-10"
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: BRAND }} />
            <span className="text-xs font-semibold text-foreground max-w-[120px] truncate">{city}</span>
            <span className="text-muted-foreground text-xs">›</span>
          </button>

          {/* Logo centré — au-dessus mais ne chevauche pas */}
          <span className="absolute left-1/2 -translate-x-1/2 text-xl font-black tracking-tight select-none pointer-events-none" style={{ color: BRAND }}>
            ServiGo
          </span>

          {/* Bell */}
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative w-10 h-10 flex items-center justify-center rounded-full bg-muted active:scale-95 transition-transform shrink-0 z-10"
          >
            <Bell className="w-4.5 h-4.5 text-foreground" strokeWidth={1.8} style={{ width: 18, height: 18 }} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                style={{ background: '#E17055' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications dropdown */}
      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setNotifOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="fixed top-[calc(env(safe-area-inset-top)+60px)] right-3 z-50 w-80 bg-card border border-border rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-bold text-foreground">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs font-semibold" style={{ color: BRAND }}>
                    Tout lire
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">Aucune nouvelle notification</p>
                  </div>
                ) : notifs.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/40 transition-colors border-b border-border/30 last:border-0"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: BRAND }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">{n.title}</p>
                        {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_date)}</p>
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