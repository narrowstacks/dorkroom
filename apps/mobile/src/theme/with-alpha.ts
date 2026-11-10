import { parseColor } from '@/theme/safelight';

/**
 * A colour at an alpha, as `rgba(r, g, b, a)`. Accepts `#rgb`, `#rrggbb`,
 * `#rrggbbaa` (its own alpha is replaced), `rgb(r, g, b)` and `rgba(...)`.
 * Anything else throws: the hue hooks return `#rrggbb` normally and
 * `rgb(255, 0, 0)` under safelight, so appending hex digits to one
 * (`${hue}33`) produces an invalid colour. Use this instead.
 */
export function withAlpha(colour: string, alpha: number): string {
  const parsed = parseColor(colour);
  if (parsed === null) {
    throw new Error(`withAlpha: unsupported colour "${colour}"`);
  }
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new Error(`withAlpha: alpha ${alpha} is outside 0..1`);
  }
  const [r, g, b] = parsed;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** The alpha a two-digit hex suffix stands for (`33` is 0.2). */
export function hexAlpha(suffix: string): number {
  if (!/^[0-9a-f]{2}$/i.test(suffix)) {
    throw new Error(`hexAlpha: "${suffix}" is not two hex digits`);
  }
  return Number.parseInt(suffix, 16) / 255;
}
