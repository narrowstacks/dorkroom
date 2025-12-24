/**
 * Volume unit conversion utilities.
 *
 * Internal calculations use milliliters. Conversions happen at display boundaries.
 */

/**
 * Volume unit type.
 */
export type VolumeUnit = 'ml' | 'floz';

/**
 * Milliliters per fluid ounce (US).
 */
const ML_PER_FLOZ = 29.5735;

/**
 * Convert milliliters to fluid ounces.
 */
export function mlToFloz(ml: number): number {
  return ml / ML_PER_FLOZ;
}

/**
 * Convert fluid ounces to milliliters.
 */
export function flozToMl(floz: number): number {
  return floz * ML_PER_FLOZ;
}

/**
 * Convert milliliters to display value based on unit preference.
 */
export function convertMlToDisplay(ml: number, unit: VolumeUnit): number {
  if (unit === 'floz') {
    return mlToFloz(ml);
  }
  return ml;
}

/**
 * Convert display value to milliliters based on unit preference.
 */
export function convertDisplayToMl(value: number, unit: VolumeUnit): number {
  if (unit === 'floz') {
    return flozToMl(value);
  }
  return value;
}

/**
 * Get the display label for a volume unit.
 */
export function getVolumeUnitLabel(unit: VolumeUnit): string {
  return unit === 'floz' ? 'fl oz' : 'ml';
}

/**
 * Get the precision (decimal places) for a volume unit.
 * - ml: 0 decimals (whole numbers)
 * - floz: 1 decimal place
 */
export function getVolumePrecision(unit: VolumeUnit): number {
  return unit === 'floz' ? 1 : 0;
}

/**
 * Get the step size for input fields based on unit.
 */
export function getVolumeStepSize(unit: VolumeUnit): number {
  return unit === 'floz' ? 0.1 : 1;
}

/**
 * Format a volume in milliliters for display.
 *
 * @param ml - Volume in milliliters
 * @param unit - Display unit preference
 * @param options - Formatting options
 * @returns Formatted string with unit label
 */
export function formatVolume(
  ml: number,
  unit: VolumeUnit,
  options?: { precision?: number; includeUnit?: boolean }
): string {
  const precision = options?.precision ?? getVolumePrecision(unit);
  const includeUnit = options?.includeUnit ?? true;
  const displayValue = convertMlToDisplay(ml, unit);
  const formatted = displayValue.toFixed(precision);
  const unitLabel = getVolumeUnitLabel(unit);

  return includeUnit ? `${formatted} ${unitLabel}` : formatted;
}

/**
 * Get default volume in ml (common tank size).
 */
export function getDefaultVolumeMl(): number {
  // 500ml is a common starting point for most tanks
  return 500;
}
