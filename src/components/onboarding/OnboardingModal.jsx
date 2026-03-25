import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Zap, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    icon: MapPin,
    emoji: '📍',
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    title: 'Trouvez le bon pro',
    description: 'Décrivez votre besoin et ServiGo trouve automatiquement le professionnel disponible le plus proche de chez vous.',
    visual: (
      <div className="relative w-48 h-48 mx-auto">
        <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-30" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-4 rounded-full bg-blue-100" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-200">
            <MapPin className="w-8 h-8 text-white" />
          </div>
        </div>
        {/* Floating pro dots */}
        {[[-60, -20], [55, -30], [50, 40], [-50, 45]].map(([x, y], i) => (
          <motion.div key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.15 }}
            className="absolute w-8 h-8 bg-white rounded-full border-2 border-blue-200 shadow flex items-center justify-center text-xs font-bold text-blue-600"
            style={{ top: `calc(50% + ${y}px)`, left: `calc(50% + ${x}px)` }}
          >
            {['P', 'E', 'D', 'M'][i]}
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    icon: Zap,
    emoji: '⚡',
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
    textColor: 'text-orange-600',
    title: 'Intervention en urgence',
    description: 'Besoin immédiat ? Activez le mode SOS pour mobiliser un professionnel en priorité absolue, en quelques secondes.',
    visual: (
      <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center shadow-xl shadow-red-200"
        >
          <Zap className="w-10 h-10 text-white fill-white" />
        </motion.div>
        <motion.div
          animate={{ opacity: [0.4, 0, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute inset-0 rounded-full border-4 border-red-400"
        />
        <div className="absolute top-3 right-6">
          <div className="bg-red-100 border border-red-300 rounded-full px-3 py-1 text-xs font-bold text-red-700">⚡ SOS</div>
        </div>
        <div className="absolute bottom-6 left-4 bg-white rounded-xl px-3 py-2 shadow-md border border-border">
          <p className="text-xs font-semibold text-foreground">Pro en route</p>
          <p className="text-[10px] text-muted-foreground">~8 min</p>
        </div>
      </div>
    ),
  },
  {
    icon: ShieldCheck,
    emoji: '🛡️',
    color: 'bg-green-500',
    lightColor: 'bg-green-50',
    textColor: 'text-green-600',
    title: 'Pros certifiés & sécurisés',
    description: 'Tous nos professionnels sont vérifiés (identité, assurance, attestation). Paiement sécurisé et suivi en temps réel.',
    visual: (
      <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-200">
          <ShieldCheck className="w-12 h-12 text-white" />
        </div>
        {[
          { label: '✓ Identité', top: '10%', left: '-5%' },
          { label: '✓ Assurance', top: '10%', right: '-5%' },
          { label: '✓ ONSS', bottom: '10%', left: '5%' },
          { label: '⭐ 4.9', bottom: '10%', right: '0%' },
        ].map((badge, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.15 }}
            className="absolute bg-white border border-green-200 rounded-full px-2.5 py-1 shadow text-[10px] font-semibold text-green-700"
            style={{ top: badge.top, left: badge.left, right: badge.right, bottom: badge.bottom }}
          >
            {badge.label}
          </motion.div>
        ))}
      </div>
    ),
  },
];

const STORAGE_KEY = 'servigo_onboarding_done';
const CGU_KEY = 'servigo_cgu_accepted';

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [cguAccepted, setCguAccepted] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Small delay so the app renders first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else close();
  };

  const current = STEPS[step];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/60 flex items-end justify-center"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="w-full max-w-md bg-background rounded-t-3xl overflow-hidden"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
          >
            {/* Close */}
            <div className="flex justify-end px-5 pt-4">
              <button onClick={close} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Visual */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="px-6 pt-2 pb-6"
              >
                <div className={`${current.lightColor} rounded-3xl py-8 mb-6 flex items-center justify-center`}>
                  {current.visual}
                </div>

                <h2 className="text-2xl font-bold text-center mb-2">{current.title}</h2>
                <p className="text-sm text-muted-foreground text-center leading-relaxed mb-6">{current.description}</p>

                {/* Dots */}
                <div className="flex justify-center gap-1.5 mb-6">
                  {STEPS.map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ width: i === step ? 20 : 6 }}
                      className={`h-1.5 rounded-full transition-colors ${i === step ? current.color : 'bg-muted'}`}
                    />
                  ))}
                </div>

                <Button onClick={next} className="w-full h-13 rounded-2xl text-base font-semibold flex items-center justify-center gap-2">
                  {step < STEPS.length - 1 ? (
                    <><span>Suivant</span><ArrowRight className="w-4 h-4" /></>
                  ) : (
                    <span>C'est parti ! 🚀</span>
                  )}
                </Button>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}