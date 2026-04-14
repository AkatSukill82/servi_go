import { Toaster } from "@/components/ui/toaster"
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
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
import ErrorBoundary from './components/ui/ErrorBoundary';

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
      {/* Root → redirect to external site */}
      <Route path="/" element={<ExternalRedirect to="https://servi-go-pro.base44.app" />} />

      {/* Public pages (no layout) */}
      <Route path="/SelectUserType" element={<SelectUserType />} />
      <Route path="/Register" element={<Register />} />
      <Route path="/ProVerificationOnboarding" element={<ProVerificationOnboarding />} />
      <Route path="/AdminVerification" element={<AdminVerification />} />
      <Route path="/AdminDashboard" element={<AdminDashboard />} />
      <Route path="/CGU" element={<CGU />} />
      <Route path="/EidVerification" element={<EidVerification />} />
      <Route path="/Support" element={<Support />} />
      <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />

      {/* App pages with shared layout (tabs persistants) */}
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
      <Route path="/confidentialite" element={<Confidentialite />} />

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
  useEffect(() => {
    // Apply saved dark mode preference immediately on mount
    const saved = localStorage.getItem('servigo_dark_mode');
    const oldSaved = localStorage.getItem('servigo-theme');
    const isDark = saved === 'true' || (saved === null && oldSaved === 'dark');
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App