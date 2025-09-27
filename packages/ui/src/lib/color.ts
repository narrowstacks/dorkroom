// Runtime detection for CSS color-mix support
export const supportsColorMix: boolean =
  typeof CSS !== 'undefined' &&
  typeof (CSS as any).supports === 'function' &&
  // Use a plain example to ensure broad engine parsing in supports()
  (CSS as any).supports('color', 'color-mix(in srgb, red 50%, white)');

/**
 * Produce a `color-mix()` CSS expression when supported, otherwise return a fallback color.
 *
 * @param baseVar - A CSS color or variable reference (e.g. `'var(--color-semantic-info)'`)
 * @param percentage - Weight for `baseVar` from 0 to 100
 * @param other - The second color to mix (defaults to `'transparent'`)
 * @param fallback - Optional color to use when `color-mix()` is not supported; if omitted `baseVar` is returned
 * @returns The `color-mix(in srgb, ...)` expression when supported, otherwise the chosen fallback color
 */
export function colorMixOr(
  baseVar: string,
  percentage: number,
  other: string = 'transparent',
  fallback?: string
): string {
  if (supportsColorMix) {
    return `color-mix(in srgb, ${baseVar} ${percentage}%, ${other})`;
  }
  return fallback ?? baseVar;
}

