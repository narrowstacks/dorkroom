/**
 * The one temperature module. Every °C/°F conversion, rounding, and
 * display string in the web and iOS apps goes through here, with the one
 * exception noted below.
 *
 * Rounding rule: conversions are exact. A converted value is rounded to the
 * nearest 0.1° only where it leaves the module, either as a stored field
 * (`roundTemperature`) or as display text (`formatTemperature`). There is no
 * whole-degree rounding anywhere, because a whole-°F intermediate turns 24 °C
 * into 75 °F and then back into 23.9 °C.
 *
 * Documented exception: the `@dorkroom/api` client (`transformCombination`
 * in `packages/api/src/dorkroom/client.ts`) derives `temperatureF` with its
 * own inline copy of the 0.1° rule, because api cannot import this module
 * (logic depends on api, so the reverse would be circular). The drift guard
 * in `__tests__/utils/temperature.test.ts` fails if the two disagree.
 */

/** Temperature unit selected for display. */
export type TemperatureUnit = 'fahrenheit' | 'celsius';

/** A temperature formatted for display, plus how it compares to standard. */
export interface FormattedTemperature {
  text: string;
  isNonStandard: boolean;
  isHigher: boolean;
}

/** Options for {@link formatTemperature}. */
export interface FormatTemperatureOptions {
  /** Render whole values without a decimal (`68°F` instead of `68.0°F`). */
  trimTrailingZero?: boolean;
}

/** Standard B&W development temperature: 68 °F, which is exactly 20 °C. */
export const STANDARD_TEMP_F = 68;
export const STANDARD_TEMP_C = 20;

/**
 * How far from 68 °F a temperature may be and still count as standard
 * (0.1 °F, about 0.06 °C).
 */
export const STANDARD_TEMP_TOLERANCE_F = 0.1;

/** Placeholder shown when there is no usable temperature. */
const EMPTY_TEMPERATURE = '—';

/** Convert °C to °F exactly (no rounding). */
export function toFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

/** Convert °F to °C exactly (no rounding). */
export function toCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

/** Round a temperature to the nearest 0.1°, the app's single rounding rule. */
export function roundTemperature(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Whether a Fahrenheit temperature differs from the 68 °F standard by more
 * than {@link STANDARD_TEMP_TOLERANCE_F}. Non-finite input is never
 * non-standard.
 */
export function isNonStandardTemperature(temperatureF: number): boolean {
  return (
    Number.isFinite(temperatureF) &&
    Math.abs(temperatureF - STANDARD_TEMP_F) > STANDARD_TEMP_TOLERANCE_F
  );
}

/** Whether a Fahrenheit temperature is above the 68 °F standard. */
export function isHigherTemperature(temperatureF: number): boolean {
  return temperatureF > STANDARD_TEMP_F;
}

/**
 * Format a temperature that is already in `unit`, rounded to 0.1°.
 *
 * @example
 * formatTemperature(20, 'celsius'); // "20.0°C"
 * formatTemperature(75.2, 'fahrenheit', { trimTrailingZero: true }); // "75.2°F"
 * formatTemperature(68, 'fahrenheit', { trimTrailingZero: true }); // "68°F"
 * formatTemperature(null, 'celsius'); // "—"
 */
export function formatTemperature(
  value: number | null | undefined,
  unit: TemperatureUnit,
  options: FormatTemperatureOptions = {}
): string {
  if (value == null || !Number.isFinite(value)) return EMPTY_TEMPERATURE;
  // `+ 0` turns a rounded -0 into 0 so it never renders as "-0".
  const rounded = roundTemperature(value) + 0;
  const text =
    options.trimTrailingZero && Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(1);
  return `${text}°${unit === 'celsius' ? 'C' : 'F'}`;
}

/**
 * Format a temperature for display in the requested unit, deriving the
 * missing scale when only one of `temperatureF` / `temperatureC` is known.
 * `isNonStandard` and `isHigher` compare against 68 °F (for color coding and
 * the non-standard temperature alert).
 *
 * @returns `text` is e.g. `"68.0°F"` or `"20.0°C"`, or `"—"` when neither
 *   value is usable (in which case both flags are false)
 */
export function formatTemperatureWithUnit(
  temperatureF: number | null,
  temperatureC: number | null,
  unit: TemperatureUnit
): FormattedTemperature {
  let fahrenheit =
    temperatureF !== null && Number.isFinite(temperatureF)
      ? temperatureF
      : null;
  let celsius =
    temperatureC !== null && Number.isFinite(temperatureC)
      ? temperatureC
      : null;

  if (fahrenheit === null && celsius !== null) {
    fahrenheit = toFahrenheit(celsius);
  }
  if (celsius === null && fahrenheit !== null) {
    celsius = toCelsius(fahrenheit);
  }

  if (fahrenheit === null) {
    return { text: EMPTY_TEMPERATURE, isNonStandard: false, isHigher: false };
  }

  return {
    text: formatTemperature(unit === 'celsius' ? celsius : fahrenheit, unit),
    isNonStandard: isNonStandardTemperature(fahrenheit),
    isHigher: isHigherTemperature(fahrenheit),
  };
}
