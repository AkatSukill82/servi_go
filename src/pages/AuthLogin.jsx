import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ServiGoIcon } from '@/components/brand/ServiGoLogo';
import { Loader2, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const user = await base44.auth.me();
        redirectByRole(user);
      } else {
        setChecking(false);
      }
    });
  }, []);

  const redirectByRole = (user) => {
    if (user?.role === 'admin') navigate('/AdminDashboard', { replace: true });
    else if (user?.user_type === 'professionnel') navigate('/ProDashboard', { replace: true });
    else navigate('/Home', { replace: true });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.login(email.trim(), password);
      const user = await base44.auth.me();
      redirectByRole(user);
    } catch (err) {
      toast.error('Email ou mot de passe incorrect');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="fixed inset-0 bg-[#1A1A2E] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#F7FAFC] overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="bg-[#1A1A2E] px-5 pt-10 pb-8 text-center shrink-0">
        <div className="flex justify-center mb-4">
          <ServiGoIcon size={52} white />
        </div>
        <h1 className="text-white font-black text-2xl">ServiGo</h1>
        <p className="text-white/60 text-sm mt-1">Connectez-vous à votre compte</p>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-md border border-[#E2E8F0] p-6 space-y-5">
            <h2 className="text-xl font-bold text-[#1A365D] text-center">Se connecter</h2>

            <div className="space-y-1.5">
              <Label className="text-xs text-[#4A5568]">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#CBD5E0]" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="h-12 rounded-xl pl-10"
                  autoComplete="email"
                  inputMode="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-[#4A5568]">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#CBD5E0]" />
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 rounded-xl pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#CBD5E0] hover:text-[#718096]"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#1A365D] hover:bg-[#2D4A7A] text-white font-bold text-base"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-[#718096]">Pas encore de compte ?</p>
            <Button
              variant="outline"
              onClick={() => navigate('/creer-compte')}
              className="w-full h-12 rounded-xl border-2 border-[#1A365D] text-[#1A365D] font-bold text-base hover:bg-[#1A365D] hover:text-white transition-colors"
            >
              Créer un compte
            </Button>
          </div>
        </div>
      </div>

      <div className="text-center py-4 text-xs text-[#A0AEC0] shrink-0">
        <a href="/cgu" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#718096]">CGU</a>
        {' · '}
        <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#718096]">Confidentialité</a>
        {' · '}
        <span>© 2026 ServiGo</span>
      </div>
    </div>
  );
}