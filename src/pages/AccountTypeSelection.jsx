import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Wrench, ChevronRight, ShieldCheck } from 'lucide-react';

export default function AccountTypeSelection() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col bg-[#F2F3F7]" style={{ minHeight: '100dvh' }}>

      {/* Header clean blanc */}
      <div className="bg-white border-b border-gray-100 px-5 pt-10 pb-5 text-center shrink-0">
        {/* Shield icon — violet comme le mockup */}
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 flex items-center justify-center">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="#6C5CE7" />
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <h1 className="text-xl font-black tracking-tight" style={{ color: '#6C5CE7' }}>ServiGo</h1>
        <p className="text-gray-500 text-sm mt-0.5">Créer un compte</p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-5 py-8">
        <div className="w-full max-w-sm mx-auto space-y-5">

          {/* Title */}
          <div className="text-center mb-2">
            <h2 className="text-2xl font-black text-gray-900 leading-snug">Vous êtes ?</h2>
            <p className="text-sm text-gray-500 mt-1.5">Choisissez votre profil pour commencer</p>
          </div>

          {/* Particulier card */}
          <button
            onClick={() => navigate('/Register?type=particulier')}
            className="w-full bg-white rounded-2xl border border-gray-200 active:scale-[0.98] transition-transform duration-150 p-5 text-left flex items-center gap-4 cursor-pointer"
            style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#FDEEE8' }}>
              <Home className="w-7 h-7" style={{ color: '#E17055' }} strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900 text-base">Particulier</p>
              <p className="text-sm text-gray-500 mt-0.5">Je cherche un professionnel</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
          </button>

          {/* Professionnel card */}
          <button
            onClick={() => { window.location.href = 'https://servi-go-pro.base44.app'; }}
            className="w-full bg-white rounded-2xl border border-gray-200 active:scale-[0.98] transition-transform duration-150 p-5 text-left flex items-center gap-4 cursor-pointer"
            style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#E8E6F8' }}>
              <Wrench className="w-7 h-7 text-gray-500" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900 text-base">Professionnel</p>
              <p className="text-sm text-gray-500 mt-0.5">Je propose mes services</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
          </button>

          {/* Login link */}
          <p className="text-center text-sm text-gray-500 pt-2">
            Déjà un compte ?{' '}
            <button
              onClick={() => { window.location.href = '/se-connecter'; }}
              className="font-bold cursor-pointer hover:underline"
              style={{ color: '#6C5CE7' }}
            >
              Se connecter
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-5 text-xs text-gray-400 border-t border-gray-100 bg-white shrink-0">
        <a href="/cgu" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">CGU</a>
        {" · "}
        <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Confidentialité</a>
        {" · "}
        <span>© 2026 ServiGo</span>
      </div>
    </div>
  );
}