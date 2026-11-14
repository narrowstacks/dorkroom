import type { Phase } from '@/lib/tools';

/**
 * The bounded accent system: one brand color, one hue per phase.
 *
 * Within any screen, at most TWO accents are visible: the brand color and the
 * hue of the phase the screen lives in (Shoot yellow, Develop teal, Print
 * rose). Each only ever appears in its designated treatment. Five roles:
 *
 * | Role              | Color                                   | Treatment |
 * |-------------------|------------------------------------------|-----------|
 * | Commit            | the phase hue, dark ink (`commitColors`); brand rose `#e11d48` with white ink outside a phase | SOLID FILL, reserved exclusively for buttons that commit or create (Start roll, Add frame, Start). Nothing else gets a solid accent fill, ever. Brand rose is also the inline link colour (`text-rose-400`) on Home. |
 * | Phase hue         | yellow (Shoot) · teal (Develop) · rose (Print) | TINTED GLASS: results/charts, and selected states inside that phase's tools (chips, segmented controls) as alpha-tint background + accent-colored label + subtle accent border. Controls read the hue from the surrounding `PhaseProvider` unless given one; with none (Home, Settings) the selected state is a neutral white tint. Also the switch on-tint and slider tracks. |
 * | Destructive       | `text-rose-400`                           | TEXT ONLY, on a neutral/transparent surface, verb labels (Delete, Remove). Never filled. Distinguished from commit by treatment (text vs fill), not by hue. |
 * | Warning           | amber `#f59e0b` (`tokens.color.warning`)  | Inline warning text/border only. Calculator warnings lead with a `⚠` glyph, so they stay distinct from Shoot's yellow by shape as well as hue. |
 * | Neutral controls  | `bg-white/10`-`/20`, `text-white`/`70`/`50` | View toggles, sheet dismiss, secondary buttons, status metadata. Accents banned here. |
 *
 * Rose doubles as the brand color and Print's hue; the treatments keep the two
 * apart (a Print result is tinted text, a commit button is a solid fill).
 */
export const ACCENT = {
  yellow: '#facc15', // Shoot
  teal: '#2dd4bf', // Develop
  rose: '#fb7185', // Print (rose-400 text weight)
} as const;

export type AccentColor = keyof typeof ACCENT;

/** The one hue each phase's tools, hub and backdrop glow use. */
export const PHASE_ACCENT = {
  shoot: 'yellow',
  develop: 'teal',
  print: 'rose',
} as const satisfies Record<Phase, AccentColor>;

/**
 * A pair of colors that encode a direction in data (a pushed vs pulled recipe,
 * a hot vs cold developer), the same two hues as the web recipe table. They
 * carry meaning rather than a phase, so they sit outside the accent system.
 */
export const DIRECTION_COLOR = {
  up: '#fbbf24',
  down: '#60a5fa',
} as const;

export interface SelectionTint {
  backgroundColor: string;
  borderColor: string;
  color: string;
  /** The unselected row in a pick-one list: a faint fill, or under safelight
   * mode a transparent one with a hairline. */
  idle: { backgroundColor: string; borderColor: string };
}

const IDLE_ROW = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderColor: 'transparent',
};

/** Selected state outside any phase (Home, Settings): a white tint, no hue. */
const NEUTRAL_TINT: SelectionTint = {
  backgroundColor: 'rgba(255,255,255,0.2)',
  borderColor: 'rgba(255,255,255,0.4)',
  color: '#ffffff',
  idle: IDLE_ROW,
};

/**
 * Tinted-glass selection treatment: bg/border/text for a selected control.
 * `null` (no phase) is the neutral white tint.
 */
export function selectionTint(accent: AccentColor | null): SelectionTint {
  if (accent === null) return NEUTRAL_TINT;
  const hex = ACCENT[accent];
  return {
    backgroundColor: `${hex}26`,
    borderColor: `${hex}66`,
    color: hex,
    idle: IDLE_ROW,
  };
}

export interface CommitColors {
  /** Solid fill of a button that commits or creates. */
  fill: string;
  /** Label and icon on that fill. */
  ink: string;
}

/** The brand rose, `bg-rose-600`: commit fills outside a phase. */
const BRAND_COMMIT = '#e11d48';

/** Near-black ink: the phase hues are light, and white on them fails 4.5:1. */
const DARK_INK = '#0b0b0c';

/**
 * The solid fill for a commit button. In a phase it is that phase's hue with
 * dark ink; outside one (Home, Settings) it is the brand rose with white ink.
 */
export function commitColors(accent: AccentColor | null): CommitColors {
  if (accent === null) return { fill: BRAND_COMMIT, ink: '#ffffff' };
  return { fill: ACCENT[accent], ink: DARK_INK };
}
