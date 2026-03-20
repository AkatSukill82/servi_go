import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MapPin, FileText, User, Phone, Heart } from 'lucide-react';

const navItems = [
  { path: '/Home', icon: Home, label: 'Accueil' },
  { path: '/Map', icon: MapPin, label: 'Carte' },
  { path: '/Emergency', icon: Phone, label: 'Urgence' },
  { path: '/Favorites', icon: Heart, label: 'Favoris' },
  { path: '/Profile', icon: User, label: 'Profil' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const isEmergency = path === '/Emergency';

          if (isEmergency) {
            return (
              <Link
                key={path}
                to={path}
                className="flex flex-col items-center -mt-5"
              >
                <div className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center shadow-lg shadow-destructive/30">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] mt-1 font-semibold text-destructive">SOS</span>
              </Link>
            );
          }

          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center gap-0.5 py-1 px-3"
            >
              <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}