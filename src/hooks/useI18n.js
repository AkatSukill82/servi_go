import { useState, useEffect, useCallback } from 'react';
import { translations, detectLanguage, SUPPORTED_LANGS } from '@/lib/i18n';

export function useI18n() {
  const [lang, setLangState] = useState(detectLanguage);

  const setLang = useCallback((l) => {
    if (!SUPPORTED_LANGS.includes(l)) return;
    localStorage.setItem('servigo_lang', l);
    setLangState(l);
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key] ?? translations['fr']?.[key] ?? key;
  }, [lang]);

  return { lang, setLang, t, SUPPORTED_LANGS };
}