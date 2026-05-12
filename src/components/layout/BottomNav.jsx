import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BRAND } from '@/lib/theme';
import { hapticSelection } from '@/lib/haptics';
import {
  Home, ClipboardList, Heart, MessageCircle, User,
  LayoutDashboard, CalendarDays,
} from 'lucide-react';

const MISSION_TYPES = [
  'new_mission', 'mission_accepted', 'mission_refused',
  'contract_to_sign', 'contract_signed', 'pro_en_route',
  'mission_started', 'mission_completed', 'dispute_opened', 'dispute_resolved',
];
const MESSAGE_TYPES = ['message_received'];

const CUSTOMER_TABS = [
  { path: '/Home',           icon: Home,          label: 'Accueil',  kind: 'mission' },
  { path: '/MissionHistory', icon: ClipboardList, label: 'Missions', kind: 'mission' },
  { path: '/Favorites',      icon: Heart,         label: 'Favoris',  kind: null },
  { path: '/Messages',       icon: MessageCircle, label: 'Messages', kind: 'message' },
  { path: '/Profile',        icon: User,          label: 'Profil',   kind: 'profile' },
];

const PRO_TABS = [
  { path: '/ProDashboard', icon: LayoutDashboard, label: 'Dashboard', kind: 'mission' },
  { path: '/ProAgenda',    icon: CalendarDays,    label: 'Agenda',    kind: null },
  { path: '/ProMessages',  icon: MessageCircle,   label: 'Messages',  kind: 'message' },
  { path: '/ProProfile',   icon: User,            label: 'Profil',    kind: 'profile' },
];

function NavItem({ icon: Icon, label, badge, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 flex-1 py-2 min-h-[52px] justify-center relative active:scale-90 transition-transform"
    >
      <div className="relative">
        {/* Active pill background */}
        {isActive && (
          <span
            className="absolute inset-0 -m-1.5 rounded-xl"
            style={{ background: `${BRAND}12` }}
          />
        )}
        <Icon
          strokeWidth={isActive ? 2.2 : 1.6}
          style={{ color: isActive ? BRAND : 'hsl(var(--muted-foreground))', width: 22, height: 22, position: 'relative' }}
        />
        {/* Badge dot */}
        {badge > 0 && (
          <span
            className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] rounded-full flex items-center justify-center text-[8px] font-black text-white px-0.5"
            style={{ background: '#E17055', lineHeight: 1 }}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span
        className="text-[10px] font-semibold tracking-tight"
        style={{ color: isActive ? BRAND : 'hsl(var(--muted-foreground))' }}
      >
        {label}
      </span>
    </button>
  );
}

export default function BottomNav() {
  const location    = useLocation();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  const isPro  = user?.user_type === 'professionnel';
  const tabs   = isPro ? PRO_TABS : CUSTOMER_TABS;
  const notifsKey = ['unreadNotifs', user?.email];

  const { data: notifs = [] } = useQuery({
    queryKey: notifsKey,
    queryFn: () => base44.entities.Notification.filter(
      { recipient_email: user.email, is_read: false }, '-created_date', 100
    ),
    enabled: !!user?.email,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const missionBadge = notifs.filter(n => MISSION_TYPES.includes(n.type)).length;
  const messageBadge = notifs.filter(n => MESSAGE_TYPES.includes(n.type)).length;
  const profileBadge = user && (!user.photo_url || !user.phone || user.eid_status !== 'verified') ? 1 : 0;
  const getBadge = (kind) => ({ mission: missionBadge, message: messageBadge, profile: profileBadge }[kind] ?? 0);

  useEffect(() => {
    if (!user?.email || !notifs.length) return;
    const currentTab = tabs.find(t => t.path === location.pathname);
    if (!currentTab) return;
    const toMark = notifs.filter(n => {
      if (currentTab.kind === 'mission') return MISSION_TYPES.includes(n.type);
      if (currentTab.kind === 'message') return MESSAGE_TYPES.includes(n.type);
      return false;
    });
    if (!toMark.length) return;
    Promise.all(toMark.map(n => base44.entities.Notification.update(n.id, { is_read: true })))
      .then(() => queryClient.invalidateQueries({ queryKey: notifsKey }));
  }, [location.pathname, user?.email]);

  return (
    <nav
      className="shrink-0 bg-background"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
      }}
    >
      <div className="w-full flex items-center justify-around px-2" style={{ height: 56 }}>
        {tabs.map((item) => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            badge={getBadge(item.kind)}
            isActive={location.pathname === item.path}
            onClick={() => { hapticSelection(); navigate(item.path, { replace: true }); }}
          />
        ))}
      </div>
    </nav>
  );
}
