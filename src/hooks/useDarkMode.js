/**
 * useDarkMode — thin wrapper autour du ThemeContext global.
 * API identique à l'ancien hook : [dark, setDark]
 * Toute l'app partage le même état via le context.
 */
import { useTheme } from '@/lib/ThemeContext';

export function useDarkMode() {
  const { dark, setDark } = useTheme();
  return [dark, setDark];
}

export default useDarkMode;