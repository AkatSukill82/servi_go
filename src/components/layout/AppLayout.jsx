import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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

// Pages non-tab (stack par-dessus les onglets)
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

  // Préserve le scroll de chaque onglet
  const scrollRefs = useRef({});

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
  const isStackPage = currentPath in STACK_COMPONENTS;
  const StackComponent = STACK_COMPONENTS[currentPath];

  return (
    <div
      className="bg-background overflow-hidden"
      style={{
        height: '100dvh',            // dynamic viewport height (mobile-correct)
        paddingTop: 'env(safe-area-inset-top)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Theme toggle — respecte la safe area top */}
      <button
        onClick={() => setDark(d => !d)}
        className="fixed right-4 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-card border border-border shadow-sm active:scale-95 transition-transform"
        style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
        aria-label="Changer le thème"
      >
        {dark
          ? <Sun className="w-4 h-4 text-foreground" strokeWidth={1.8} />
          : <Moon className="w-4 h-4 text-foreground" strokeWidth={1.8} />
        }
      </button>

      {/* Zone de contenu */}
      <div className="flex-1 overflow-hidden relative">

        {/* Onglets persistants — montés une fois, cachés via display:none */}
        {tabs.map(tabPath => {
          const TabComponent = TAB_COMPONENTS[tabPath];
          const isActive = currentPath === tabPath && !isStackPage;
          return (
            <div
              key={tabPath}
              className="absolute inset-0 overflow-y-auto"
              style={{
                display: isActive ? 'block' : 'none',
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 56px)', // 56px = hauteur navbar
              }}
              ref={el => { if (el) scrollRefs.current[tabPath] = el; }}
            >
              <TabComponent />
            </div>
          );
        })}

        {/* Stack pages — slide-in depuis la droite, avec animation */}
        <AnimatePresence>
          {isStackPage && StackComponent && (
            <motion.div
              key={currentPath}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="absolute inset-0 overflow-y-auto bg-background"
              style={{
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 56px)',
              }}
            >
              <StackComponent />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom nav — safe area bottom gérée dans les navbars */}
      {userType === 'professionnel' ? <ProBottomNav /> : <BottomNav />}
    </div>
  );
}