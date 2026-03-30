import React from 'react';

const STEPS = [
  { key: 'searching', label: 'Recherche' },
  { key: 'pending_pro', label: 'Attente' },
  { key: 'accepted', label: 'Accepté' },
  { key: 'contract_pending', label: 'Contrat' },
  { key: 'contract_signed', label: 'Signé' },
  { key: 'pro_en_route', label: 'En route' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'completed', label: 'Terminé' },
];

const STEP_INDEX = Object.fromEntries(STEPS.map((s, i) => [s.key, i]));

export default function MissionProgress({ status, compact = false }) {
  const currentStep = STEP_INDEX[status] ?? 0;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className={`w-2 h-2 rounded-full transition-colors ${i <= currentStep ? 'bg-primary' : 'bg-border'}`} />
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < currentStep ? 'bg-primary' : 'bg-border'}`} />}
          </React.Fragment>
        ))}
        <span className="text-[10px] text-primary font-semibold ml-2 shrink-0">{STEPS[currentStep]?.label}</span>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex items-start min-w-max px-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all ${
                i < currentStep ? 'bg-primary border-primary text-white' :
                i === currentStep ? 'bg-primary border-primary text-white ring-2 ring-primary/30' :
                'bg-background border-border text-muted-foreground'
              }`}>
                {i < currentStep ? '✓' : i + 1}
              </div>
              <span className={`text-[9px] font-medium whitespace-nowrap ${i <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-5 mt-3 mx-0.5 ${i < currentStep ? 'bg-primary' : 'bg-border'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}