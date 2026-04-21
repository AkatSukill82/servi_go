import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Home, CalendarCheck, Heart, MessageCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';

const VIOLET = '#6C5CE7';
const MISSION_TYPES = ['new_mission','mission_accepted','mission_refused','contract_to_sign','contract_signed','pro_en_route','mission_started','mission_completed','dispute_opened','dispute_resolved'];
const MESSAGE_TYPES = ['message_received'];

function Badge({ count }) {
  if (!count) return null;
  return (
    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5 leading-none" style={{ background: '#EF4444' }}>
      {count > 9 ? '9+' : count}
    </span>
  );
}

function NavItem({ path, icon: Icon, label, badge, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative tap-scale"
    >
      <div className="relative">
        {isActive && (
          <motion.div
            layoutId="bottomnav-bg"
            className="absolute -inset-2.5 rounded-2xl"
            style={{ background: `${VIOLET}15` }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          />
        )}
        <Icon
          className="relative z-10 transition-colors"
          style={{ width: 22, height: 22, color: isActive ? VIOLET : '#9CA3AF', strokeWidth: isActive ? 2.2 : 1.7 }}
        />
        <Badge count={badge} />
      </div>
      <span
        className="text-[10px] font-semibold transition-colors"
        style={{ color: isActive ? VIOLET : '#9CA3AF' }}
      >
        {label}
      </span>
    </button>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), staleTime: 60000 });

  const { data: notifs = [] } = useQuery({
    queryKey: ['unreadNotifs', user?.email],
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
      if (['/MissionHistory', '/Home'].includes(location.pathname)) return MISSION_TYPES.includes(n.type);
      return false;
    });
    if (!toMark.length) return;
    Promise.all(toMark.map(n => base44.entities.Notification.update(n.id, { is_read: true })))
      .then(() => queryClient.invalidateQueries({ queryKey: ['unreadNotifs', user.email] }));
  }, [location.pathname, user?.email]);

  const navItems = [
    { path: '/Home',           icon: Home,          label: 'Accueil',  badge: 0 },
    { path: '/MissionHistory', icon: CalendarCheck, label: 'Missions', badge: missionBadge },
    { path: '/Favorites',      icon: Heart,         label: 'Favoris',  badge: 0 },
    { path: '/Messages',       icon: MessageCircle, label: 'Messages', badge: messageBadge },
    { path: '/Profile',        icon: User,          label: 'Profil',   badge: profileIncomplete },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-[58px]">
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