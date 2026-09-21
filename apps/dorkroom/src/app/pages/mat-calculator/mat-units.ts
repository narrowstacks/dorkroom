import {
  convertDisplayToInches,
  convertInchesToDisplay,
  formatMeasurement,
  type MatPreset,
  type MeasurementUnit,
  parseMatInput,
  toFraction,
  toFractionInput,
} from '@dorkroom/logic';

/**
 * Unit boundary for the mat calculator.
 *
 * Form state, persistence and every calculation stay in **inches** (see
 * `useMatCalculator`); these helpers are the only place inches become
 * centimetres and back, so switching the global measurement preference never
 * rewrites stored values.
 */

/** Stepper / arrow-key increment: 1/16" imperial, 1mm metric. */
const STEP_INCHES = 1 / 16;
const STEP_CM = 0.1;

/**
 * Decimals kept in a centimetre **input**. Two is deliberate: stored inches are
 * rounded to 3 decimals by `convertDisplayToInches`, which is at most 0.0013cm
 * of drift, so anything the user types at 2 decimals survives the round trip to
 * inches and back unchanged.
 */
const CM_INPUT_DECIMALS = 2;

/** Drop the padding `toFixed` adds, so 20.40 reads as "20.4" and 40.64 as "40.64". */
function trimDecimals(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)));
}

/**
 * Format one measurement (inches) for the results, diagram and cutter cards.
 * Imperial keeps the nearest-1/16 fraction with an inch mark; metric renders
 * millimetre-precision centimetres, matching the border calculator. Both return
 * an empty string for NaN or negative input, as `toFraction` always has.
 */
export function formatMatValue(inches: number, unit: MeasurementUnit): string {
  if (unit === 'imperial') {
    return toFraction(inches);
  }
  if (Number.isNaN(inches) || inches < 0) {
    return '';
  }
  return formatMeasurement(inches, unit);
}

/**
 * Format one measurement for the best-fit preview line. It previews what
 * `applyBestFit` will write, so it snaps to the same 1/16" grid the borders do
 * and never falls back to the invalid-input placeholder; metric then reads the
 * result at the field's own precision, so the preview and the field agree.
 */
export function formatMatPreview(
  inches: number,
  unit: MeasurementUnit
): string {
  const snapped = toFractionInput(inches);
  if (unit === 'imperial') {
    return `${snapped}″`;
  }
  return `${matValueToDisplay(snapped, unit)}cm`;
}

/**
 * Stored inch string to the text shown in a field. Imperial is a pass-through
 * so fraction entry ("2 3/4") round-trips verbatim.
 */
export function matValueToDisplay(
  value: string,
  unit: MeasurementUnit
): string {
  if (unit === 'imperial') {
    return value;
  }
  const inches = parseMatInput(value);
  if (Number.isNaN(inches)) {
    return '';
  }
  return trimDecimals(convertInchesToDisplay(inches, unit), CM_INPUT_DECIMALS);
}

/**
 * Field text back to the inch string kept in form state. Unparseable or empty
 * text commits an empty string, which reads as "invalid" downstream exactly
 * like clearing an imperial field does.
 */
export function matDisplayToValue(
  display: string,
  unit: MeasurementUnit
): string {
  if (unit === 'imperial') {
    return display;
  }
  const parsed = parseMatInput(display);
  if (Number.isNaN(parsed)) {
    return '';
  }
  return String(convertDisplayToInches(parsed, unit));
}

/**
 * Step the *displayed* value by one notch, snapped to that unit's grid and
 * clamped at zero: 1/16" in imperial, 1mm in metric.
 */
export function stepMatDisplay(
  display: string,
  unit: MeasurementUnit,
  direction: 1 | -1
): string {
  const step = unit === 'imperial' ? STEP_INCHES : STEP_CM;
  const current = parseMatInput(display);
  const base = Number.isNaN(current) ? 0 : current;
  const snapped = Math.round(base / step) * step;
  const next = Math.max(0, snapped + direction * step);
  return unit === 'imperial' ? toFractionInput(next) : trimDecimals(next, 1);
}

/** Human-readable step size for the stepper buttons' accessible names. */
export function matStepLabel(unit: MeasurementUnit): string {
  return unit === 'imperial' ? '1/16 inch' : '1 mm';
}

/**
 * Label for a board-size preset chip. The presets are standard inch boards,
 * so imperial keeps the conventional name ("16×20"); metric shows the same
 * board converted, at the precision the results use ("40.6×50.8cm").
 */
export function formatMatPresetLabel(
  preset: MatPreset,
  unit: MeasurementUnit
): string {
  if (unit === 'imperial') {
    return preset.label;
  }
  const w = trimDecimals(convertInchesToDisplay(preset.w, unit), 1);
  const h = trimDecimals(convertInchesToDisplay(preset.h, unit), 1);
  return `${w}×${h}cm`;
}
