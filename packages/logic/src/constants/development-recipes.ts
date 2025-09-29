export const FILM_COLOR_TYPES = [
  { label: 'All Films', value: '' },
  { label: 'Black & White', value: 'bw' },
];

export const DEVELOPER_TYPES = [
  { label: 'All Developers', value: '' },
  { label: 'Powder', value: 'powder' },
  { label: 'Concentrate', value: 'concentrate' },
];

export const TEMP_CELSIUS_BASE = 20;
export const TEMP_FAHRENHEIT_BASE = 68;

/**
 * Format a Fahrenheit temperature with a Celsius conversion for display.
 *
 * @param tempF - Temperature value in degrees Fahrenheit
 * @returns Combined Fahrenheit and Celsius temperature string
 */
export function convertToDisplay(tempF: number): string {
  const celsius = ((tempF - 32) * 5) / 9;
  return `${tempF}°F (${celsius.toFixed(1)}°C)`;
}

/**
 * Format a development time value into a readable string.
 *
 * @param minutes - Development time expressed in minutes
 * @returns Human-readable time string using seconds, minutes, or hours
 */
export function formatTime(minutes: number): string {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}s`;
  }

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${minutes} min`;
}

export const SORT_OPTIONS = [
  { label: 'Development Time', value: 'timeMinutes' },
  { label: 'Temperature', value: 'temperatureF' },
  { label: 'ISO', value: 'shootingIso' },
];

export const PUSH_PULL_LABELS: Record<number, string> = {
  [-2]: 'Pull 2 stops',
  [-1]: 'Pull 1 stop',
  0: 'Box Speed',
  1: 'Push 1 stop',
  2: 'Push 2 stops',
};
