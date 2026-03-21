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
  useDarkMode(); // Apply saved theme on landing page
  const handleGetStarted = () => base44.auth.redirectToLogin('/SelectUserType');
  const handleLogin = () => base44.auth.redirectToLogin('/Home');

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden px-6"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Logo + Title */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col items-center pt-14 pb-8"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-5">
          <span className="text-2xl font-black text-white">S</span>
        </div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">ServiGo</h1>
        <p className="text-muted-foreground text-sm text-center max-w-xs mt-2 leading-relaxed">
          Trouvez un professionnel près de chez vous en quelques minutes
        </p>
      </motion.div>

      {/* Features */}
      <div className="flex-1 flex flex-col justify-center gap-2.5">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="flex items-center gap-4 bg-card rounded-2xl p-4 border border-border"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
              </div>
              <span className="text-sm font-medium text-foreground">{f.text}</span>
            </motion.div>
          );
        })}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="pb-10 pt-6 space-y-3"
      >
        <Button
          onClick={handleGetStarted}
          className="w-full h-13 rounded-2xl text-base font-semibold"
          style={{ height: 52 }}
        >
          Créer un compte
        </Button>
        <Button
          variant="ghost"
          onClick={handleLogin}
          className="w-full h-13 rounded-2xl text-base font-medium text-muted-foreground"
          style={{ height: 48 }}
        >
          J'ai déjà un compte
        </Button>
      </motion.div>
    </div>
  );
}