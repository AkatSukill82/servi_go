import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BRAND } from '@/lib/theme';

const STORAGE_KEY = 'servigo_location_asked';

export default function LocationPermissionModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          if (user?.id) {
            await base44.entities.User.update(user.id, {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
          }
        } catch (_) {}
        setLoading(false);
        setOpen(false);
      },
      () => {
        setLoading(false);
        setOpen(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={dismiss}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl px-6 pt-5"
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
            }}
          >
            {/* Handle bar */}
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-6" />

            {/* Icon */}
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
              style={{
                background: `linear-gradient(135deg, ${BRAND}, #a78bfa)`,
                boxShadow: `0 8px 24px ${BRAND}50`,
              }}
            >
              <MapPin className="w-9 h-9 text-white" strokeWidth={2} />
            </div>

            <h2 className="text-2xl font-black text-foreground text-center mb-2">
              Activer la localisation
            </h2>
            <p className="text-sm text-muted-foreground text-center leading-relaxed mb-8 px-2">
              ServiGo utilise votre position pour vous connecter aux professionnels les plus proches et suivre vos missions en temps réel.
            </p>

            <button
              onClick={accept}
              disabled={loading}
              className="w-full h-14 rounded-2xl text-white text-base font-black mb-3 disabled:opacity-60"
              style={{
                background: `linear-gradient(135deg, ${BRAND}, #a78bfa)`,
                boxShadow: `0 4px 16px ${BRAND}40`,
              }}
            >
              {loading ? 'Localisation en cours…' : 'Autoriser la localisation'}
            </button>

            <button
              onClick={dismiss}
              className="w-full h-12 rounded-2xl text-muted-foreground text-sm font-semibold"
            >
              Pas maintenant
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
