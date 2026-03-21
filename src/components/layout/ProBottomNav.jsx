import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MapPin, Phone, FileText, User, Sun, Moon } from 'lucide-react';

const navItems = [
  { path: '/ProDashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/Map', icon: MapPin, label: 'Carte' },
  { path: '/Emergency', icon: Phone, label: 'Urgence' },
  { path: '/Invoices', icon: FileText, label: 'Factures' },
  { path: '/ProProfile', icon: User, label: 'Profil' },
];

export default function ProBottomNav({ dark, setDark }) {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-14 px-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const isEmergency = path === '/Emergency';

          if (isEmergency) {
            return (
              <Link
                key={path}
                to={path}
                aria-label="SOS Urgence"
                className="flex flex-col items-center gap-0.5"
              >
                <div className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center shadow-md">
                  <Icon style={{ width: 18, height: 18 }} className="text-white" />
                </div>
                <span className="text-[9px] font-bold text-destructive">SOS</span>
              </Link>
            );
          }

          return (
            <Link
              key={path}
              to={path}
              aria-label={label}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <Icon
                className={`transition-all ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                style={{ width: 20, height: 20, strokeWidth: isActive ? 2.2 : 1.8 }}
              />
              <span className={`text-[9px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </Link>
          );
        })}

        {/* Dark mode toggle */}
        <button
          onClick={() => setDark(d => !d)}
          aria-label="Toggle dark mode"
          className="flex flex-col items-center gap-0.5 px-3 py-1"
        >
          {dark
            ? <Sun style={{ width: 20, height: 20, strokeWidth: 1.8 }} className="text-muted-foreground" />
            : <Moon style={{ width: 20, height: 20, strokeWidth: 1.8 }} className="text-muted-foreground" />
          }
          <span className="text-[9px] font-medium text-muted-foreground">{dark ? 'Clair' : 'Sombre'}</span>
        </button>
      </div>
    </nav>
  );
}