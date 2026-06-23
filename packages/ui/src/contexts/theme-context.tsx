import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Theme } from '../lib/themes';
import { resolveTheme } from '../lib/themes';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark' | 'darkroom' | 'high-contrast';
  setTheme: (theme: Theme) => void;
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'dorkroom-theme';
const ANIMATIONS_STORAGE_KEY = 'dorkroom-animations-enabled';

// Read the persisted theme on first render. On the server (no localStorage) or
// for a first-time visitor, default to 'system' and persist that default.
function getInitialTheme(): Theme {
  if (typeof localStorage === 'undefined') {
    return 'system';
  }
  const saved = localStorage.getItem(STORAGE_KEY);
  if (
    saved === 'light' ||
    saved === 'dark' ||
    saved === 'darkroom' ||
    saved === 'high-contrast' ||
    saved === 'system'
  ) {
    return saved;
  }
  // First time visitor - default to system preference and save it
  localStorage.setItem(STORAGE_KEY, 'system');
  return 'system';
}

// Read the persisted animations preference on first render, defaulting to true.
function getInitialAnimationsEnabled(): boolean {
  if (typeof localStorage === 'undefined') {
    return true;
  }
  const savedAnimations = localStorage.getItem(ANIMATIONS_STORAGE_KEY);
  if (savedAnimations === 'true' || savedAnimations === 'false') {
    return savedAnimations === 'true';
  }
  localStorage.setItem(ANIMATIONS_STORAGE_KEY, 'true');
  return true;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<
    'light' | 'dark' | 'darkroom' | 'high-contrast'
  >('dark');
  const [animationsEnabled, setAnimationsEnabledState] = useState(
    getInitialAnimationsEnabled
  );

  // Update resolved theme when theme changes or system preference changes
  useEffect(() => {
    const updateResolvedTheme = () => {
      const resolved = resolveTheme(theme);
      setResolvedTheme(resolved);

      // Apply theme to document
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', resolved);
        // Always disable animations for darkroom and high-contrast themes
        const shouldDisableAnimations =
          resolved === 'darkroom' ||
          resolved === 'high-contrast' ||
          !animationsEnabled;
        document.documentElement.setAttribute(
          'data-animations-disabled',
          shouldDisableAnimations ? 'true' : 'false'
        );

        // Sync iOS Safari's browser-chrome color (status bar + toolbar
        // background-extension bands) to the active theme's background. The
        // static meta in index.html is near-black (#09090b); without this it
        // shows as a black band in light/high-contrast themes — most visibly
        // at the top and behind the bottom toolbar while the mobile menu is
        // open (the page is dimmed, so the chrome bands stand out).
        const themeColorMeta = document.querySelector<HTMLMetaElement>(
          'meta[name="theme-color"]'
        );
        if (themeColorMeta) {
          const background = getComputedStyle(document.documentElement)
            .getPropertyValue('--color-background')
            .trim();
          if (background) {
            themeColorMeta.setAttribute('content', background);
          }
        }
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
  }, [theme, animationsEnabled]);

  const contextValue = useMemo<ThemeContextValue>(() => {
    const setTheme = (newTheme: Theme) => {
      setThemeState(newTheme);
      localStorage.setItem(STORAGE_KEY, newTheme);
    };

    const setAnimationsEnabled = (enabled: boolean) => {
      setAnimationsEnabledState(enabled);
      localStorage.setItem(ANIMATIONS_STORAGE_KEY, String(enabled));
    };

    return {
      theme,
      resolvedTheme,
      setTheme,
      animationsEnabled,
      setAnimationsEnabled,
    };
  }, [theme, resolvedTheme, animationsEnabled]);

  return <ThemeContext value={contextValue}>{children}</ThemeContext>;
}

export function useTheme() {
  const context = use(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
