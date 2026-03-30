import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Pages
import Landing from './pages/Landing';
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

// Layout
import AppLayout from './components/layout/AppLayout';

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
    <Routes>
      {/* Public pages (no layout) */}
      <Route path="/" element={<Landing />} />
      <Route path="/Landing" element={<Landing />} />
      <Route path="/SelectUserType" element={<SelectUserType />} />
      <Route path="/ProVerificationOnboarding" element={<ProVerificationOnboarding />} />
      <Route path="/AdminVerification" element={<AdminVerification />} />
      <Route path="/AdminDashboard" element={<AdminDashboard />} />
      <Route path="/CGU" element={<CGU />} />
      <Route path="/EidVerification" element={<EidVerification />} />
      <Route path="/Support" element={<Support />} />
      <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />

      {/* App pages with shared layout (tabs persistants) */}
      <Route path="/Home" element={<AppLayout />} />
      <Route path="/ProSubscription" element={<AppLayout />} />
      <Route path="/ServiceRequest" element={<AppLayout />} />
      <Route path="/Profile" element={<AppLayout />} />
      <Route path="/ProDashboard" element={<AppLayout />} />
      <Route path="/ProProfile" element={<AppLayout />} />
      <Route path="/Favorites" element={<AppLayout />} />
      <Route path="/Invoices" element={<AppLayout />} />
      <Route path="/Map" element={<AppLayout />} />
      <Route path="/MissionHistory" element={<AppLayout />} />
      <Route path="/Emergency" element={<AppLayout />} />

      {/* Full screen pages (no layout) */}
      <Route path="/Chat" element={<Chat />} />
      <Route path="/TrackingMap" element={<TrackingMap />} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
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