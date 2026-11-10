/** A time change with an explicit sign, e.g. "+3.12s" or "−1.5s" (real minus). */
export function formatSignedTime(
  delta: number,
  formatTime: (seconds: number) => string
): string {
  return `${delta < 0 ? '−' : '+'}${formatTime(Math.abs(delta))}`;
}
