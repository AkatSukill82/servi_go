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
    <div className="fixed inset-0 bg-[#1A1A2E] flex flex-col items-center justify-center gap-4">
      <ServiGoIcon size={52} white />
      <span className="text-white font-black text-2xl">ServiGo</span>
      <Loader2 className="w-7 h-7 animate-spin text-white/60 mt-2" />
      <p className="text-white/40 text-sm">Redirection vers la connexion...</p>
    </div>
  );
}