export type TemperatureUnit = 'fahrenheit' | 'celsius';

export const STANDARD_TEMP_F = 68;
export const STANDARD_TEMP_C = 20;

export function isNonStandardTemperature(temperatureF: number): boolean {
  const temperatureC = ((temperatureF - 32) * 5) / 9;
  return (
    Math.abs(temperatureF - STANDARD_TEMP_F) > 0.1 ||
    Math.abs(temperatureC - STANDARD_TEMP_C) > 0.1
  );
}

export function isHigherTemperature(temperatureF: number): boolean {
  return temperatureF > STANDARD_TEMP_F;
}

/**
 * Formats a temperature value for display in the requested unit and indicates if it differs from the standard temperature.
 *
 * If only one of `temperatureF` or `temperatureC` is provided, the function computes the missing value using standard conversion formulas. The `isNonStandard` flag is determined from the Fahrenheit temperature when available.
 *
 * @param temperatureF - Temperature in degrees Fahrenheit, or `null` if not provided
 * @param temperatureC - Temperature in degrees Celsius, or `null` if not provided
 * @param unit - The unit to format the output in (`'fahrenheit'` or `'celsius'`)
 * @param highlight - Unused; accepted for API compatibility
 * @returns An object with `text` containing the formatted temperature (e.g., `"68.0°F"` or `"20.0°C"`) or `"—"` when no value is available, `isNonStandard` indicating whether the temperature differs from the standard temperature, and `isHigher` indicating whether it's above standard (for color coding)
 */
export function formatTemperatureWithUnit(
  temperatureF: number | null,
  temperatureC: number | null,
  unit: TemperatureUnit,
  _highlight = false
): { text: string; isNonStandard: boolean; isHigher: boolean } {
  let fahrenheit = Number.isFinite(temperatureF)
    ? (temperatureF as number)
    : null;
  let celsius = Number.isFinite(temperatureC ?? NaN)
    ? (temperatureC as number)
    : null;

  if (fahrenheit === null && celsius !== null) {
    fahrenheit = (celsius * 9) / 5 + 32;
  }
  if (celsius === null && fahrenheit !== null) {
    celsius = ((fahrenheit - 32) * 5) / 9;
  }

  const isNonStandard =
    fahrenheit !== null ? isNonStandardTemperature(fahrenheit) : false;
  const isHigher =
    fahrenheit !== null ? isHigherTemperature(fahrenheit) : false;

  if (unit === 'celsius') {
    if (celsius !== null) {
      return {
        text: `${celsius.toFixed(1)}°C`,
        isNonStandard,
        isHigher,
      };
    }
  } else {
    if (fahrenheit !== null) {
      return {
        text: `${fahrenheit.toFixed(1)}°F`,
        isNonStandard,
        isHigher,
      };
    }
  }

  return {
    text: '—',
    isNonStandard: false,
    isHigher: false,
  };
}
