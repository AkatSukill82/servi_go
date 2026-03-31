import { useState, useEffect } from 'react';

function applyDark(isDark) {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    localStorage.setItem('servigo_dark_mode', 'true');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    localStorage.setItem('servigo_dark_mode', 'false');
  }
}

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('servigo_dark_mode');
    if (saved !== null) return saved === 'true';
    // fallback to old key
    const oldSaved = localStorage.getItem('servigo-theme');
    if (oldSaved) return oldSaved === 'dark';
    return false;
  });

  useEffect(() => {
    applyDark(dark);
  }, [dark]);

  return [dark, setDark];
}

// Call this once at app startup to apply saved preference before React mounts
export function initDarkMode() {
  const saved = localStorage.getItem('servigo_dark_mode');
  const oldSaved = localStorage.getItem('servigo-theme');
  const isDark = saved === 'true' || (saved === null && oldSaved === 'dark');
  applyDark(isDark);
}