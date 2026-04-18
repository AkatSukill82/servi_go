import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';

const COOKIE_KEY = 'servigo_cookies_v2';

async function logConsent(type, granted) {
  try {
    const authed = await base44.auth.isAuthenticated();
    if (!authed) return;
    const user = await base44.auth.me();
    await base44.entities.ConsentLog.create({
      user_email: user.email,
      consent_type: type,
      granted,
      version: 'v1.0',
      granted_at: new Date().toISOString(),
    });
  } catch {}
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_KEY)) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const saveAndClose = async (analyticsVal, marketingVal) => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ analytics: analyticsVal, marketing: marketingVal }));
    setVisible(false);
    await logConsent('cookies_analytics', analyticsVal);
    await logConsent('cookies_marketing', marketingVal);
  };

  const acceptAll = () => saveAndClose(true, true);
  const declineAll = () => saveAndClose(false, false);
  const saveCustom = () => saveAndClose(analytics, marketing);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[9998] p-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        >
          <div className="bg-card border border-border rounded-2xl shadow-xl p-4 max-w-lg mx-auto">
            <p className="text-sm font-semibold mb-1">🍪 Gestion des cookies</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Nous utilisons des cookies pour le fonctionnement de l'application et, avec votre consentement, pour mesurer l'audience.{' '}
              <a href="/cookies" target="_blank" rel="noopener noreferrer" className="text-primary underline">En savoir plus</a>
            </p>

            {showCustomize && (
              <div className="mb-3 space-y-2 bg-muted/40 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Nécessaires</p>
                    <p className="text-[10px] text-muted-foreground">Toujours actifs</p>
                  </div>
                  <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Actif</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Analytiques</p>
                    <p className="text-[10px] text-muted-foreground">Mesure d'audience anonymisée</p>
                  </div>
                  <button
                    onClick={() => setAnalytics(a => !a)}
                    style={{
                      position: 'relative', width: '40px', height: '22px', borderRadius: '11px',
                      backgroundColor: analytics ? '#4F46E5' : '#D1D5DB',
                      border: 'none', cursor: 'pointer', padding: 0, minHeight: 'unset', minWidth: 'unset',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: '2px', left: analytics ? '20px' : '2px',
                      width: '18px', height: '18px', borderRadius: '9px', backgroundColor: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s ease',
                    }} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Marketing</p>
                    <p className="text-[10px] text-muted-foreground">Publicités personnalisées</p>
                  </div>
                  <button
                    onClick={() => setMarketing(m => !m)}
                    style={{
                      position: 'relative', width: '40px', height: '22px', borderRadius: '11px',
                      backgroundColor: marketing ? '#4F46E5' : '#D1D5DB',
                      border: 'none', cursor: 'pointer', padding: 0, minHeight: 'unset', minWidth: 'unset',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: '2px', left: marketing ? '20px' : '2px',
                      width: '18px', height: '18px', borderRadius: '9px', backgroundColor: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s ease',
                    }} />
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={declineAll}
                className="flex-1 h-9 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors min-w-[80px]"
              >
                Refuser
              </button>
              <button
                onClick={() => setShowCustomize(s => !s)}
                className="flex-1 h-9 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors min-w-[90px]"
              >
                {showCustomize ? 'Valider' : 'Personnaliser'}
              </button>
              {showCustomize ? (
                <button
                  onClick={saveCustom}
                  className="flex-1 h-9 rounded-xl bg-foreground text-background text-xs font-semibold min-w-[80px]"
                >
                  Enregistrer
                </button>
              ) : (
                <button
                  onClick={acceptAll}
                  className="flex-1 h-9 rounded-xl bg-foreground text-background text-xs font-semibold min-w-[80px]"
                >
                  Accepter tout
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}