import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const isCapacitorEnv = typeof window !== 'undefined' && window.Capacitor !== undefined;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  // In Capacitor we skip the public settings fetch entirely
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(!isCapacitorEnv);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setAuthError(null);

      if (isCapacitorEnv) {
        // Native app: skip public settings API, go straight to local token check
        await checkUserAuth();
        return;
      }

      // Web: fetch public settings first
      setIsLoadingPublicSettings(true);
      const appClient = createAxiosClient({
        baseURL: '/api/apps/public',
        headers: { 'X-App-Id': appParams.appId },
        token: appParams.token,
        interceptResponses: true
      });

      try {
        const settingsTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('settings_timeout')), 6000)
        );
        const publicSettings = await Promise.race([
          appClient.get(`/prod/public-settings/by-id/${appParams.appId}`),
          settingsTimeout
        ]);
        setAppPublicSettings(publicSettings);
      } catch (appError) {
        if (appError.status === 403 && appError.data?.extra_data?.reason === 'user_not_registered') {
          setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
          setIsLoadingPublicSettings(false);
          setIsLoadingAuth(false);
          return;
        }
      } finally {
        setIsLoadingPublicSettings(false);
      }

      await checkUserAuth();
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);

      // Fast path: if no token stored locally, skip the network call entirely
      const hasToken = !!(
        localStorage.getItem('base44_access_token') ||
        localStorage.getItem('token')
      );
      if (!hasToken) {
        setIsAuthenticated(false);
        return;
      }

      // Token exists: validate with server (8s timeout)
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('auth_timeout')), 8000)
      );
      const currentUser = await Promise.race([base44.auth.me(), timeout]);
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    if (isCapacitorEnv) {
      localStorage.removeItem('base44_access_token');
      localStorage.removeItem('token');
      window.location.href = '/se-connecter';
    } else {
      base44.auth.logout('/se-connecter');
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/se-connecter';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      checkUserAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
