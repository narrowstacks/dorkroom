/**
 * Safelight mode palette.
 *
 * A full-window multiply overlay (`SafelightOverlay`) keeps only the RED channel
 * of every pixel on screen, so a colour's brightness under the mode is its red
 * value alone. Every colour here is therefore a pure red `rgb(R, 0, 0)`, chosen
 * by R. The overlay is the guarantee (no green or blue ever leaves the app's own
 * pixels); this palette is for legibility and for keeping the light low.
 *
 * This mode has not been tested as safe for photographic paper, and red light is
 * not safe for film or colour paper. Never describe it as "paper safe".
 */

/** The overlay colour: multiplying by it zeroes green and blue. */
export const SAFELIGHT_OVERLAY = '#ff0000';

/** Red-channel levels (0 to 255) for each role. */
export const RED_LEVEL = {
  /** Primary text, icons, selected outlines' text. */
  primary: 255,
  /** Secondary text. Bright enough for 4.5:1 on black by red luminance. */
  secondary: 236,
  /** Tertiary text and hints: legible but dim. Not for essential text. */
  tertiary: 190,
  /** Disabled or decorative marks. */
  faint: 150,
  /** A selected control's outline. */
  outlineSelected: 200,
  /** A resting control's hairline. */
  outline: 120,
  /** The dim fill of a commit button. */
  commitFill: 80,
  /** The paper in the Border and Mat drawings. */
  paper: 70,
  /** A very faint fill (rows that must still read as a surface). */
  wash: 28,
} as const;

export type RedLevel = keyof typeof RED_LEVEL;

/** A pure red from its red-channel value, clamped to 0..255. */
export function redOf(level: number): string {
  const r = Math.max(0, Math.min(255, Math.round(level)));
  return `rgb(${r}, 0, 0)`;
}

/** What `colour` looks like after the multiply overlay: only R survives. */
export function redOnly(rgb: readonly [number, number, number]): number {
  return rgb[0];
}

/** Parses `#rgb`, `#rrggbb`, `rgb(...)` or `rgba(...)` to [r, g, b, a]. */
export function parseColor(
  colour: string
): [number, number, number, number] | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(colour.trim());
  if (hex) {
    let h = hex[1] ?? '';
    if (h.length === 3) h = [...h].map((c) => c + c).join('');
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      a,
    ];
  }
  const fn =
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(
      colour.trim()
    );
  if (fn) {
    return [Number(fn[1]), Number(fn[2]), Number(fn[3]), Number(fn[4] ?? 1)];
  }
  return null;
}

/** sRGB channel (0..255) to linear light. */
function linear(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/**
 * Relative luminance of a red level after the overlay: only the red channel's
 * contribution (0.2126) remains.
 */
export function redLuminance(level: number): number {
  return 0.2126 * linear(level);
}

/** WCAG contrast of a red level against true black, by red luminance only. */
export function contrastOnBlack(level: number): number {
  return (redLuminance(level) + 0.05) / 0.05;
}

/** The safelight colours the app resolves to, as plain strings. */
export const SAFELIGHT = {
  /** Text and icons by role. */
  text: redOf(RED_LEVEL.primary),
  textSecondary: redOf(RED_LEVEL.secondary),
  textTertiary: redOf(RED_LEVEL.tertiary),
  textFaint: redOf(RED_LEVEL.faint),
  outline: redOf(RED_LEVEL.outline),
  outlineSelected: redOf(RED_LEVEL.outlineSelected),
  commitFill: redOf(RED_LEVEL.commitFill),
  wash: redOf(RED_LEVEL.wash),
  background: '#000000',
} as const;

/** The single hue every phase resolves to under the mode. */
export const SAFELIGHT_HUE = SAFELIGHT.text;
