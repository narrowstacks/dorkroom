/* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- checking for CSS.supports API availability */
// Runtime detection for CSS color-mix support
export const supportsColorMix: boolean =
  typeof CSS !== 'undefined' &&
  typeof (CSS as unknown as { supports?: (...args: unknown[]) => boolean })
    .supports === 'function' &&
  // Use a plain example to ensure broad engine parsing in supports()
  (
    CSS as unknown as { supports: (property: string, value: string) => boolean }
  ).supports('color', 'color-mix(in srgb, red 50%, white)');

/**
 * Returns a color-mix() string if supported, otherwise a reasonable fallback.
 * - baseVar: a CSS color or variable e.g. 'var(--color-semantic-info)'
 * - percentage: number 0..100 indicating the first color weight
 * - other: second color (defaults to 'transparent')
 * - fallback: color to use when color-mix isn't supported (defaults to baseVar)
 */
export function colorMixOr(
  baseVar: string,
  percentage: number,
  other = 'transparent',
  fallback?: string
): string {
  if (supportsColorMix) {
    return `color-mix(in srgb, ${baseVar} ${percentage}%, ${other})`;
  }
  return fallback ?? baseVar;
}
