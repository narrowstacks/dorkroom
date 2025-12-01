/**
 * Interface for temperature data containing optional Fahrenheit and Celsius values.
 * Used for flexible temperature handling where either or both units may be available.
 */
export interface TemperatureData {
  /** Temperature in Fahrenheit */
  temperatureF?: number | null;
  /** Temperature in Celsius */
  temperatureC?: number | null;
}

/**
 * Formats temperature data into a display string showing both Fahrenheit and Celsius
 * when both are available, or just one unit when only one is available.
 * Returns an em dash (—) when no valid temperature data is provided.
 *
 * @param temperatureData - Object containing temperature values
 * @returns Formatted temperature string or em dash if no valid temperatures
 *
 * @example
 * ```typescript
 * formatTemperature({ temperatureF: 68, temperatureC: 20 });
 * // returns "68.0°F (20.0°C)"
 *
 * formatTemperature({ temperatureF: 75 });
 * // returns "75.0°F"
 *
 * formatTemperature({ temperatureC: 22 });
 * // returns "22.0°C"
 *
 * formatTemperature({});
 * // returns "—"
 * ```
 */
export const formatTemperature = (temperatureData: TemperatureData): string => {
  const fahrenheit = Number.isFinite(temperatureData.temperatureF)
    ? (temperatureData.temperatureF as number)
    : null;
  const celsius = Number.isFinite(temperatureData.temperatureC ?? NaN)
    ? (temperatureData.temperatureC ?? null)
    : null;

  // Only show both units if both were explicitly provided
  if (fahrenheit !== null && celsius !== null) {
    return `${fahrenheit.toFixed(1)}°F (${celsius.toFixed(1)}°C)`;
  }

  // Show only the unit that was provided
  if (fahrenheit !== null) {
    return `${fahrenheit.toFixed(1)}°F`;
  }

  if (celsius !== null) {
    return `${celsius.toFixed(1)}°C`;
  }

  return '—';
};
