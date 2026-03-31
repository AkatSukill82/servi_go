import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, CalendarDays, MessageCircle, User } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

export default function ProBottomNav() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: unreadMsgs = 0 } = useQuery({
    queryKey: ['proUnreadMessages'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const requests = await base44.entities.ServiceRequestV2.filter({ professional_email: user.email }, '-created_date', 20);
      const activeIds = requests.filter(r => !['cancelled'].includes(r.status)).map(r => r.id);
      if (!activeIds.length) return 0;
      const msgs = await base44.entities.Message.filter({}, '-created_date', 50);
      return msgs.filter(m => activeIds.includes(m.request_id) && m.sender_email !== user.email).length;
    },
    refetchInterval: 30000,
    staleTime: 30000,
  });

  const navItems = [
    { path: '/ProDashboard', icon: LayoutDashboard, label: 'Dashboard', badge: 0 },
    { path: '/ProAgenda', icon: CalendarDays, label: 'Agenda', badge: 0 },
    { path: '/MissionHistory', icon: MessageCircle, label: 'Messages', badge: unreadMsgs },
    { path: '/ProProfile', icon: User, label: 'Profil', badge: 0 },
  ];

  const activeTab = location.pathname;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map(({ path, icon: Icon, label, badge, key }) => {
          const isActive = activeTab === path;
          return (
            <button
              key={key || path}
              onClick={() => navigate(path, { replace: true })}
              className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-[44px] min-h-[44px] justify-center"
            >
              <div className="relative">
                <Icon style={{ width: 20, height: 20 }} strokeWidth={isActive ? 2.2 : 1.6} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive rounded-full flex items-center justify-center text-[8px] font-bold text-white">{badge > 9 ? '9+' : badge}</span>
                )}
              </div>
              <span className={`text-[9px] font-medium transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}