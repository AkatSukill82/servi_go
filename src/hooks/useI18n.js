import { useCallback } from 'react';
import { translations } from '@/lib/i18n';

export function useI18n() {
  const lang = 'fr';

  const t = useCallback((key) => {
    return translations['fr']?.[key] ?? key;
  }, []);

  return { lang, t, setLang: () => {}, SUPPORTED_LANGS: ['fr'] };
}