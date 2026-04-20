import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Briefcase, ChevronRight, Shield } from 'lucide-react';
import { ServiGoIcon } from '@/components/brand/ServiGoLogo';

export default function AccountTypeSelection() {
  const navigate = useNavigate();

  return (
    <div
      className="bg-background flex flex-col"
      style={{ minHeight: '100dvh' }}>
      
      {/* Header — taille fluide */}
      <div className="bg-[#000000] pt-10 pb-8 px-5 text-center shrink-0">
        <div className="flex justify-center mb-3">
          <ServiGoIcon size={48} white />
        </div>
        <h1 className="text-white font-black text-2xl tracking-tight">ServiGo</h1>
        <p className="text-white/60 text-sm mt-1">La plateforme des artisans de confiance</p>
      </div>

      {/* Content — centré verticalement sur les grands écrans */}
      <div className="flex-1 flex flex-col justify-center px-4 py-6 sm:px-8">
        <div className="w-full max-w-md mx-auto space-y-5">

          {/* Title */}
          <div className="text-center mb-2">
            <h2 className="text-lg sm:text-xl font-bold text-foreground leading-snug">
              Quel type de compte souhaitez-vous créer ?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choisissez votre profil pour commencer
            </p>
          </div>

          {/* Particulier card */}
          <button
            onClick={() => navigate('/Register', { state: { preselectedType: 'particulier' } })}
            className="w-full bg-card rounded-2xl border-2 border-border hover:border-[#FF6B35] hover:shadow-lg active:scale-[0.98] transition-all duration-200 p-4 sm:p-5 text-left group">
            
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#FFF0EB] flex items-center justify-center shrink-0 group-hover:bg-[#FF6B35] transition-colors">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF6B35] group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-base">Particulier</p>
                <p className="text-sm text-muted-foreground leading-snug">
                  Je cherche un professionnel pour un service à domicile
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-[#FF6B35] transition-colors shrink-0" />
            </div>
            <div className="w-full py-2.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl text-center">
              Créer un compte particulier
            </div>
          </button>

          {/* Professionnel card */}
          <button
            onClick={() => {window.location.href = 'https://servi-go-pro.base44.app';}}
            className="w-full bg-card rounded-2xl border-2 border-border hover:border-[#1A365D] hover:shadow-lg active:scale-[0.98] transition-all duration-200 p-4 sm:p-5 text-left group">
            
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#EBF8FF] flex items-center justify-center shrink-0 group-hover:bg-[#1A365D] transition-colors">
                <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-[#1A365D] group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-base">Professionnel</p>
                <p className="text-sm text-muted-foreground leading-snug">
                  Je suis un pro et je veux recevoir des missions
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-[#1A365D] transition-colors shrink-0" />
            </div>
            <div className="w-full py-2.5 bg-[#1A365D] text-white text-sm font-semibold rounded-xl text-center">
              Créer un compte professionnel
            </div>
          </button>

          {/* Trust badge */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
            <Shield className="w-3.5 h-3.5 text-green-500" />
            <span>Inscription sécurisée · Données protégées RGPD</span>
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-muted-foreground">
            Déjà un compte ?{' '}
            <button
              onClick={() => {window.location.href = '/se-connecter';}}
              className="text-[#FF6B35] font-semibold hover:underline">
              
              Se connecter
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-muted-foreground border-t border-border shrink-0">
        <a href="/cgu" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">CGU</a>
        {" · "}
        <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Confidentialité</a>
        {" · "}
        <span>© 2026 ServiGo</span>
      </div>
    </div>);

}