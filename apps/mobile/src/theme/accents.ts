/**
 * The bounded accent system: one brand color, one signature color per tool.
 *
 * Within any screen, at most TWO accents are visible — the brand color and
 * that tool's signature — and each only ever appears in its designated
 * treatment. Four treatments, four roles:
 *
 * | Role              | Color                                   | Treatment |
 * |-------------------|------------------------------------------|-----------|
 * | Brand / commit    | rose `#e11d48` (`bg-rose-600`)            | SOLID FILL — reserved exclusively for buttons that commit or create (Start roll, Add shot, Add camera…). Also inline links (`text-rose-400`) and the iOS switch on-tint. Nothing else gets a solid accent fill, ever. |
 * | Tool signature    | blue (exposure) · teal (resize) · amber (reciprocity) · green (development recipes) · yellow (meter) · rose (border & film log — flagship + hub stay on brand) | TINTED GLASS — results/charts, and selected states inside that tool (chips, segmented controls) as alpha-tint background + accent-colored label + subtle accent border. Never a solid fill, never on a commit button. |
 * | Destructive       | `text-rose-400`                           | TEXT ONLY, on a neutral/transparent surface, verb labels (Delete, Reset…). Never filled. Distinguished from commit by treatment (text vs fill), not by hue. |
 * | Warning           | amber `#f59e0b` (`tokens.color.warning`)  | Inline warning text/border only. |
 * | Neutral controls  | `bg-white/10`–`/20`, `text-white`/`70`/`50` | View toggles, sheet dismiss, secondary buttons, status metadata. Accents banned here. |
 *
 * Mirrors the web result-card accents (exposure blue, resize teal,
 * reciprocity amber, recipes green) and registers the meter's yellow and
 * border/film-log's rose as first-class hues.
 */
export const ACCENT = {
  blue: '#60a5fa', // Exposure
  teal: '#2dd4bf', // Resize
  amber: '#fbbf24', // Reciprocity
  green: '#4ade80', // Development recipes
  yellow: '#facc15', // Meter (EI lock, scrub window)
  rose: '#fb7185', // Border & film log signature = brand (rose-400 text-weight)
} as const;

export type AccentColor = keyof typeof ACCENT;

export interface SelectionTint {
  backgroundColor: string;
  borderColor: string;
  color: string;
}

/** Tinted-glass selection treatment: bg/border/text for a selected control. */
export function selectionTint(accent: AccentColor): SelectionTint {
  const hex = ACCENT[accent];
  return {
    backgroundColor: `${hex}26`,
    borderColor: `${hex}66`,
    color: hex,
  };
}
