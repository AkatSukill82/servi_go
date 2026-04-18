import { Toaster } from "@/components/ui/toaster"
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Pages
import SelectUserType from './pages/SelectUserType';
import Chat from './pages/Chat';
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
import ProMessages from './pages/ProMessages';
import CGUFull from './pages/CGUFull';
import Confidentialite from './pages/Confidentialite';
import MentionsLegales from './pages/MentionsLegales';
import CGV from './pages/CGV';
import PolitiqueCookies from './pages/PolitiqueCookies';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Landing from './pages/Landing';
import AccountTypeSelection from './pages/AccountTypeSelection';
import ServiBot from './pages/ServiBot';

// Layout
import AppLayout from './components/layout/AppLayout';

// Redirect to external URL
function ExternalRedirect({ to }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <ErrorBoundary>
    <Routes>
      {/* Root → Landing page for unauthenticated users */}
      <Route path="/" element={<Landing />} />

      {/* Public pages (no layout) */}
      <Route path="/SelectUserType" element={<SelectUserType />} />
      <Route path="/signup" element={<AccountTypeSelection />} />
      <Route path="/Register" element={<Register />} />
      <Route path="/ProVerificationOnboarding" element={<ProVerificationOnboarding />} />
      <Route path="/AdminVerification" element={<AdminVerification />} />
      <Route path="/AdminDashboard" element={<AdminDashboard />} />
      <Route path="/CGU" element={<CGU />} />
      <Route path="/EidVerification" element={<EidVerification />} />
      <Route path="/Support" element={<Support />} />
      <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />

      {/* App pages with shared layout (tabs persistants) */}
      <Route path="/ServiBot" element={<AppLayout />} />
      <Route path="/Home" element={<AppLayout />} />
      <Route path="/MissionHistory" element={<AppLayout />} />
      <Route path="/Messages" element={<AppLayout />} />
      <Route path="/ProAgenda" element={<AppLayout />} />
      <Route path="/ProSubscription" element={<AppLayout />} />
      <Route path="/ServiceRequest" element={<AppLayout />} />
      <Route path="/Profile" element={<AppLayout />} />
      <Route path="/ProDashboard" element={<AppLayout />} />
      <Route path="/ProProfile" element={<AppLayout />} />
      <Route path="/ProMessages" element={<AppLayout />} />
      <Route path="/Favorites" element={<AppLayout />} />
      <Route path="/Invoices" element={<AppLayout />} />
      <Route path="/Map" element={<AppLayout />} />
      <Route path="/Emergency" element={<AppLayout />} />

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