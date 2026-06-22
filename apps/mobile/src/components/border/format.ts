import type { BorderCalculation } from '@dorkroom/logic';

/** Format an inch measurement, trimming trailing zeros: 0.5 -> '0.5"'. */
export function formatInches(value: number, precision = 2): string {
  const rounded = Number(value.toFixed(precision));
  return `${rounded}"`;
}

/** Caption under the preview: '7" × 9" image on 8×10'. */
export function formatPreviewCaption(
  c: Pick<BorderCalculation, 'printWidth' | 'printHeight'>,
  paperLabel: string
): string {
  return `${formatInches(c.printWidth)} × ${formatInches(c.printHeight)} image on ${paperLabel}`;
}

/** Summary value for the Position & Offsets row. */
export function formatPosition(
  enableOffset: boolean,
  horizontalOffset: number,
  verticalOffset: number
): string {
  if (!enableOffset) return 'Centered';
  return `H: ${horizontalOffset.toFixed(1)}  V: ${verticalOffset.toFixed(1)}`;
}
