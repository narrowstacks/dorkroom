import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { Theme } from '../lib/themes';
import { resolveTheme } from '../lib/themes';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark' | 'darkroom' | 'high-contrast';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'dorkroom-theme';

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<
    'light' | 'dark' | 'darkroom' | 'high-contrast'
  >('dark');

  // Initialize theme from localStorage or default to system
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (
      saved === 'light' ||
      saved === 'dark' ||
      saved === 'darkroom' ||
      saved === 'high-contrast' ||
      saved === 'system'
    ) {
      setThemeState(saved);
    } else {
      // First time visitor - default to system preference and save it
      setThemeState('system');
      localStorage.setItem(STORAGE_KEY, 'system');
    }
  }, []);

  // Update resolved theme when theme changes or system preference changes
  useEffect(() => {
    const updateResolvedTheme = () => {
      const resolved = resolveTheme(theme);
      setResolvedTheme(resolved);

      // Apply theme to document
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', resolved);
      }
    };

    updateResolvedTheme();

    // Listen for system theme changes when using 'system'
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateResolvedTheme();

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    return undefined;
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
