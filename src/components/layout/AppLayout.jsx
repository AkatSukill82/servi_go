import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BottomNav from './BottomNav';
import ProBottomNav from './ProBottomNav';

export default function AppLayout() {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-background">
      <div className="pb-24">
        <Outlet />
      </div>
      {userType === 'professionnel' ? <ProBottomNav /> : <BottomNav />}
    </div>
  );
}