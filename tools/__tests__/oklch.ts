/**
 * CSS `oklch()` to sRGB hex, for the accent parity test. The OG cards render
 * through Satori, which takes hex colours, so `utils/routeMetadata.ts` keeps
 * hex copies of the theme's oklch accents; this converts the theme values to
 * compare. Out-of-gamut channels are clamped, as browsers do for display.
 */

/** sRGB transfer function on a linear channel, clamped to [0, 1]. */
function encode(linear: number): number {
  const c = Math.min(1, Math.max(0, linear));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** Linear sRGB channel from an 8-bit value. */
function decode(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** `oklch(L% C H)` lightness (percent), chroma and hue (degrees) to `#rrggbb`. */
export function oklchToHex(
  lightnessPercent: number,
  chroma: number,
  hueDegrees: number
): string {
  const l = lightnessPercent / 100;
  const h = (hueDegrees * Math.PI) / 180;
  const a = chroma * Math.cos(h);
  const b = chroma * Math.sin(h);

  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const r = 4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1;
  const g = -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1;
  const bl = -0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1;

  return `#${[r, g, bl]
    .map((c) =>
      Math.round(encode(c) * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

/** WCAG relative luminance of `#rrggbb`. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) =>
    decode(Number.parseInt(hex.slice(i, i + 2), 16))
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two `#rrggbb` colours. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x
  );
  return (hi + 0.05) / (lo + 0.05);
}
