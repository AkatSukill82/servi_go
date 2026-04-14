import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function PageNotFound() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          navigate('/Home');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6" style={{ minHeight: '100dvh' }}>
      <div className="text-center max-w-sm mx-auto">
        {/* Illustration */}
        <div className="w-32 h-32 mx-auto mb-6 relative">
          <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-6xl font-black text-primary/20">4</span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg">
                <span className="text-2xl font-black text-white">S</span>
              </div>
            </div>
          </div>
        </div>

        <h1 className="text-7xl font-black text-primary/20 mb-2">404</h1>
        <h2 className="text-xl font-bold text-foreground mb-3">Page introuvable</h2>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Oups ! Cette page n'existe pas ou a été déplacée.<br />
          Pas d'inquiétude, ServiGo est toujours là pour vous aider.
        </p>
        <p className="text-sm text-primary font-medium mb-8">
          Redirection vers l'accueil dans {countdown} seconde{countdown > 1 ? 's' : ''}…
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-full h-12 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Home className="w-4 h-4" />
            Retour à l'accueil
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full h-12 rounded-xl border border-border text-foreground font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Page précédente
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          <span className="font-semibold text-primary">ServiGo</span> — Trouvez le bon professionnel
        </p>
      </div>
    </div>
  );
}