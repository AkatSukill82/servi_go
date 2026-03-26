import { useState, useEffect, useCallback } from 'react';
import { translations, detectLanguage, SUPPORTED_LANGS } from '@/lib/i18n';

const LANG_EVENT = 'servigo_lang_change';

export function useI18n() {
  const [lang, setLangState] = useState(detectLanguage);

  const setLang = useCallback((l) => {
    if (!SUPPORTED_LANGS.includes(l)) return;
    localStorage.setItem('servigo_lang', l);
    setLangState(l);
    window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: l }));
  }, []);

  useEffect(() => {
    const handler = (e) => setLangState(e.detail);
    window.addEventListener(LANG_EVENT, handler);
    return () => window.removeEventListener(LANG_EVENT, handler);
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key] ?? translations['fr']?.[key] ?? key;
  }, [lang]);

  return { lang, setLang, t, SUPPORTED_LANGS };
}