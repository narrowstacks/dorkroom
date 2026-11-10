import type { TextStyle } from 'react-native';

/**
 * The readout text style, shared by the meter readout and the answer-first
 * calculator readouts. `ui-rounded` is the system rounded face (SF Rounded on
 * iOS), and tabular figures keep numeric columns and a live-updating value from
 * shifting width. Centralized so the readout typeface is a one-token swap. It
 * replaced the per-file `Menlo` constants in the meter components.
 */
export const readoutText: TextStyle = {
  fontFamily: 'ui-rounded',
  fontVariant: ['tabular-nums'],
};

/** Shared design tokens mirrored from the web palette. */
export const tokens = {
  color: {
    background: '#0b0b0c',
    surface: 'rgba(255,255,255,0.06)',
    text: '#f5f5f4',
    textMuted: '#a1a1aa',
    // Brand/commit accent only (solid-fill CTAs). Per-phase hues
    // and the selection-tint treatment live in `theme/accents.ts` — that
    // file is the source of truth for the accent system.
    accent: '#e11d48',
    warning: '#f59e0b',
  },
  space: {
    sm: 8,
    md: 16,
    lg: 24,
  },
} as const;
