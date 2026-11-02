import { createContext, use } from 'react';
import type { Theme } from '../lib/themes';

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark' | 'darkroom' | 'high-contrast';
  setTheme: (theme: Theme) => void;
  /** True on an e-ink device, where the theme is fixed to high contrast and
   *  there is nothing to choose. */
  themeLocked: boolean;
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
);

export function useTheme() {
  const context = use(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
