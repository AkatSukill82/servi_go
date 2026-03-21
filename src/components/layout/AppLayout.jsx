import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from './BottomNav';
import ProBottomNav from './ProBottomNav';
import { useDarkMode } from '@/hooks/useDarkMode';

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

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Theme toggle — top right */}
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
      <div className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
      {userType === 'professionnel'
        ? <ProBottomNav />
        : <BottomNav />
      }
    </div>
  );
}