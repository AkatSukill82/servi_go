import React, { useEffect } from 'react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, CalendarDays, MessageCircle, User } from 'lucide-react';

const MISSION_TYPES = ['new_mission','mission_accepted','mission_refused','contract_to_sign','contract_signed','pro_en_route','mission_started','mission_completed','dispute_opened','dispute_resolved'];
const MESSAGE_TYPES = ['message_received'];

function NavBadge({ count, color = 'bg-red-500' }) {
  if (!count) return null;
  return (
    <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] ${color} rounded-full flex items-center justify-center text-[10px] font-semibold text-white px-0.5 leading-none`}>
      {count > 9 ? '9+' : count}
    </span>
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
  const profileIncomplete = user && (!user.photo_url || !user.phone || user.eid_status !== 'verified');

  // Missing: import React/useRef at top
  const { useRef } = React;

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
    { path: '/ProAgenda', icon: CalendarDays, label: 'Agenda', badge: 0 },
    { path: '/ProMessages', icon: MessageCircle, label: 'Messages', badge: messageBadge },
    { path: '/ProProfile', icon: User, label: 'Profil', badge: profileIncomplete ? 1 : 0, badgeColor: 'bg-amber-500' },
  ];

  const activeTab = location.pathname;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map(({ path, icon: Icon, label, badge, key, badgeColor }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={key || path}
              onClick={() => navigate(path, { replace: true })}
              className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-[44px] min-h-[44px] justify-center"
            >
              <div className="relative">
                <Icon style={{ width: 20, height: 20 }} strokeWidth={isActive ? 2.2 : 1.6} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                <NavBadge count={badge} color={badgeColor} />
              </div>
              <span className={`text-[9px] font-medium transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}