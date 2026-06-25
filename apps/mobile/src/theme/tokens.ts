import type { TextStyle } from 'react-native';

/**
 * The meter readout's text style. iOS renders the system font (San Francisco)
 * when no `fontFamily` is set, so this just pins tabular figures so numeric
 * columns stay aligned. Centralized so the readout typeface is a one-token swap
 * (e.g. if we later bundle a custom mono via expo-font). Replaced the per-file
 * `Menlo` constants in the meter components.
 */
export const readoutText: TextStyle = { fontVariant: ['tabular-nums'] };

/** Shared design tokens mirrored from the web palette. */
export const tokens = {
  color: {
    background: '#0b0b0c',
    surface: 'rgba(255,255,255,0.06)',
    text: '#f5f5f4',
    textMuted: '#a1a1aa',
    accent: '#e11d48',
    warning: '#f59e0b',
  },
  space: {
    sm: 8,
    md: 16,
    lg: 24,
  },
} as const;
