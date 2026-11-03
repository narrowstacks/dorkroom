/**
 * Pure decision logic and phrasing for announcing calculator results to
 * VoiceOver. The hook in `hooks/use-announce-result.ts` is a thin wrapper
 * around these, so the debounce and dedupe rules can be unit-tested without
 * React Native.
 */

/** Quiet period before a changed result is spoken, so typing a number does not spam. */
export const ANNOUNCE_DEBOUNCE_MS = 700;

/** Trims a candidate phrase; empty or missing text means "nothing to say". */
export function normalizeAnnouncement(
  text: string | null | undefined
): string | null {
  const trimmed = text?.trim();
  return trimmed ? trimmed : null;
}

export interface AnnounceDecision {
  /** The phrase to speak now, or null to stay silent. */
  speak: string | null;
  /** The value to remember as "last settled", for the next decision. */
  settled: string | null;
}

/**
 * Decides what to do once the debounce has elapsed. Speaks only when the
 * settled text is real and differs from what was last settled. An invalid
 * state (null) is remembered, so recovering to the same result as before the
 * invalid state is announced again: the user lost it and should hear it return.
 */
export function resolveAnnouncement(
  lastSettled: string | null,
  next: string | null | undefined
): AnnounceDecision {
  const settled = normalizeAnnouncement(next);
  if (settled === null || settled === lastSettled) {
    return { speak: null, settled };
  }
  return { speak: settled, settled };
}

const plural = (n: string, unit: string) =>
  `${n} ${unit}${Number(n) === 1 ? '' : 's'}`;

/**
 * Turns a formatted exposure time ("14.2s", "2m 5s", "1m") into words that
 * VoiceOver reads cleanly ("14.2 seconds", "2 minutes 5 seconds").
 */
export function speakExposureTime(formatted: string): string {
  return formatted
    .replace(/(\d+(?:\.\d+)?)m\b/g, (_, n: string) => plural(n, 'minute'))
    .replace(/(\d+(?:\.\d+)?)s\b/g, (_, n: string) => plural(n, 'second'));
}

/** "75mm" becomes "75 millimeters". */
export function speakFocalLength(formatted: string): string {
  return formatted.replace(/(\d+(?:\.\d+)?)mm\b/g, (_, n: string) =>
    plural(n, 'millimeter')
  );
}

/** Exposure (stops): "New time 14.2 seconds". */
export function exposureAnnouncement(formattedTime: string): string {
  return `New time ${speakExposureTime(formattedTime)}`;
}

/** Resize: the hook's newTime is a one-decimal seconds string, or empty. */
export function resizeAnnouncement(newTimeSeconds: string): string | null {
  const seconds = Number.parseFloat(newTimeSeconds);
  if (!Number.isFinite(seconds)) return null;
  return `New time ${speakExposureTime(`${seconds}s`)}`;
}

/** Reciprocity: "Adjusted exposure 2 minutes 5 seconds". */
export function reciprocityAnnouncement(formattedTime: string): string {
  return `Adjusted exposure ${speakExposureTime(formattedTime)}`;
}

/** Lens: "Equivalent focal length 75 millimeters on Full frame". */
export function lensAnnouncement(
  formattedFocalLength: string,
  targetLabel: string
): string {
  return `Equivalent focal length ${speakFocalLength(formattedFocalLength)} on ${targetLabel}`;
}

/** Mat: null while the layout is invalid, so the placeholder is never spoken. */
export function matAnnouncement(
  valid: boolean,
  formattedWidth: string,
  formattedHeight: string
): string | null {
  if (!valid) return null;
  return `Window opening ${formattedWidth} by ${formattedHeight}`;
}

/** Border: reads the preview caption, e.g. `7" × 9" image on 8×10`. */
export function borderAnnouncement(caption: string): string {
  return `Border layout, ${caption}`;
}

/** Camera exposure: "Exposure value 12". */
export function cameraExposureAnnouncement(ev: number | string): string {
  return `Exposure value ${ev}`;
}
