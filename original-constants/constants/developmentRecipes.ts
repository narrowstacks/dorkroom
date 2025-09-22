// Constants for Development Recipes

// Filter options for film types (restricted to black and white only)
export const FILM_COLOR_TYPES = [
  { label: "All Films", value: "" },
  { label: "Black & White", value: "bw" },
];

// Filter options for developer types
export const DEVELOPER_TYPES = [
  { label: "All Developers", value: "" },
  { label: "Powder", value: "powder" },
  { label: "Concentrate", value: "concentrate" },
];

// Temperature conversion utilities
export const TEMP_CELSIUS_BASE = 20; // 68F
export const TEMP_FAHRENHEIT_BASE = 68;

export function convertToDisplay(tempF: number): string {
  const celsius = ((tempF - 32) * 5) / 9;
  return `${tempF}°F (${celsius.toFixed(1)}°C)`;
}

export function formatTime(minutes: number): string {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}s`;
  } else if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  } else {
    return `${minutes} min`;
  }
}

// Sort options for results
export const SORT_OPTIONS = [
  { label: "Development Time", value: "timeMinutes" },
  { label: "Temperature", value: "temperatureF" },
  { label: "ISO", value: "shootingIso" },
];

// Push/pull labels
export const PUSH_PULL_LABELS: { [key: number]: string } = {
  [-2]: "Pull 2 stops",
  [-1]: "Pull 1 stop",
  0: "Normal",
  1: "Push 1 stop",
  2: "Push 2 stops",
};

export default {
  FILM_COLOR_TYPES,
  DEVELOPER_TYPES,
  SORT_OPTIONS,
  PUSH_PULL_LABELS,
  convertToDisplay,
  formatTime,
};
