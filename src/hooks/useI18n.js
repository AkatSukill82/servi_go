import { useState, useEffect, useCallback } from 'react';
import { translations, detectLanguage, SUPPORTED_LANGS } from '@/lib/i18n';

const LANG_EVENT = 'servigo_lang_change';

export function useI18n() {
  const [lang, setLangState] = useState(detectLanguage);

  // Écoute les changements de langue déclenchés depuis n'importe quel composant
  useEffect(() => {
    const handler = (e) => setLangState(e.detail);
    window.addEventListener(LANG_EVENT, handler);
    return () => window.removeEventListener(LANG_EVENT, handler);
  }, []);

  const setLang = useCallback((l) => {
    if (!SUPPORTED_LANGS.includes(l)) return;
    localStorage.setItem('servigo_lang', l);
    setLangState(l);
    // Notifie tous les autres composants
    window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: l }));
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key] ?? translations['fr']?.[key] ?? key;
  }, [lang]);

  return { lang, setLang, t, SUPPORTED_LANGS };
}