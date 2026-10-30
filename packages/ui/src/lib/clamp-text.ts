/**
 * Clamp a numeric text value into an optional [min, max] range.
 *
 * Returns the clamped value as a string when `raw` parses to a finite number
 * outside the range, otherwise `null` (unparseable text, or already in range),
 * so callers only need to commit when something actually changed.
 * Non-finite bounds are ignored. If min > max, max wins.
 */
export function clampText(
  raw: string,
  min?: number,
  max?: number
): string | null {
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed)) return null;
  let clamped = parsed;
  if (min !== undefined && Number.isFinite(min)) {
    clamped = Math.max(min, clamped);
  }
  if (max !== undefined && Number.isFinite(max)) {
    clamped = Math.min(max, clamped);
  }
  // Normalize negative zero: "-0" would otherwise pass as "already in range"
  // (0 === -0) and stay on screen after blur.
  if (Object.is(clamped, -0)) clamped = 0;
  return Object.is(clamped, parsed) ? null : String(clamped);
}
