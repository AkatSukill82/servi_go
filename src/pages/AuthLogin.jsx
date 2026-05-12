import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ServiGoIcon } from '@/components/brand/ServiGoLogo';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const isCapacitor = typeof window !== 'undefined' && window.Capacitor !== undefined;

export default function AuthLogin() {
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // On web only: redirect to Base44 hosted login
    if (!isCapacitor) {
      base44.auth.redirectToLogin('/Home');
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Remplis tous les champs');
      return;
    }
    setLoading(true);
    try {
      const { access_token } = await base44.auth.loginViaEmailPassword(email, password);
      base44.auth.setToken(access_token);
      await checkUserAuth();
      const user = await base44.auth.me();
      if (user?.role === 'admin') navigate('/AdminDashboard', { replace: true });
      else if (user?.user_type === 'professionnel') navigate('/ProDashboard', { replace: true });
      else navigate('/Home', { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  // Web: show loading while redirecting
  if (!isCapacitor) {
    return (
      <div className="fixed inset-0 bg-[#1A1A2E] flex flex-col items-center justify-center gap-4">
        <ServiGoIcon size={52} white />
        <span className="text-white font-black text-2xl">ServiGo</span>
        <Loader2 className="w-7 h-7 animate-spin text-white/60 mt-2" />
        <p className="text-white/40 text-sm">Connexion en cours...</p>
      </div>
    );
  }

  // Capacitor: show login form directly (auth already checked by AuthContext)
  return (
    <div className="fixed inset-0 bg-[#1A1A2E] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <ServiGoIcon size={56} white />
          <span className="text-white font-black text-2xl">ServiGo</span>
          <p className="text-white/50 text-sm">Connectez-vous pour continuer</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/60"
            />
          </div>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/60 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#6C5CE7] hover:bg-[#5A4DD6] text-white font-semibold rounded-xl text-base"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Se connecter'}
          </Button>
        </form>

        <div className="space-y-3 text-center">
          <button
            type="button"
            onClick={() => window.open('https://app.myservigo.be/reset-password', '_blank')}
            className="text-white/50 text-sm hover:text-white/80 transition-colors underline underline-offset-2"
          >
            Mot de passe oublié ?
          </button>
          <p className="text-white/30 text-xs">
            Pas de compte ? Créez-en un sur app.myservigo.be
          </p>
        </div>
      </div>
    </div>
  );
}
