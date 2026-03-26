import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, Shield, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useI18n } from '@/hooks/useI18n';
import { Link } from 'react-router-dom';
import CookieBanner from '@/components/legal/CookieBanner';
import { useDarkMode } from '@/hooks/useDarkMode';



export default function Landing() {
  useDarkMode();
  const { t, lang, setLang, SUPPORTED_LANGS } = useI18n();

  const features = [
    { icon: Zap, label: t('landing_fast'), text: t('landing_fast_text') },
    { icon: Shield, label: t('landing_secure'), text: t('landing_secure_text') },
    { icon: Star, label: t('landing_reliable'), text: t('landing_reliable_text') },
  ];
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleGetStarted = () => base44.auth.redirectToLogin('/SelectUserType');
  const handleLogin = () => base44.auth.redirectToLogin('/Home');

  return (
    <div
      className="bg-background flex flex-col overflow-hidden"
      style={{
        height: '100vh',
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
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
          {t('landing_login')}
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
            {t('landing_tagline')}
          </p>
          <h1 className="text-4xl font-black tracking-tight text-foreground leading-[1.1] mb-5" style={{ whiteSpace: 'pre-line' }}>
            {t('landing_title')}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-xs mb-10">
            {t('landing_subtitle')}
          </p>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={handleGetStarted}
            className="group flex items-center gap-3 bg-foreground text-background rounded-xl px-6 py-4 text-sm font-semibold w-full justify-between active:scale-[0.98] transition-transform"
          >
            <span>{t('landing_cta')}</span>
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

        {/* Legal links */}
        <div className="flex justify-center gap-4 mt-6">
          <Link to="/CGU" className="text-[10px] text-muted-foreground underline underline-offset-2">CGU</Link>
          <Link to="/PrivacyPolicy" className="text-[10px] text-muted-foreground underline underline-offset-2">Confidentialité</Link>
        </div>
      </motion.div>

      {/* Lang switcher — floating bottom right */}
      <div ref={langRef} className="fixed bottom-6 right-5 z-50 flex flex-col items-end gap-2">
        <AnimatePresence>
          {langOpen && SUPPORTED_LANGS.filter(l => l !== lang).map((l, i) => (
            <motion.button
              key={l}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => { setLang(l); setLangOpen(false); }}
              className="w-12 h-10 rounded-xl bg-card border border-border shadow text-xs font-bold text-foreground hover:bg-muted transition-colors"
            >
              {l.toUpperCase()}
            </motion.button>
          ))}
        </AnimatePresence>
        <button
          onClick={() => setLangOpen(o => !o)}
          className="w-12 h-10 rounded-xl bg-foreground text-background text-xs font-bold shadow-lg hover:bg-foreground/90 transition-colors"
        >
          {lang.toUpperCase()}
        </button>
      </div>

      <CookieBanner />
    </div>
  );
}