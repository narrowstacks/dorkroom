/**
 * The nine theme-aware accent tones from plan 003 (see theme.css
 * `--accent-*` variables). Each calculator page picks one as its identity,
 * aligned with its nav category (color = category, shade = tool). The tones
 * collapse to monochrome (red/black) in the high-contrast and darkroom themes.
 */
export type AccentTone =
  | 'indigo'
  | 'blue'
  | 'violet'
  | 'teal'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'emerald'
  | 'sky';
