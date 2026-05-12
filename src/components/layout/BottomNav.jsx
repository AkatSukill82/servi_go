import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BRAND } from '@/lib/theme';
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

// kind: 'mission' | 'message' | 'profile' | null
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

function NavBadge({ count }) {
  if (!count) return null;
  return (
    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] bg-[#E17055] rounded-full flex items-center justify-center text-[8px] font-bold text-white px-0.5 leading-none shadow-sm">
      {count > 9 ? '9+' : count}
    </span>
  );
}

function NavItem({ icon: Icon, label, badge, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 flex-1 py-2 min-h-[52px] justify-center tap-scale relative"
    >
      <div className="relative flex items-center justify-center">
        <Icon
          strokeWidth={isActive ? 2.3 : 1.6}
          style={{ color: isActive ? BRAND : '#9CA3AF', width: 22, height: 22 }}
        />
        <NavBadge count={badge} />
      </div>
      <span className="text-[10px] font-semibold" style={{ color: isActive ? BRAND : '#9CA3AF' }}>
        {label}
      </span>
    </button>
  );
}

export default function BottomNav() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  const isPro = user?.user_type === 'professionnel';
  const tabs   = isPro ? PRO_TABS : CUSTOMER_TABS;
  const notifsKey = ['unreadNotifs', user?.email];

  const { data: notifs = [] } = useQuery({
    queryKey: notifsKey,
    queryFn: () => base44.entities.Notification.filter(
      { recipient_email: user.email, is_read: false },
      '-created_date', 100
    ),
    enabled: !!user?.email,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const missionBadge = notifs.filter(n => MISSION_TYPES.includes(n.type)).length;
  const messageBadge = notifs.filter(n => MESSAGE_TYPES.includes(n.type)).length;
  const profileBadge = user && (!user.photo_url || !user.phone || user.eid_status !== 'verified') ? 1 : 0;

  const getBadge = (kind) => ({ mission: missionBadge, message: messageBadge, profile: profileBadge }[kind] ?? 0);

  // Marque les notifications comme lues quand on arrive sur l'onglet correspondant
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
      className="shrink-0 bg-white border-t border-gray-100"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -1px 0 #f0f0f0' }}
    >
      <div className="w-full flex items-center justify-around px-1" style={{ height: 56 }}>
        {tabs.map((item) => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            badge={getBadge(item.kind)}
            isActive={location.pathname === item.path}
            onClick={() => navigate(item.path, { replace: true })}
          />
        ))}
      </div>
    </nav>
  );
}
