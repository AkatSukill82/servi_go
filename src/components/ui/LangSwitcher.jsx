import React from 'react';
import { useI18n } from '@/hooks/useI18n';

const LABELS = { fr: '🇫🇷 FR', nl: '🇧🇪 NL', de: '🇩🇪 DE' };

export default function LangSwitcher({ className = '' }) {
  const { lang, setLang, SUPPORTED_LANGS } = useI18n();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {SUPPORTED_LANGS.map((l) => null











      )}
    </div>);

}