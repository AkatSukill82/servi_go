import React, { createContext, useContext } from 'react';

const ThemeContext = createContext({ dark: false, setDark: () => {}, toggleDark: () => {} });

export function ThemeProvider({ children }) {
  return (
    <ThemeContext.Provider value={{ dark: false, setDark: () => {}, toggleDark: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
