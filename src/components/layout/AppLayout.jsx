import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import BottomNav from './BottomNav';
import ProBottomNav from './ProBottomNav';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAppNotifications } from '@/hooks/useAppNotifications';

// Lazy load — chaque page chargée uniquement à la première visite
const Home        = lazy(() => import('@/pages/Home'));
const Map         = lazy(() => import('@/pages/Map'));
const Emergency   = lazy(() => import('@/pages/Emergency'));
const Favorites   = lazy(() => import('@/pages/Favorites'));
const Profile     = lazy(() => import('@/pages/Profile'));
const ProDashboard = lazy(() => import('@/pages/ProDashboard'));
const Invoices    = lazy(() => import('@/pages/Invoices'));
const ProProfile  = lazy(() => import('@/pages/ProProfile'));
const ServiceRequest = lazy(() => import('@/pages/ServiceRequest'));
const MissionHistory = lazy(() => import('@/pages/MissionHistory'));
const ProSubscription = lazy(() => import('@/pages/ProSubscription'));
const ProAgenda = lazy(() => import('@/pages/ProAgenda'));

const CUSTOMER_TABS = ['/Home', '/Map', '/Emergency', '/Favorites', '/Profile'];
const PRO_TABS = ['/ProDashboard', '/ProAgenda', '/MissionHistory', '/ProProfile'];

const TAB_COMPONENTS = {
  '/Home': Home,
  '/Map': Map,
  '/Emergency': Emergency,
  '/Favorites': Favorites,
  '/Profile': Profile,
  '/ProDashboard': ProDashboard,
  '/ProAgenda': ProAgenda,
  '/MissionHistory': MissionHistory,
  '/Invoices': Invoices,
  '/ProProfile': ProProfile,
};

const STACK_COMPONENTS = {
  '/ServiceRequest': ServiceRequest,
  '/MissionHistory': MissionHistory,
  '/ProSubscription': ProSubscription,
};

const TabSpinner = () => (
  <div className="flex items-center justify-center h-40">
    <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
  </div>
);

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  useDarkMode(); // Applique le thème sauvegardé
  const [currentUser, setCurrentUser] = React.useState(null);
  useAppNotifications(currentUser);
  const userEmail = currentUser?.email;
  const queryClient = useQueryClient();

  const { data: proSubscription } = useQuery({
    queryKey: ['proSubscription', userEmail],
    queryFn: () => base44.entities.ProSubscription.filter({ professional_email: userEmail }, '-created_date', 1).then(r => r[0] || null),
    enabled: !!userEmail && userType === 'professionnel',
    staleTime: 60000,
  });
  const proSubExpired = userType === 'professionnel' && proSubscription && !['active', 'trial'].includes(proSubscription?.status);

  // Garde en mémoire les onglets déjà visités (pour ne monter qu'au premier accès)
  const visitedTabs = useRef(new Set());
  const scrollRefs = useRef({});

  useEffect(() => {
    const cached = queryClient.getQueryData(['currentUser']);
    if (cached) {
      if (!cached?.user_type) navigate('/SelectUserType', { replace: true });
      else setUserType(cached.user_type);
      setCurrentUser(cached);
      setLoading(false);
      return;
    }
    base44.auth.me().then(user => {
      queryClient.setQueryData(['currentUser'], user);
      setCurrentUser(user);
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

  // Marque l'onglet courant comme visité
  if (!isStackPage && tabs.includes(currentPath)) {
    visitedTabs.current.add(currentPath);
  }

  return (
    <div
      className="bg-background overflow-hidden"
      style={{
        /* Fallback pour vieux Android qui ne supporte pas dvh */
        height: '100vh',
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top right controls */}
      <div
        className="fixed right-4 z-50 flex items-center gap-2"
        style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        {userEmail && <NotificationDropdown userEmail={userEmail} />}
      </div>

      {/* Expired subscription banner (pro only) */}
      {proSubExpired && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-red-600 text-white px-4 py-2 flex items-center justify-between gap-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
          <p className="text-xs font-semibold flex-1">⚠️ Abonnement expiré — vous ne recevez plus de missions</p>
          <button onClick={() => navigate('/ProSubscription')} className="text-xs font-bold bg-white text-red-600 px-3 py-1 rounded-full shrink-0">
            Réactiver
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">

        {/* Onglets — montés seulement après la première visite, jamais démontés */}
        {tabs.map(tabPath => {
          const TabComponent = TAB_COMPONENTS[tabPath];
          const isActive = currentPath === tabPath && !isStackPage;
          const hasBeenVisited = visitedTabs.current.has(tabPath);

          // Ne pas monter du tout si jamais visité
          if (!hasBeenVisited && !isActive) return null;

          return (
            <div
              key={tabPath}
              className="absolute inset-0 overflow-y-auto"
              style={{
                display: isActive ? 'block' : 'none',
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 56px)',
              }}
              ref={el => { if (el) scrollRefs.current[tabPath] = el; }}
            >
              <Suspense fallback={<TabSpinner />}>
                <TabComponent />
              </Suspense>
            </div>
          );
        })}

        {/* Stack pages — slide-in, lazy-loaded */}
        <AnimatePresence>
          {isStackPage && StackComponent && (
            <motion.div
              key={currentPath}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-0 overflow-y-auto bg-background"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 56px)' }}
            >
              <Suspense fallback={<TabSpinner />}>
                <StackComponent />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {userType === 'professionnel' ? <ProBottomNav /> : <BottomNav />}
    </div>
  );
}