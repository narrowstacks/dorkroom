/**
 * Pure decision logic and phrasing for announcing calculator results to
 * VoiceOver. The hook in `hooks/use-announce-result.ts` is a thin wrapper
 * around these, so the debounce and dedupe rules can be unit-tested without
 * React Native.
 */

/** Quiet period before a changed result is spoken, so typing a number does not spam. */
export const ANNOUNCE_DEBOUNCE_MS = 700;

/**
 * Window after a screen mounts in which result changes are restored state
 * (persisted inputs hydrate in an effect after the first render), not edits.
 * Too short for a person to have changed an input.
 */
export const ANNOUNCE_SETTLE_MS = 400;

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
 *
 * While the screen is not focused (tabs stay mounted behind the visible one)
 * nothing is spoken and the current text becomes the baseline, so a change
 * made elsewhere, such as flipping units in Settings, is not announced on top
 * of the visible screen and not replayed when the user comes back.
 */
export function resolveAnnouncement(
  lastSettled: string | null,
  next: string | null | undefined,
  focused = true
): AnnounceDecision {
  const settled = normalizeAnnouncement(next);
  if (!focused || settled === null || settled === lastSettled) {
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

const isFiniteNumber = (n: number) => Number.isFinite(n);

/** Exposure (stops): "New time 14.2 seconds". Null unless the time is finite. */
export function exposureAnnouncement(
  seconds: number,
  format: (seconds: number) => string
): string | null {
  if (!isFiniteNumber(seconds)) return null;
  return `New time ${speakExposureTime(format(seconds))}`;
}

/** Resize: the hook's newTime is a one-decimal seconds string, or empty. */
export function resizeAnnouncement(newTimeSeconds: string): string | null {
  const seconds = Number.parseFloat(newTimeSeconds);
  if (!Number.isFinite(seconds)) return null;
  return `New time ${speakExposureTime(`${seconds}s`)}`;
}

/** Reciprocity: "Adjusted exposure 2 minutes 5 seconds". Null unless finite. */
export function reciprocityAnnouncement(
  seconds: number,
  format: (seconds: number) => string
): string | null {
  if (!isFiniteNumber(seconds)) return null;
  return `Adjusted exposure ${speakExposureTime(format(seconds))}`;
}

/** Lens: "Equivalent focal length 75 millimeters on Full frame". Null unless finite. */
export function lensAnnouncement(
  focalLength: number,
  format: (focalLength: number) => string,
  targetLabel: string
): string | null {
  if (!isFiniteNumber(focalLength)) return null;
  return `Equivalent focal length ${speakFocalLength(format(focalLength))} on ${targetLabel}`;
}

const FRACTION_WORDS = new Map<number, [string, string]>([
  [2, ['half', 'halves']],
  [4, ['quarter', 'quarters']],
  [8, ['eighth', 'eighths']],
  [16, ['sixteenth', 'sixteenths']],
]);
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five'];

function speakFraction(numerator: number, denominator: number): string {
  const words = FRACTION_WORDS.get(denominator);
  if (!words) return `${numerator} over ${denominator}`;
  const count = NUMBER_WORDS[numerator] ?? String(numerator);
  return `${count} ${numerator === 1 ? words[0] : words[1]}`;
}

// A whole number, a whole number and a fraction separated by whitespace, or a
// bare fraction. The separator is required, so `11/16"` is a fraction and not
// 1 and 1/16.
const MEASURE =
  /^(?:(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+))?|(\d+)\/(\d+))\s*("|cm)$/;

/**
 * Turns a displayed length into words VoiceOver reads cleanly: `8 3/4"`
 * becomes "8 and three quarters inches" (a bare 3/4 can be read as a date),
 * `17.8cm` becomes "17.8 centimeters". Text that is not a length is returned
 * unchanged.
 */
export function speakLength(formatted: string): string {
  const match = MEASURE.exec(formatted.trim());
  if (!match) return formatted;
  const [, whole, mixedNumer, mixedDenom, bareNumer, bareDenom, unit] = match;
  const numer = mixedNumer ?? bareNumer;
  const denom = mixedDenom ?? bareDenom;
  const inches = unit === '"';
  if (numer !== undefined && denom !== undefined) {
    const fraction = speakFraction(Number(numer), Number(denom));
    if (whole === undefined) {
      return inches ? `${fraction} of an inch` : `${fraction} of a centimeter`;
    }
    return `${whole} and ${fraction} ${inches ? 'inches' : 'centimeters'}`;
  }
  const amount = whole ?? '0';
  const one = Number(amount) === 1;
  if (inches) return `${amount} ${one ? 'inch' : 'inches'}`;
  return `${amount} ${one ? 'centimeter' : 'centimeters'}`;
}

/** Mat: null while the layout is invalid, so the placeholder is never spoken. */
export function matAnnouncement(
  valid: boolean,
  formattedWidth: string,
  formattedHeight: string
): string | null {
  if (!valid) return null;
  return `Window opening ${speakLength(formattedWidth)} by ${speakLength(formattedHeight)}`;
}

/**
 * Border: "Border layout, image 7 inches by 9 inches on 8 by 10 paper". Takes
 * the displayed lengths (`7"`, `17.8cm`) and the paper's trade size (`8×10`).
 */
export function borderAnnouncement(
  printWidth: string,
  printHeight: string,
  paperLabel: string
): string {
  return `Border layout, image ${speakLength(printWidth)} by ${speakLength(printHeight)} on ${paperLabel.replace('×', ' by ')} paper`;
}

/** Camera exposure: "Exposure value 12". */
export function cameraExposureAnnouncement(ev: number | string): string {
  return `Exposure value ${ev}`;
}
