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

/** The caption as VoiceOver should read it: "by", not the multiplication sign. */
export function formatSpokenCaption(
  c: Pick<BorderCalculation, 'printWidth' | 'printHeight'>,
  paperLabel: string,
  unit: MeasurementUnit
): string {
  return formatPreviewCaption(c, paperLabel, unit).replace(/\s*×\s*/g, ' by ');
}

/** The four borders on the paper, as spoken and as the panel's summary reads them. */
export function formatBorders(
  c: Pick<
    BorderCalculation,
    'leftBorder' | 'rightBorder' | 'topBorder' | 'bottomBorder'
  >,
  unit: MeasurementUnit
): string {
  return `Borders left ${formatLength(c.leftBorder, unit)}, right ${formatLength(c.rightBorder, unit)}, top ${formatLength(c.topBorder, unit)}, bottom ${formatLength(c.bottomBorder, unit)}`;
}

/** The blade readings, as text: the panel's copy of what the drawing labels. */
export function formatBladeReadings(
  c: Pick<
    BorderCalculation,
    | 'leftBladeReading'
    | 'rightBladeReading'
    | 'topBladeReading'
    | 'bottomBladeReading'
  >,
  unit: MeasurementUnit
): string {
  return `Blades left ${formatLength(c.leftBladeReading, unit)}, right ${formatLength(c.rightBladeReading, unit)}, top ${formatLength(c.topBladeReading, unit)}, bottom ${formatLength(c.bottomBladeReading, unit)}`;
}
