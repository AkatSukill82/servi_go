import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'sg_dark';

function applyTheme(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem(STORAGE_KEY, '1');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem(STORAGE_KEY, '0');
  }
  // Update theme-color meta tag
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#0B0F14' : '#FFFFFF');
}

const ThemeContext = createContext({ dark: false, setDark: () => {}, toggleDark: () => {} });

export function ThemeProvider({ children }) {
  const [dark, setDarkState] = useState(
    () => document.documentElement.classList.contains('dark')
  );

  const setDark = useCallback((value) => {
    setDarkState(value);
    applyTheme(value);
  }, []);

  const toggleDark = useCallback(() => {
    setDarkState(prev => {
      applyTheme(!prev);
      return !prev;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ dark, setDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}