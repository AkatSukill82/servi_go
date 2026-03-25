import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MapPin, Heart, User } from 'lucide-react';

const navItems = [
  { path: '/Home', icon: Home, label: 'Accueil' },
  { path: '/Map', icon: MapPin, label: 'Carte' },
  { path: '/Favorites', icon: Heart, label: 'Favoris' },
  { path: '/Profile', icon: User, label: 'Profil' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = navItems.find(n => location.pathname === n.path)?.path || '/Home';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = activeTab === path;
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