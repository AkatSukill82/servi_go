import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Sun, Moon } from 'lucide-react';
import BottomNav from './BottomNav';
import ProBottomNav from './ProBottomNav';
import { useDarkMode } from '@/hooks/useDarkMode';

// Pages particulier
import Home from '@/pages/Home';
import Map from '@/pages/Map';
import Emergency from '@/pages/Emergency';
import Favorites from '@/pages/Favorites';
import Profile from '@/pages/Profile';

// Pages pro
import ProDashboard from '@/pages/ProDashboard';
import Invoices from '@/pages/Invoices';
import ProProfile from '@/pages/ProProfile';

// Pages non-tab (gardées via React Router classique)
import ServiceRequest from '@/pages/ServiceRequest';
import MissionHistory from '@/pages/MissionHistory';

const CUSTOMER_TABS = ['/Home', '/Map', '/Emergency', '/Favorites', '/Profile'];
const PRO_TABS = ['/ProDashboard', '/Map', '/Emergency', '/Invoices', '/ProProfile'];

const TAB_COMPONENTS = {
  '/Home': Home,
  '/Map': Map,
  '/Emergency': Emergency,
  '/Favorites': Favorites,
  '/Profile': Profile,
  '/ProDashboard': ProDashboard,
  '/Invoices': Invoices,
  '/ProProfile': ProProfile,
};

// Pages non-tab qui s'affichent par-dessus les onglets
const STACK_COMPONENTS = {
  '/ServiceRequest': ServiceRequest,
  '/MissionHistory': MissionHistory,
};

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useDarkMode();

  useEffect(() => {
    base44.auth.me().then(user => {
      if (!user?.user_type) {
        navigate('/SelectUserType', { replace: true });
      } else {
        setUserType(user.user_type);
      }
      setLoading(false);
    }).catch(() => {
      navigate('/Landing', { replace: true });
    });
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = userType === 'professionnel' ? PRO_TABS : CUSTOMER_TABS;
  const currentPath = location.pathname;

  // Est-ce qu'on est sur une page "stack" (par-dessus les tabs) ?
  const isStackPage = currentPath in STACK_COMPONENTS;
  const StackComponent = STACK_COMPONENTS[currentPath];

  return (
    <div
      className="h-screen flex flex-col bg-background overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Theme toggle */}
      <button
        onClick={() => setDark(d => !d)}
        className="fixed top-3 right-4 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-card border border-border shadow-sm active:scale-95 transition-transform"
        style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
        aria-label="Changer le thème"
      >
        {dark
          ? <Sun className="w-4 h-4 text-foreground" strokeWidth={1.8} />
          : <Moon className="w-4 h-4 text-foreground" strokeWidth={1.8} />
        }
      </button>

      {/* Tabs montés en permanence (display none quand inactif) */}
      <div className="flex-1 overflow-hidden relative">
        {tabs.map(tabPath => {
          const TabComponent = TAB_COMPONENTS[tabPath];
          const isActive = currentPath === tabPath && !isStackPage;
          return (
            <div
              key={tabPath}
              className="absolute inset-0 overflow-y-auto pb-20"
              style={{ display: isActive ? 'block' : 'none' }}
            >
              <TabComponent />
            </div>
          );
        })}

        {/* Stack page (ServiceRequest, MissionHistory, etc.) */}
        {isStackPage && StackComponent && (
          <div className="absolute inset-0 overflow-y-auto pb-20 bg-background">
            <StackComponent />
          </div>
        )}
      </div>

      {userType === 'professionnel' ? <ProBottomNav /> : <BottomNav />}
    </div>
  );
}