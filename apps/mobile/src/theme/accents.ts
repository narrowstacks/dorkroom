/** Per-calculator accent colors, mirroring the web result-card accents. */
export const ACCENT = {
  blue: '#60a5fa',
  teal: '#2dd4bf',
  amber: '#fbbf24',
} as const;

export type AccentColor = keyof typeof ACCENT;
