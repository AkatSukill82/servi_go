import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PageNotFound() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); navigate('/Home'); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 font-inter" style={{ minHeight: '100dvh' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-xs mx-auto"
      >
        {/* Illustration */}
        <div className="w-28 h-28 mx-auto mb-6 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center">
          <MapPin className="w-14 h-14 text-[#4F46E5]" strokeWidth={1.5} />
        </div>

        <p className="text-xs font-bold tracking-widest text-[#4F46E5] uppercase mb-2">Erreur 404</p>
        <h1 className="text-2xl font-bold text-foreground tracking-[-0.02em] mb-2">Page introuvable</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Cette page n'existe pas ou a été déplacée.<br />
          Redirection dans <span className="font-semibold text-foreground">{countdown}s</span>…
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/Home')}
            className="w-full h-12 rounded-pill bg-[#4F46E5] text-white text-sm font-semibold flex items-center justify-center gap-2 tap-scale"
          >
            <Home className="w-4 h-4" /> Retour à l'accueil
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full h-12 rounded-pill border border-border text-foreground text-sm font-medium flex items-center justify-center gap-2 tap-scale"
          >
            <ArrowLeft className="w-4 h-4" /> Page précédente
          </button>
        </div>
      </motion.div>
    </div>
  );
}