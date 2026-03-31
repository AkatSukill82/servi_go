import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Home, Briefcase, CheckCircle, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CARDS = [
  {
    type: 'particulier',
    icon: Home,
    title: 'Je cherche un professionnel',
    subtitle: 'Trouvez un expert près de chez vous, gratuitement',
    badge: '100% gratuit',
    badgeColor: 'bg-[#E1F5EE] text-[#085041]',
    points: ['Accès illimité aux pros', 'Contrats sécurisés', 'Paiement direct au pro'],
  },
  {
    type: 'professionnel',
    icon: Briefcase,
    title: 'Je propose mes services',
    subtitle: 'Recevez des missions dans votre domaine',
    badge: '10 € / mois',
    badgeColor: 'bg-[#EEEDFE] text-[#534AB7]',
    points: ['Missions géolocalisées', 'Badge vérifié', 'Contrats protégés'],
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const user = await base44.auth.me();
        if (user?.role === 'admin') navigate('/AdminDashboard', { replace: true });
        else if (user?.user_type === 'professionnel') navigate('/ProDashboard', { replace: true });
        else if (user?.user_type === 'particulier') navigate('/Home', { replace: true });
        else navigate('/Register', { replace: true });
      } else {
        setChecking(false);
      }
    });
  }, []);

  const handleContinue = () => {
    if (!selected) return;
    navigate('/Register', { state: { preselectedType: selected } });
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center" style={{ minHeight: '100dvh' }}>
        <Loader2 className="w-7 h-7 animate-spin text-[#534AB7]" />
      </div>
    );
  }

  return (
    <div
      className="bg-[#F7F6F3] flex flex-col items-center justify-center px-5 py-10"
      style={{ minHeight: '100dvh' }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 rounded-2xl bg-[#534AB7] flex items-center justify-center mx-auto mb-3 shadow-lg">
          <span className="text-2xl font-black text-white">S</span>
        </div>
        <p className="text-sm font-semibold text-[#534AB7] tracking-wide uppercase">ServiGo</p>
        <p className="text-xs text-[#9CA3AF] mt-0.5">Trouvez le bon professionnel</p>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-6"
      >
        <h1 className="text-2xl font-bold text-[#111827]">Bienvenue sur ServiGo</h1>
        <p className="text-[#6B7280] mt-1 text-sm">Choisissez votre profil pour commencer</p>
      </motion.div>

      {/* Cards */}
      <div className="w-full max-w-lg space-y-3 mb-6">
        {CARDS.map(({ type, icon: Icon, title, subtitle, badge, badgeColor, points }, i) => (
          <motion.button
            key={type}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            onClick={() => setSelected(type)}
            className={`w-full text-left p-5 rounded-2xl border-2 transition-all shadow-sm ${
              selected === type
                ? 'border-[#534AB7] bg-[#EEEDFE]/40 shadow-md'
                : 'border-[#E5E7EB] bg-white hover:border-[#534AB7]/40 hover:shadow-md'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${selected === type ? 'bg-[#534AB7]' : 'bg-[#F3F4F6]'}`}>
                <Icon className={`w-6 h-6 ${selected === type ? 'text-white' : 'text-[#6B7280]'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-[#111827]">{title}</p>
                  {selected === type && <CheckCircle className="w-4 h-4 text-[#534AB7] shrink-0" />}
                </div>
                <p className="text-sm text-[#6B7280] mb-2">{subtitle}</p>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
                <ul className="mt-2 space-y-0.5">
                  {points.map(p => (
                    <li key={p} className="text-xs text-[#6B7280] flex items-center gap-1.5">
                      <span className="text-[#1D9E75]">✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="w-full max-w-lg space-y-3"
      >
        <Button
          onClick={handleContinue}
          disabled={!selected}
          className="w-full h-12 rounded-xl text-base bg-[#534AB7] hover:bg-[#4338A0] disabled:opacity-40"
        >
          Continuer <ChevronRight className="w-5 h-5 ml-1" />
        </Button>

        <p className="text-center text-sm text-[#9CA3AF]">
          Déjà un compte ?{' '}
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="text-[#534AB7] font-semibold hover:underline"
          >
            Se connecter
          </button>
        </p>
      </motion.div>
    </div>
  );
}