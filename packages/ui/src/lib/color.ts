import { hasGlobal } from './dom';

function detectColorMix(): boolean {
  const css = hasGlobal('CSS') ? CSS : undefined;
  if (css === undefined || !('supports' in css)) {
    return false;
  }
  // A plain example ensures broad engine parsing in supports()
  return css.supports('color', 'color-mix(in srgb, red 50%, white)');
}

// Runtime detection for CSS color-mix support
export const supportsColorMix: boolean = detectColorMix();

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
