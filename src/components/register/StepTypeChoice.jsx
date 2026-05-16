import React, { useState } from 'react';
import { Briefcase, Home, CheckCircle, ChevronRight } from 'lucide-react';
import { ServiGoIcon } from '@/components/brand/ServiGoLogo';

const cards = [
  {
    type: 'particulier',
    icon: Home,
    title: 'Je cherche un professionnel',
    subtitle: 'Trouvez un expert près de chez vous, gratuitement',
    badge: '100% gratuit',
    badgeColor: 'bg-[#E1F5EE] text-[#085041]',
    points: ['Accès illimité aux pros', 'Contrats sécurisés', 'Paiement direct au pro'],
  },
  {
    type: 'professionnel',
    icon: Briefcase,
    title: 'Je propose mes services',
    subtitle: 'Recevez des missions dans votre domaine',
    badge: '10 € / mois',
    badgeColor: 'bg-[#EEEDFE] text-[#534AB7]',
    points: ['Missions géolocalisées', 'Badge vérifié', 'Contrats protégés'],
  },
];

export default function StepTypeChoice({ onSelect }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="w-full md:max-w-lg mx-auto px-5 pb-10">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <ServiGoIcon size={56} />
        </div>
        <h1 className="text-2xl font-bold text-[#111827]">Bienvenue sur ServiGo</h1>
        <p className="text-[#6B7280] mt-1 text-sm">Trouvez le bon professionnel, partout en Belgique</p>
      </div>

      <div className="space-y-3 mb-6">
        {cards.map(({ type, icon: Icon, title, subtitle, badge, badgeColor, points }) => (
          <button
            key={type}
            onClick={() => setSelected(type)}
            className={`w-full text-left p-5 rounded-2xl border-2 transition-all shadow-sm ${
              selected === type
                ? 'border-[#534AB7] bg-[#EEEDFE]/40 shadow-md'
                : 'border-border bg-card hover:border-[#534AB7]/40 hover:shadow-md'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${selected === type ? 'bg-[#534AB7]' : 'bg-[#F3F4F6]'}`}>
                <Icon className={`w-6 h-6 ${selected === type ? 'text-white' : 'text-[#6B7280]'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-[#111827]">{title}</p>
                  {selected === type && <CheckCircle className="w-4 h-4 text-[#534AB7] shrink-0" />}
                </div>
                <p className="text-sm text-[#6B7280] mb-2">{subtitle}</p>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
                <ul className="mt-2 space-y-0.5">
                  {points.map(p => (
                    <li key={p} className="text-xs text-[#6B7280] flex items-center gap-1.5">
                      <span className="text-[#1D9E75]">✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </button>
        ))}
      </div>

      {!selected && (
        <p className="text-center text-xs text-red-500 mb-2">Veuillez sélectionner un type de compte</p>
      )}
      <button
        onClick={() => { if (selected) onSelect(selected); }}
        className={`w-full h-12 rounded-xl text-base font-semibold transition-colors ${
          selected ? 'text-white' : 'bg-[#E5E7EB] text-[#9CA3AF]'
        }`}
        style={selected ? { backgroundColor: '#FF6B35' } : {}}
      >
        Continuer <ChevronRight className="inline w-5 h-5 ml-1" />
      </button>
    </div>
  );
}
