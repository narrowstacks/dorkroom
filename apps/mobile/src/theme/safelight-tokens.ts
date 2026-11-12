import { RED_LEVEL, redOf, SAFELIGHT } from '@/theme/safelight';

/**
 * The single source of truth for the semantic colour variables: each token's
 * NORMAL value (exactly the Tailwind colour it replaced) and its SAFELIGHT value.
 *
 * Both maps below are handed to NativeWind `vars()` by `SafelightRoot`, ALWAYS
 * one or the other from the very first render: react-native-css-interop remounts
 * a component the first time a `vars()` style appears on it, which would reset
 * every screen's state the first time the mode was switched on. `global.css`
 * declares the same normal values (a test checks it matches this table) so a
 * component outside any `SafelightRoot` still resolves them.
 */
interface Token {
  normal: string;
  safelight: string;
}

const white = (alpha: number) => `rgba(255, 255, 255, ${alpha})`;

export const SAFELIGHT_TOKENS = {
  // A 1px hairline appears under the mode where a fill (or a glass) was.
  '--sl-bw': { normal: '0px', safelight: '1px' },
  '--sl-line': { normal: 'transparent', safelight: SAFELIGHT.outline },

  // Fills: gone under the mode (the hairline carries the shape).
  '--sl-surface': { normal: white(0.1), safelight: 'transparent' },
  '--sl-surface-dim': { normal: white(0.05), safelight: 'transparent' },
  '--sl-surface-inset': { normal: white(0.07), safelight: 'transparent' },
  '--sl-surface-strong': { normal: white(0.2), safelight: 'transparent' },

  // Borders that already existed.
  '--sl-edge-faint': { normal: white(0.05), safelight: SAFELIGHT.outline },
  '--sl-edge': { normal: white(0.1), safelight: SAFELIGHT.outline },
  '--sl-edge-15': { normal: white(0.15), safelight: SAFELIGHT.outline },
  '--sl-edge-strong': {
    normal: white(0.2),
    safelight: SAFELIGHT.outlineSelected,
  },
  '--sl-edge-30': { normal: white(0.3), safelight: SAFELIGHT.outlineSelected },

  // A filled selected control becomes an outline with bright text.
  '--sl-selected': { normal: '#ffffff', safelight: 'transparent' },
  '--sl-selected-ink': { normal: '#0b0b0c', safelight: SAFELIGHT.text },
  '--sl-ok': { normal: '#6ee7b7', safelight: SAFELIGHT.textSecondary },

  // The Border and Mat drawings: dim paper, black image area and window.
  '--sl-paper': { normal: '#a3a3a3', safelight: redOf(RED_LEVEL.paper) },
  '--sl-paper-ink': { normal: 'rgba(0, 0, 0, 0.7)', safelight: SAFELIGHT.text },
  '--sl-paper-print': { normal: '#404040', safelight: '#000000' },
  // The Home answer card's easel diagram: bg-white/90 paper, zinc-700 print.
  '--sl-easel-paper': {
    normal: white(0.9),
    safelight: redOf(RED_LEVEL.paper),
  },
  '--sl-easel-print': { normal: '#3f3f46', safelight: '#000000' },
  '--sl-window': { normal: '#161618', safelight: '#000000' },

  // Alpha text. Body and labels are at least secondary under the mode;
  // anything readable is at least tertiary; faint is for decoration only.
  '--sl-ink-80': { normal: white(0.8), safelight: SAFELIGHT.text },
  '--sl-ink-70': { normal: white(0.7), safelight: SAFELIGHT.textSecondary },
  '--sl-ink-60': { normal: white(0.6), safelight: SAFELIGHT.textSecondary },
  '--sl-ink-55': { normal: white(0.55), safelight: SAFELIGHT.textSecondary },
  '--sl-ink-50': { normal: white(0.5), safelight: SAFELIGHT.textSecondary },
  '--sl-ink-45': { normal: white(0.45), safelight: SAFELIGHT.textTertiary },
  '--sl-ink-40': { normal: white(0.4), safelight: SAFELIGHT.textTertiary },
  '--sl-ink-30': { normal: white(0.3), safelight: SAFELIGHT.textFaint },
} as const satisfies Record<`--sl-${string}`, Token>;

function pick(mode: keyof Token): Record<string, string> {
  return Object.fromEntries(
    Object.entries(SAFELIGHT_TOKENS).map(([name, token]) => [name, token[mode]])
  );
}

export const NORMAL_VAR_VALUES = pick('normal');
export const SAFELIGHT_VAR_VALUES = pick('safelight');

/** The variable values a window's root carries: never empty, in either mode. */
export function rootVarValues(on: boolean): Record<string, string> {
  return on ? SAFELIGHT_VAR_VALUES : NORMAL_VAR_VALUES;
}
