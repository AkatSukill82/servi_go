import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, MapPin, Phone, FileText, User } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

export default function ProBottomNav() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/ProDashboard', icon: LayoutDashboard, label: t('nav_dashboard') },
    { path: '/Map', icon: MapPin, label: t('nav_map') },
    { path: '/Emergency', icon: Phone, label: 'SOS' },
    { path: '/Invoices', icon: FileText, label: t('nav_invoices') },
    { path: '/ProProfile', icon: User, label: t('nav_pro_profile') },
  ];

  const activeTab = navItems.find(n => location.pathname === n.path)?.path || '/ProDashboard';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = activeTab === path;
          const isEmergency = path === '/Emergency';

          if (isEmergency) {
            return (
              <button
                key={path}
                onClick={() => navigate(path, { replace: true })}
                className="flex flex-col items-center gap-0.5"
              >
                <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center">
                  <Icon style={{ width: 15, height: 15 }} className="text-background" strokeWidth={2} />
                </div>
                <span className="text-[9px] font-semibold text-foreground">{label}</span>
              </button>
            );
          }

          return (
            <button
              key={path}
              onClick={() => navigate(path, { replace: true })}
              className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-[44px] min-h-[44px] justify-center"
            >
              <Icon
                style={{ width: 20, height: 20 }}
                strokeWidth={isActive ? 2.2 : 1.6}
                className={isActive ? 'text-foreground' : 'text-muted-foreground'}
              />
              <span className={`text-[9px] font-medium transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}