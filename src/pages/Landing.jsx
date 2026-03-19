import React from 'react';
import { motion } from 'framer-motion';
import { Wrench, Shield, Zap, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Zap, text: 'Trouvez un pro en quelques minutes' },
  { icon: Shield, text: 'Paiement sécurisé et protégé' },
  { icon: Wrench, text: 'Artisans vérifiés et notés' },
];

export default function Landing() {
  const handleGetStarted = () => {
    base44.auth.redirectToLogin('/SelectUserType');
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin('/Home');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          {/* Logo */}
          <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/30">
            <span className="text-4xl font-black text-white">S</span>
          </div>
          <h1 className="text-3xl font-black text-foreground mb-2">ServiConnect</h1>
          <p className="text-muted-foreground text-base max-w-xs mx-auto">
            La plateforme qui connecte particuliers et professionnels du bâtiment
          </p>
        </motion.div>

        {/* Features */}
        <div className="w-full max-w-sm space-y-3 mb-12">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-4 bg-card rounded-2xl p-4 border border-border/50 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium">{f.text}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="px-6 pb-12 space-y-3"
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