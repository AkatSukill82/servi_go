import { Toaster } from "@/components/ui/toaster"
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { isNativeNow } from '@/lib/platform';
import { motion } from 'framer-motion';

// Pages
import Chat from './pages/Chat';
import MissionHistory from './pages/MissionHistory';
import TrackingMap from './pages/TrackingMap';
import ProVerificationOnboarding from './pages/ProVerificationOnboarding';
import AdminVerification from './pages/AdminVerification';
import AdminDashboard from './pages/AdminDashboard';
import CGU from './pages/CGU';
import EidVerification from './pages/EidVerification';
import Support from './pages/Support';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Register from './pages/Register';
import ProPublicProfile from './pages/ProPublicProfile';
import CGUFull from './pages/CGUFull';
import Confidentialite from './pages/Confidentialite';
import MentionsLegales from './pages/MentionsLegales';
import CGV from './pages/CGV';
import PolitiqueCookies from './pages/PolitiqueCookies';
import ErrorBoundary from './components/ui/ErrorBoundary';
import IndependenceCharter from './pages/IndependenceCharter';
import DAC7Form from './pages/DAC7Form';
import AuthLogin from './pages/AuthLogin';
import AdminTestEmail from './pages/AdminTestEmail';
import ProReviews from './pages/ProReviews';
import About from './pages/About';
import Contact from './pages/Contact';

// Layout
import AppLayout from './components/layout/AppLayout';

// Redirect to external URL
function ExternalRedirect({ to }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
}

// Guard routes admin — redirige si l'utilisateur n'est pas admin
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/se-connecter" replace />;
  if (user?.role !== 'admin') return <Navigate to="/Home" replace />;
  return children;
};

// Route racine intelligente : redirige les utilisateurs déjà connectés
const RootRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated && user) {
    if (user.role === 'admin') return <Navigate to="/AdminDashboard" replace />;
    if (user.user_type === 'professionnel') return <Navigate to="/ProDashboard" replace />;
    return <Navigate to="/Home" replace />;
  }
  return <Navigate to="/Register" replace />;
};

// Route protégée pour Pro qui redirige vers ProDashboard si non-pro
const ProRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/se-connecter" replace />;
  if (user?.user_type !== 'professionnel') return <Navigate to="/Home" replace />;
  return children;
};

const PUBLIC_PATHS = [
  '/se-connecter', '/creer-compte', '/cgu', '/cgv',
  '/confidentialite', '/mentions-legales', '/cookies',
  '/Register', '/CGU', '/PrivacyPolicy', '/Support',
];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  const currentPath = window.location.pathname;
  const isPublicPath = PUBLIC_PATHS.some(p => currentPath.startsWith(p));

  if (isLoadingPublicSettings || isLoadingAuth) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: '#ffffff', width: '100vw', height: '100dvh' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center gap-5"
      >
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6C5CE7, #a78bfa)', boxShadow: '0 8px 32px rgba(108,92,231,0.35)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="rgba(255,255,255,0.25)"/>
            <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-2xl font-black tracking-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#0F172A' }}>ServiGo</span>
        <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '2.5px solid rgba(108,92,231,0.15)', borderTopColor: '#6C5CE7' }} />
      </motion.div>
    </div>
  );

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Sur mobile natif, rediriger vers login si non authentifié (sauf pages publiques)
  if (isNativeNow() && !isAuthenticated && !isPublicPath) {
    return <Navigate to="/se-connecter" replace />;
  }

  return (
    <ErrorBoundary>
    <Routes>
      {/* Root → redirige si connecté, sinon signup */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public pages (no layout) */}
      <Route path="/signup" element={<Navigate to="/creer-compte" replace />} />
      <Route path="/Register" element={<Register />} />
      <Route path="/ProVerificationOnboarding" element={<ProVerificationOnboarding />} />
      <Route path="/AdminVerification" element={<AdminRoute><AdminVerification /></AdminRoute>} />
      <Route path="/AdminDashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/AdminTestEmail" element={<AdminRoute><AdminTestEmail /></AdminRoute>} />
      <Route path="/CGU" element={<CGU />} />
      <Route path="/EidVerification" element={<EidVerification />} />
      <Route path="/Support" element={<Support />} />
      <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />

      {/* App pages with shared layout (tabs persistants) */}
<Route path="/Home" element={<AppLayout />} />
      <Route path="/MissionHistory" element={<AppLayout />} />
      <Route path="/Messages" element={<AppLayout />} />
      <Route path="/Favorites" element={<AppLayout />} />
      <Route path="/Profile" element={<AppLayout />} />
      <Route path="/Invoices" element={<AppLayout />} />
      <Route path="/Map" element={<AppLayout />} />
      <Route path="/Emergency" element={<AppLayout />} />
      
      {/* Pro-only routes */}
      <Route path="/ProDashboard" element={<ProRoute><AppLayout /></ProRoute>} />
      <Route path="/ProAgenda" element={<ProRoute><AppLayout /></ProRoute>} />
      <Route path="/ProMessages" element={<ProRoute><AppLayout /></ProRoute>} />
      <Route path="/ProProfile" element={<ProRoute><AppLayout /></ProRoute>} />
      
      {/* Stack pages */}
      <Route path="/ProSubscription" element={<AppLayout />} />
      <Route path="/ServiceRequest" element={<AppLayout />} />

      {/* Auth pages — custom login & signup */}
      <Route path="/se-connecter" element={<AuthLogin />} />
      <Route path="/creer-compte" element={<Navigate to="/Register" replace />} />

      {/* Pro legal & fiscal pages */}
      <Route path="/IndependenceCharter" element={<IndependenceCharter />} />
      <Route path="/DAC7Form" element={<DAC7Form />} />

      {/* Legal pages */}
      <Route path="/cgu" element={<CGUFull />} />
      <Route path="/cgv" element={<CGV />} />
      <Route path="/confidentialite" element={<Confidentialite />} />
      <Route path="/mentions-legales" element={<MentionsLegales />} />
      <Route path="/cookies" element={<PolitiqueCookies />} />

      {/* Full screen pages (no layout) */}
      <Route path="/Chat" element={<Chat />} />
      <Route path="/ProPublicProfile" element={<ProPublicProfile />} />
      <Route path="/TrackingMap" element={<TrackingMap />} />

      <Route path="/ProReviews" element={<ProReviews />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </ErrorBoundary>
  );
};

function App() {
  // Theme is applied synchronously by index.html script — no effect needed here.

  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App