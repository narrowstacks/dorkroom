/**
 * Formats time values into human-readable strings
 */

/**
 * Formats seconds into a human-readable time string (e.g., "1.5s", "2m 30s", "1h 30m")
 */
export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds * 10) / 10}s`;
  if (seconds < 3600) {
    const min = Math.floor(seconds / 60);
    const sec = Math.round((seconds % 60) * 10) / 10;
    return sec === 0 ? `${min}m` : `${min}m ${sec}s`;
  }
  const hrs = Math.floor(seconds / 3600);
  const min = Math.floor((seconds % 3600) / 60);
  return min === 0 ? `${hrs}h` : `${hrs}h ${min}m`;
}

/**
 * Formats minutes into a human-readable time string (e.g., "30s", "2 min", "1h 30m")
 */
export function formatMinutes(minutes: number): string {
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
