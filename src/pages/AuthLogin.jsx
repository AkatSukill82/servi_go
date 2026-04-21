import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ServiGoIcon } from '@/components/brand/ServiGoLogo';
import { Loader2 } from 'lucide-react';

export default function AuthLogin() {
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const user = await base44.auth.me();
        if (user?.role === 'admin') navigate('/AdminDashboard', { replace: true });
        else if (user?.user_type === 'professionnel') navigate('/ProDashboard', { replace: true });
        else navigate('/Home', { replace: true });
      } else {
        // Redirect to Base44 native login, come back to /Home after
        base44.auth.redirectToLogin('/Home');
      }
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-[#FF6B35] flex items-center justify-center mb-2">
        <ServiGoIcon size={28} white />
      </div>
      <span className="text-gray-900 font-bold text-xl">ServiGo</span>
      <Loader2 className="w-5 h-5 animate-spin text-gray-400 mt-1" />
    </div>
  );
}