import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MapPin, Phone, Heart, User, Sun, Moon } from 'lucide-react';

const navItems = [
  { path: '/Home', icon: Home, label: 'Accueil' },
  { path: '/Map', icon: MapPin, label: 'Carte' },
  { path: '/Emergency', icon: Phone, label: 'SOS' },
  { path: '/Favorites', icon: Heart, label: 'Favoris' },
  { path: '/Profile', icon: User, label: 'Profil' },
];

export default function BottomNav({ dark, setDark }) {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const isEmergency = path === '/Emergency';

          if (isEmergency) {
            return (
              <Link key={path} to={path} className="flex flex-col items-center gap-0.5">
                <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center">
                  <Icon style={{ width: 15, height: 15 }} className="text-background" strokeWidth={2} />
                </div>
                <span className="text-[9px] font-semibold text-foreground">{label}</span>
              </Link>
            );
          }

          return (
            <Link key={path} to={path} className="flex flex-col items-center gap-0.5 px-3 py-1">
              <Icon
                style={{ width: 20, height: 20 }}
                strokeWidth={isActive ? 2.2 : 1.6}
                className={isActive ? 'text-foreground' : 'text-muted-foreground'}
              />
              <span className={`text-[9px] font-medium transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </Link>
          );
        })}

        <button
          onClick={() => setDark(d => !d)}
          className="flex flex-col items-center gap-0.5 px-3 py-1"
        >
          {dark
            ? <Sun style={{ width: 20, height: 20 }} strokeWidth={1.6} className="text-muted-foreground" />
            : <Moon style={{ width: 20, height: 20 }} strokeWidth={1.6} className="text-muted-foreground" />
          }
          <span className="text-[9px] font-medium text-muted-foreground">{dark ? 'Clair' : 'Sombre'}</span>
        </button>
      </div>
    </nav>
  );
}