import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Briefcase, ChevronRight } from 'lucide-react';
import { ServiGoIcon } from '@/components/brand/ServiGoLogo';
import { base44 } from '@/api/base44Client';

export default function AccountTypeSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <div className="bg-[#1A1A2E] px-5 pt-10 pb-8 text-center">
        <div className="flex justify-center mb-4">
          <ServiGoIcon size={52} white />
        </div>
        <h1 className="text-white font-black text-2xl">ServiGo</h1>
        <p className="text-white/60 text-sm mt-1">La plateforme des artisans de confiance</p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full md:max-w-lg">
          <h2 className="text-xl font-bold text-foreground text-center mb-2">
            Quel type de compte souhaitez-vous créer ?
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Choisissez votre profil pour commencer
          </p>

          {/* Cards */}
          <div className="space-y-4 mb-8">
            {/* Particulier */}
            <button
              onClick={() => navigate('/Register', { state: { preselectedType: 'particulier' } })}
              className="w-full bg-card rounded-2xl border-2 border-border hover:border-[#FF6B35] hover:shadow-lg transition-all duration-200 p-5 text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#FFF0EB] flex items-center justify-center shrink-0 group-hover:bg-[#FF6B35] transition-colors">
                  <User className="w-6 h-6 text-[#FF6B35] group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-base mb-1">Particulier</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Je cherche un professionnel pour un service à domicile
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#CBD5E0] group-hover:text-[#FF6B35] transition-colors shrink-0 mt-1" />
              </div>
              <div className="mt-4">
                <div className="w-full py-2.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl text-center">
                  Créer un compte particulier
                </div>
              </div>
            </button>

            {/* Professionnel */}
            <button
              onClick={() => { window.location.href = 'https://servi-go-pro.base44.app'; }}
              className="w-full bg-card rounded-2xl border-2 border-border hover:border-[#1A365D] hover:shadow-lg transition-all duration-200 p-5 text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#EBF8FF] flex items-center justify-center shrink-0 group-hover:bg-[#1A365D] transition-colors">
                  <Briefcase className="w-6 h-6 text-[#1A365D] group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-base mb-1">Professionnel</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Je suis un pro et je veux recevoir des missions
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#CBD5E0] group-hover:text-[#1A365D] transition-colors shrink-0 mt-1" />
              </div>
              <div className="mt-4">
                <div className="w-full py-2.5 bg-[#1A365D] text-white text-sm font-semibold rounded-xl text-center">
                  Créer un compte professionnel
                </div>
              </div>
            </button>
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-muted-foreground">
            Déjà un compte ?{' '}
            <button
              onClick={() => base44.auth.redirectToLogin('/Home')}
              className="text-[#FF6B35] font-semibold hover:underline"
            >
              Se connecter
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-muted-foreground">
        <a href="/cgu" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">CGU</a>
        {" · "}
        <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Confidentialité</a>
        {" · "}
        <span>© 2026 ServiGo</span>
      </div>
    </div>
  );
}