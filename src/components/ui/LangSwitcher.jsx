import React from 'react';
import { useI18n } from '@/hooks/useI18n';

const LABELS = { fr: '🇫🇷 FR', nl: '🇧🇪 NL', de: '🇩🇪 DE' };

export default function LangSwitcher({ className = '' }) {
  const { lang, setLang, SUPPORTED_LANGS } = useI18n();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {SUPPORTED_LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
            lang === l
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );

}