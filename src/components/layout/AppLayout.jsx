import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';


import BottomNav from './BottomNav';
import { ServiGoIcon } from '@/components/brand/ServiGoLogo';
import ProBottomNav from './ProBottomNav';
import { useDarkMode } from '@/hooks/useDarkMode';

// Lazy load — chaque page chargée uniquement à la première visite
const Home        = lazy(() => import('@/pages/Home'));
const Map         = lazy(() => import('@/pages/Map'));
const Emergency   = lazy(() => import('@/pages/Emergency'));
const Favorites   = lazy(() => import('@/pages/Favorites'));
const Profile     = lazy(() => import('@/pages/Profile'));
const Messages    = lazy(() => import('@/pages/Messages'));
const MissionHistory = lazy(() => import('@/pages/MissionHistory'));
const ProDashboard = lazy(() => import('@/pages/ProDashboard'));
const Invoices    = lazy(() => import('@/pages/Invoices'));
const ProProfile  = lazy(() => import('@/pages/ProProfile'));
const ServiceRequest = lazy(() => import('@/pages/ServiceRequest'));
const ProSubscription = lazy(() => import('@/pages/ProSubscription'));
const ProAgenda = lazy(() => import('@/pages/ProAgenda'));
const ProMessages = lazy(() => import('@/pages/ProMessages'));

const CUSTOMER_TABS = ['/Home', '/MissionHistory', '/Messages', '/Profile'];
const PRO_TABS = ['/ProDashboard', '/ProAgenda', '/ProMessages', '/ProProfile'];

const TAB_COMPONENTS = {
  '/Home': Home,
  '/MissionHistory': MissionHistory,
  '/Messages': Messages,
  '/Profile': Profile,
  '/ProDashboard': ProDashboard,
  '/ProAgenda': ProAgenda,
  '/Invoices': Invoices,
  '/ProMessages': ProMessages,
  '/ProProfile': ProProfile,
};

const STACK_COMPONENTS = {
  '/ServiceRequest': ServiceRequest,
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
  const [, setDark] = useDarkMode();
  const [currentUser, setCurrentUser] = React.useState(null);
  const userEmail = currentUser?.email;

  // Sync préférence BDD → DOM après chargement de l'utilisateur
  useEffect(() => {
    if (currentUser?.dark_mode !== undefined) {
      const localDark = localStorage.getItem('sg_dark') === '1';
      const dbDark = currentUser.dark_mode === true;
      if (dbDark !== localDark) setDark(dbDark);
    }
  }, [currentUser?.dark_mode]);
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
    const resolveUserType = async (user) => {
      if (!user?.user_type) {
        // Silently default to 'particulier' — never redirect existing users to role selection
        await base44.auth.updateMe({ user_type: 'particulier' }).catch(() => {});
        const updated = { ...user, user_type: 'particulier' };
        queryClient.setQueryData(['currentUser'], updated);
        setCurrentUser(updated);
        setUserType('particulier');
      } else {
        setUserType(user.user_type);
      }
    };

    const cached = queryClient.getQueryData(['currentUser']);
    if (cached) {
      setCurrentUser(cached);
      resolveUserType(cached).then(() => setLoading(false));
      return;
    }
    base44.auth.me().then(user => {
      queryClient.setQueryData(['currentUser'], user);
      setCurrentUser(user);
      resolveUserType(user).then(() => setLoading(false));
    }).catch(() => {
      navigate('/', { replace: true });
    });
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: '#1A1A2E' }}>
        <div className="flex flex-col items-center gap-4">
          <ServiGoIcon size={56} />
          <span className="text-2xl font-black text-white">ServiGo</span>
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mt-2" />
        </div>
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