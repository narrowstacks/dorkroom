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

export function formatTemperatureWithUnit(
  temperatureF: number | null,
  temperatureC: number | null,
  unit: TemperatureUnit,
  highlight = false
): { text: string; isNonStandard: boolean } {
  const fahrenheit = Number.isFinite(temperatureF) ? temperatureF : null;
  const celsius = Number.isFinite(temperatureC ?? NaN)
    ? temperatureC!
    : fahrenheit !== null
    ? ((fahrenheit - 32) * 5) / 9
    : null;

  const isNonStandard =
    fahrenheit !== null ? isNonStandardTemperature(fahrenheit) : false;

  if (unit === 'celsius') {
    if (celsius !== null) {
      return {
        text: `${celsius.toFixed(1)}°C`,
        isNonStandard,
      };
    }
  } else {
    if (fahrenheit !== null) {
      return {
        text: `${fahrenheit.toFixed(1)}°F`,
        isNonStandard,
      };
    }
  }

  return {
    text: '—',
    isNonStandard: false,
  };
}
