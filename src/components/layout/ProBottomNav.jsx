import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, CalendarDays, MessageCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';

const MISSION_TYPES = ['new_mission','mission_accepted','mission_refused','contract_to_sign','contract_signed','pro_en_route','mission_started','mission_completed','dispute_opened','dispute_resolved'];
const MESSAGE_TYPES = ['message_received'];

function NavBadge({ count }) {
  if (!count) return null;
  return (
    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 bg-[#EF4444] rounded-pill flex items-center justify-center text-[10px] font-bold text-white px-0.5 leading-none">
      {count > 9 ? '9+' : count}
    </span>
  );
}

function NavItem({ path, icon: Icon, label, badge, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-[44px] min-h-[44px] justify-center tap-scale relative"
    >
      <div className="relative">
        {isActive && (
          <motion.div
            layoutId="pro-nav-indicator"
            className="absolute -inset-2 bg-[#4F46E5]/10 rounded-xl"
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          />
        )}
        <Icon
          style={{ width: 22, height: 22, position: 'relative', zIndex: 1 }}
          strokeWidth={isActive ? 2.2 : 1.6}
          className={isActive ? 'text-[#4F46E5]' : 'text-muted-foreground'}
        />
        <NavBadge count={badge} />
      </div>
      <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-[#4F46E5]' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </button>
  );
}

export default function ProBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), staleTime: 60000 });

  const { data: notifs = [] } = useQuery({
    queryKey: ['proUnreadNotifs', user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user.email, is_read: false }, '-created_date', 100),
    enabled: !!user?.email,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const missionBadge = notifs.filter(n => MISSION_TYPES.includes(n.type)).length;
  const messageBadge = notifs.filter(n => MESSAGE_TYPES.includes(n.type)).length;
  const profileIncomplete = user && (!user.photo_url || !user.phone || user.eid_status !== 'verified') ? 1 : 0;

  useEffect(() => {
    if (!user?.email || !notifs.length) return;
    const toMark = notifs.filter(n => {
      if (['/ProDashboard'].includes(location.pathname)) return MISSION_TYPES.includes(n.type);
      if (['/ProMessages'].includes(location.pathname)) return MESSAGE_TYPES.includes(n.type);
      return false;
    });
    if (!toMark.length) return;
    Promise.all(toMark.map(n => base44.entities.Notification.update(n.id, { is_read: true })))
      .then(() => queryClient.invalidateQueries({ queryKey: ['proUnreadNotifs', user.email] }));
  }, [location.pathname, user?.email]);

  const navItems = [
    { path: '/ProDashboard', icon: LayoutDashboard, label: 'Dashboard', badge: missionBadge },
    { path: '/ProAgenda',    icon: CalendarDays,    label: 'Agenda',    badge: 0 },
    { path: '/ProMessages',  icon: MessageCircle,   label: 'Messages',  badge: messageBadge },
    { path: '/ProProfile',   icon: User,            label: 'Profil',    badge: profileIncomplete },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="w-full max-w-2xl mx-auto flex items-center justify-around h-14 px-1">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            {...item}
            isActive={location.pathname === item.path}
            onClick={() => navigate(item.path, { replace: true })}
          />
        ))}
      </div>
    </nav>
  );
}