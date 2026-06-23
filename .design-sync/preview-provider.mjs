// design-sync preview provider — wraps every preview card in the full
// @dorkroom/ui context-provider chain AND forces the brand DARK theme.
//
// Why seed the theme: ThemeProvider reads `localStorage['dorkroom-theme']` on
// init and otherwise resolves 'system', which in headless Chromium reports
// light. Dorkroom is dark-first (the app's `@theme` defaults are the
// near-black/neon-green look), so we seed 'dark' BEFORE the provider mounts
// and set the attribute for the very first paint.
//
// Wired via cfg.provider.component = "DesignSyncPreviewRoot" + cfg.extraEntries
// (this file). extraEntries are merged into the SAME esbuild graph as the
// package, so this ThemeProvider shares the components' React context.
//
// Plain JS + React.createElement (no JSX) so no tsconfig/jsx-runtime config is
// needed for a file outside the package's tsconfig scope.
import * as React from 'react';
import {
  MeasurementProvider,
  TemperatureProvider,
  ThemeProvider,
  ToastProvider,
  VolumeProvider,
} from '@dorkroom/ui';

if (typeof localStorage !== 'undefined') {
  localStorage.setItem('dorkroom-theme', 'dark');
}

// Paint the brand-dark canvas. The preview template hardcodes
// `body{background:#fff}` (an unlayered <style> rule); base.css's dark
// `background: var(--color-background)` lives in `@layer base` and loses to
// it. Setting the body's *element* inline style beats the template rule, so
// dark-theme components (light text/elements) render on their intended dark
// page instead of light-on-white.
function paintDarkCanvas() {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', 'dark');
  const apply = () => {
    if (!document.body) return;
    document.body.style.background = 'var(--color-background, #09090b)';
    document.body.style.color = 'var(--color-text-primary, #ffffff)';
  };
  if (document.body) apply();
  else if (typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', apply);
  }
}
paintDarkCanvas();

export function DesignSyncPreviewRoot({ children }) {
  return React.createElement(
    ThemeProvider,
    null,
    React.createElement(
      MeasurementProvider,
      null,
      React.createElement(
        TemperatureProvider,
        null,
        React.createElement(
          VolumeProvider,
          null,
          React.createElement(ToastProvider, null, children)
        )
      )
    )
  );
}
