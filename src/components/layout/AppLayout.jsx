import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from './BottomNav';
import ProBottomNav from './ProBottomNav';

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const pageTransition = { duration: 0.2, ease: 'easeInOut' };

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
      {userType === 'professionnel' ? <ProBottomNav /> : <BottomNav />}
    </div>
  );
}