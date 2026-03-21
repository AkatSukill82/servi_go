import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('servigo-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('servigo-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('servigo-theme', 'light');
    }
  }, [dark]);

  return [dark, setDark];
}