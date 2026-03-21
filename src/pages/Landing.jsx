import React from 'react';
import { motion } from 'framer-motion';
import { Wrench, Shield, Zap, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useDarkMode } from '@/hooks/useDarkMode';

const features = [
  { icon: Zap, text: 'Trouvez un pro en quelques minutes' },
  { icon: Shield, text: 'Paiement sécurisé et protégé' },
  { icon: Wrench, text: 'Artisans vérifiés et notés' },
];

export default function Landing() {
  const handleGetStarted = () => base44.auth.redirectToLogin('/SelectUserType');
  const handleLogin = () => base44.auth.redirectToLogin('/Home');

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden px-6"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Logo + Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center pt-12 pb-6"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mb-4 shadow-xl shadow-primary/30">
          <span className="text-3xl font-black text-white">S</span>
        </div>
        <h1 className="text-3xl font-black text-foreground mb-1">ServiGo</h1>
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          La plateforme qui connecte particuliers et professionnels du bâtiment
        </p>
      </motion.div>

      {/* Features */}
      <div className="flex-1 flex flex-col justify-center gap-3">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
              className="flex items-center gap-4 bg-card rounded-2xl p-4 border border-border/50 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">{f.text}</span>
            </motion.div>
          );
        })}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="pb-10 pt-6 space-y-3"
      >
        <Button
          onClick={handleGetStarted}
          className="w-full h-14 rounded-2xl text-base font-semibold shadow-lg shadow-primary/20"
        >
          Créer un compte
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
        <Button
          variant="outline"
          onClick={handleLogin}
          className="w-full h-14 rounded-2xl text-base font-semibold"
        >
          J'ai déjà un compte
        </Button>
      </motion.div>
    </div>
  );
}