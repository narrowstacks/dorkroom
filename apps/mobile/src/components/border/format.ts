import {
  type BorderCalculation,
  convertInchesToDisplay,
  getDisplayUnitSymbol,
  getPrecisionForUnit,
  type MeasurementUnit,
} from '@dorkroom/logic';

/**
 * Format a length stored in inches in the user's unit, trimming trailing
 * zeros: 0.5 -> '0.5"' (imperial) or '1.3cm' (metric). Precision defaults to
 * the unit's own (2 decimals of an inch, 1 of a cm, i.e. mm).
 */
export function formatLength(
  inches: number,
  unit: MeasurementUnit,
  precision = getPrecisionForUnit(unit)
): string {
  const rounded = Number(
    convertInchesToDisplay(inches, unit).toFixed(precision)
  );
  // `|| 0` folds -0 (a tiny negative rounded away) into a plain 0.
  return `${rounded || 0}${getDisplayUnitSymbol(unit)}`;
}

/** Caption under the preview: '7" × 9" image on 8×10'. */
export function formatPreviewCaption(
  c: Pick<BorderCalculation, 'printWidth' | 'printHeight'>,
  paperLabel: string,
  unit: MeasurementUnit
): string {
  return `${formatLength(c.printWidth, unit)} × ${formatLength(c.printHeight, unit)} image on ${paperLabel}`;
}

/** Summary value for the Position & Offsets row. */
export function formatPosition(
  enableOffset: boolean,
  horizontalOffset: number,
  verticalOffset: number,
  unit: MeasurementUnit
): string {
  if (!enableOffset) return 'Centered';
  return `H: ${formatLength(horizontalOffset, unit, 1)}  V: ${formatLength(verticalOffset, unit, 1)}`;
}
