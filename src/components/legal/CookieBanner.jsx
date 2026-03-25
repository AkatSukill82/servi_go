import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const COOKIE_KEY = 'servigo_cookies_accepted';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_KEY)) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, '1');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, '0');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[9998] p-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          <div className="bg-card border border-border rounded-2xl shadow-lg p-4 max-w-md mx-auto">
            <p className="text-sm font-semibold mb-1">🍪 Cookies</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Nous utilisons uniquement des cookies nécessaires au fonctionnement de l'application.
              {' '}<Link to="/PrivacyPolicy" className="text-primary underline" onClick={accept}>En savoir plus</Link>
            </p>
            <div className="flex gap-2">
              <button
                onClick={decline}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Refuser
              </button>
              <button
                onClick={accept}
                className="flex-1 h-10 rounded-xl bg-foreground text-background text-sm font-semibold transition-colors"
              >
                Accepter
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}