import { createContext, type ReactNode, use, useEffect, useState } from 'react';
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

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<
    'light' | 'dark' | 'darkroom' | 'high-contrast'
  >('dark');
  const [animationsEnabled, setAnimationsEnabledState] = useState(true);

  // Initialize theme + animations from localStorage. Compute both values
  // first, then apply a single update per state so the effect doesn't
  // cascade multiple setState calls.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let initialTheme: Theme;
    if (
      saved === 'light' ||
      saved === 'dark' ||
      saved === 'darkroom' ||
      saved === 'high-contrast' ||
      saved === 'system'
    ) {
      initialTheme = saved;
    } else {
      // First time visitor - default to system preference and save it
      initialTheme = 'system';
      localStorage.setItem(STORAGE_KEY, 'system');
    }

    // Initialize animations preference from localStorage or default to true
    const savedAnimations = localStorage.getItem(ANIMATIONS_STORAGE_KEY);
    let initialAnimations: boolean;
    if (savedAnimations === 'true' || savedAnimations === 'false') {
      initialAnimations = savedAnimations === 'true';
    } else {
      initialAnimations = true;
      localStorage.setItem(ANIMATIONS_STORAGE_KEY, 'true');
    }

    setThemeState(initialTheme);
    setAnimationsEnabledState(initialAnimations);
  }, []);

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

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  };

  const setAnimationsEnabled = (enabled: boolean) => {
    setAnimationsEnabledState(enabled);
    localStorage.setItem(ANIMATIONS_STORAGE_KEY, String(enabled));
  };

  return (
    <ThemeContext
      value={{
        theme,
        resolvedTheme,
        setTheme,
        animationsEnabled,
        setAnimationsEnabled,
      }}
    >
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const context = use(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
