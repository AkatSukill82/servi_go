import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useDarkMode } from '@/hooks/useDarkMode';

const features = [
  { icon: Zap, label: 'Rapide', text: 'Un pro disponible en quelques minutes' },
  { icon: Shield, label: 'Sécurisé', text: 'Paiements protégés, pros vérifiés' },
  { icon: Star, label: 'Fiable', text: 'Noté par de vrais clients' },
];

export default function Landing() {
  useDarkMode();
  const handleGetStarted = () => base44.auth.redirectToLogin('/SelectUserType');
  const handleLogin = () => base44.auth.redirectToLogin('/Home');

  return (
    <div
      className="h-screen bg-background flex flex-col overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
            <span className="text-xs font-black text-background">S</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">ServiGo</span>
        </div>
        <button
          onClick={handleLogin}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Se connecter
        </button>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-4">
            La plateforme pro
          </p>
          <h1 className="text-4xl font-black tracking-tight text-foreground leading-[1.1] mb-5">
            Trouvez le bon<br />professionnel,<br />maintenant.
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-xs mb-10">
            Mettez en relation particuliers et artisans qualifiés près de chez vous.
          </p>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={handleGetStarted}
            className="group flex items-center gap-3 bg-foreground text-background rounded-xl px-6 py-4 text-sm font-semibold w-full justify-between active:scale-[0.98] transition-transform"
          >
            <span>Créer un compte gratuitement</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </motion.button>
        </motion.div>
      </div>

      {/* Features strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="px-6 pb-10"
      >
        <div className="grid grid-cols-3 gap-2">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="bg-muted rounded-xl p-3 flex flex-col gap-2">
                <Icon className="w-4 h-4 text-foreground" strokeWidth={1.8} />
                <div>
                  <p className="text-xs font-semibold text-foreground">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{f.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}