/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Semantic surface and text tokens. Each resolves through a CSS variable
      // that `global.css` defines for the normal look and `SafelightRoot`
      // overrides under safelight mode (see src/theme/safelight-vars.ts).
      colors: {
        line: 'var(--sl-line)',
        surface: 'var(--sl-surface)',
        'surface-dim': 'var(--sl-surface-dim)',
        'surface-inset': 'var(--sl-surface-inset)',
        'surface-strong': 'var(--sl-surface-strong)',
        'edge-faint': 'var(--sl-edge-faint)',
        edge: 'var(--sl-edge)',
        'edge-15': 'var(--sl-edge-15)',
        'edge-strong': 'var(--sl-edge-strong)',
        'edge-30': 'var(--sl-edge-30)',
        selected: 'var(--sl-selected)',
        'selected-ink': 'var(--sl-selected-ink)',
        ok: 'var(--sl-ok)',
        paper: 'var(--sl-paper)',
        'paper-ink': 'var(--sl-paper-ink)',
        'paper-print': 'var(--sl-paper-print)',
        'easel-paper': 'var(--sl-easel-paper)',
        'easel-print': 'var(--sl-easel-print)',
        window: 'var(--sl-window)',
        'ink-80': 'var(--sl-ink-80)',
        'ink-70': 'var(--sl-ink-70)',
        'ink-60': 'var(--sl-ink-60)',
        'ink-55': 'var(--sl-ink-55)',
        'ink-50': 'var(--sl-ink-50)',
        'ink-45': 'var(--sl-ink-45)',
        'ink-40': 'var(--sl-ink-40)',
        'ink-30': 'var(--sl-ink-30)',
      },
      borderWidth: {
        hw: 'var(--sl-bw)',
      },
    },
  },
  plugins: [],
};
