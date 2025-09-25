export interface TemperatureData {
  temperatureF?: number | null;
  temperatureC?: number | null;
}

/**
 * Formats temperature data into a display string showing both Fahrenheit and Celsius
 * when both are available, or just one unit when only one is available.
 *
 * @param temperatureData - Object containing temperature values
 * @returns Formatted temperature string or em dash if no valid temperatures
 */
export const formatTemperature = (temperatureData: TemperatureData): string => {
  const fahrenheit = Number.isFinite(temperatureData.temperatureF)
    ? (temperatureData.temperatureF as number)
    : null;
  const celsius = Number.isFinite(temperatureData.temperatureC ?? NaN)
    ? temperatureData.temperatureC ?? null
    : fahrenheit !== null
    ? ((fahrenheit - 32) * 5) / 9
    : null;

  if (fahrenheit !== null && celsius !== null) {
    return `${fahrenheit.toFixed(1)}°F (${celsius.toFixed(1)}°C)`;
  }

  if (fahrenheit !== null) {
    return `${fahrenheit.toFixed(1)}°F`;
  }

  if (celsius !== null) {
    return `${celsius.toFixed(1)}°C`;
  }

  return '—';
};
