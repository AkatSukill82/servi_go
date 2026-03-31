import { useState, useCallback } from 'react';

const STORAGE_KEY = 'sg_dark';

function applyTheme(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
    localStorage.setItem(STORAGE_KEY, '1');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem(STORAGE_KEY, '0');
  }
}

/**
 * Hook unifié de gestion du thème.
 * - Initialise depuis le DOM (déjà appliqué par le script head) → pas de flash, pas de désync.
 * - Chaque appel partage le même état DOM (classList) — pas de contexte global nécessaire.
 * - Compatible avec l'ancien useDarkMode [dark, setDark].
 */
export function useDarkMode() {
  // Initialiser depuis le DOM, pas depuis localStorage, pour être en sync avec le script head
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );

  const setDark = useCallback((value) => {
    setIsDark(value);
    applyTheme(value);
  }, []);

  return [isDark, setDark];
}

export default useDarkMode;