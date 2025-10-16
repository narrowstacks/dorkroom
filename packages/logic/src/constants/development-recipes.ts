import { formatMinutes } from '../utils/time-formatting';

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
 * Convert a duration in minutes into a human-readable string.
 *
 * @param minutes - Duration in minutes
 * @returns `Xs` for durations less than one minute (seconds rounded), `Hh Mm` for durations of one hour or more, `N min` for other minute values
 */
export const formatTime = formatMinutes;

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
