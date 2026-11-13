// Next-step links: a tool's answer carried into the next tool, so nobody
// retypes it. Every target is a plain path (a deep link App Intents can reuse
// later), built here by pure functions. Calculator targets reuse the
// calculator's own link (`xCalculatorLink.build`) plus the `at` marker, so the
// same answer opened twice applies twice (see `link-prefill.ts`).
import {
  exposureCalculatorLink,
  formatReciprocityTime,
  RECIPROCITY_FILM_TYPES,
  reciprocityCalculatorLink,
  type ReciprocityFilmType,
} from '@dorkroom/logic';
import { queryOf, toolHref } from '@/lib/home/destination';
import { LINK_OPENED_PARAM } from '@/lib/link-prefill';
import { spokenDuration } from '@/lib/spoken-time';

/** The Process Timer's params for a one-stage exposure. */
export const TIMER_EXPOSURE_PARAM = 'exposure';
export const TIMER_LABEL_PARAM = 'label';
/** The stage's name when a link names none. */
export const EXPOSURE_STAGE_NAME = 'Exposure';

/** Below this the shutter needs no reciprocity correction. */
const MIN_RECIPROCITY_SHUTTER_SECONDS = 1;

/** The timer cannot hold a stage shorter than a whole second; a link below 2 s is not worth a row. */
export const MIN_TIMER_EXPOSURE_SECONDS = 2;

/** The longest exposure a timer link carries (24 h); a larger one is ignored. */
export const MAX_TIMER_EXPOSURE_SECONDS = 86_400;

export interface NextStep {
  label: string;
  /** The full spoken sentence, when the visible label is shortened. */
  accessibilityLabel?: string;
  detail?: string;
  path: string;
}

const trimNumber = (n: number, digits: number) =>
  String(Number(n.toFixed(digits)));

/** Words a stock name may carry beyond the reciprocity film's label. */
const EXTRA_NAME_TOKENS = new Set([
  'plus',
  'pro',
  'professional',
  'pan',
  'film',
]);

/** The one film whose real name carries "Super" (Ilford XP2 Super). */
const SUPER_FILM_VALUE = 'xp2';

/** "+" is the word "plus"; everything else splits on spaces and punctuation. */
const tokensOf = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .split(/[^a-z0-9]+/)
    .filter((t) => t !== '');

const isNumber = (token: string) => /^\d+$/.test(token);

/**
 * The reciprocity film a roll's film stock name stands for, or undefined. A
 * film type matches only if every word of its label (except "plus") is a whole
 * word of the name, so the brand must agree and "Pan F" needs its F; and every
 * other word of the name is on a short allow-list: "plus", "pro",
 * "professional", "pan", "film", "super" (XP2 only), or a number when the label has none ("HP5 Plus
 * 400"). It returns a film only when exactly one type matches, and never the
 * calculator's own custom entry. Misses are safe: the link then carries the
 * time alone.
 */
export function reciprocityFilmFor(
  filmStockName: string | undefined,
  filmTypes: readonly ReciprocityFilmType[] = RECIPROCITY_FILM_TYPES
): ReciprocityFilmType | undefined {
  if (filmStockName === undefined) return undefined;
  const nameTokens = tokensOf(filmStockName);
  if (nameTokens.length === 0) return undefined;
  const nameSet = new Set(nameTokens);
  const matches = filmTypes.filter((film) => {
    if (film.factor === undefined) return false;
    const labelTokens = tokensOf(film.label);
    const labelSet = new Set(labelTokens);
    const labelHasNumber = labelTokens.some(isNumber);
    const named = labelTokens.every((t) => t === 'plus' || nameSet.has(t));
    const extrasAllowed = nameTokens.every(
      (t) =>
        labelSet.has(t) ||
        EXTRA_NAME_TOKENS.has(t) ||
        (t === 'super' && film.value === SUPER_FILM_VALUE) ||
        (isNumber(t) && !labelHasNumber)
    );
    return named && extrasAllowed;
  });
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * The shutter the Meter's Reciprocity link carries. The dial clamps a solved
 * shutter to the meter's longest speed, so when the solution is out of range
 * on the slow side the unsnapped solved time is what the user needs; a locked
 * shutter is what they chose, and anything else is the displayed value.
 */
export function meterShutterForLink(input: {
  displayed: number;
  solved: number;
  locked: boolean;
  outOfRange: boolean;
  max: number;
}): number {
  const { displayed, solved, locked, outOfRange, max } = input;
  if (!locked && outOfRange && Number.isFinite(solved) && solved > max) {
    return solved;
  }
  return displayed;
}

/**
 * Meter to Reciprocity. Null unless the shutter reads 1 s or longer. The link
 * carries the film only when the roll's film stock matches a reciprocity film
 * unambiguously (`reciprocityFilmFor`); otherwise it carries the time alone.
 * The visible label leads with the trusted part so a truncated pill cuts the
 * generic word ("Ilford HP5+ reciprocity", else "Reciprocity"); the spoken
 * label is the full sentence.
 */
export function reciprocityStep(input: {
  shutterSeconds: number;
  filmStockName?: string;
  opened: number;
  filmTypes?: readonly ReciprocityFilmType[];
}): NextStep | null {
  const { shutterSeconds, filmStockName, opened, filmTypes } = input;
  if (
    !Number.isFinite(shutterSeconds) ||
    shutterSeconds < MIN_RECIPROCITY_SHUTTER_SECONDS
  ) {
    return null;
  }
  const film = reciprocityFilmFor(filmStockName, filmTypes);
  const search = reciprocityCalculatorLink.build({
    filmType: film?.value,
    meteredTime: `${trimNumber(shutterSeconds, 2)}s`,
  });
  const spokenTime = spokenDuration(formatReciprocityTime(shutterSeconds));
  const subject = film ? `${film.label} reciprocity` : 'reciprocity';
  return {
    label: film ? `${film.label} reciprocity` : 'Reciprocity',
    accessibilityLabel: `Correct ${spokenTime} for ${subject}`,
    path: `${toolHref('reciprocity')}${queryOf({
      ...search,
      [LINK_OPENED_PARAM]: String(opened),
    })}`,
  };
}

/**
 * Reciprocity to the Process Timer. The label names the whole seconds the timer
 * will hold ("Start a 3m 8s exposure"). Null for a non-finite time, one under
 * 2 s once rounded, or one over 24 h. While a run is active the row opens the
 * timer instead of loading it (a link never replaces a run).
 */
export function exposureTimerStep(input: {
  seconds: number;
  opened: number;
  runActive?: boolean;
}): NextStep | null {
  const { seconds, opened, runActive = false } = input;
  if (!Number.isFinite(seconds)) return null;
  const whole = Math.round(seconds);
  if (
    whole < MIN_TIMER_EXPOSURE_SECONDS ||
    whole > MAX_TIMER_EXPOSURE_SECONDS
  ) {
    return null;
  }
  if (runActive) {
    return {
      label: 'Timer running',
      detail: 'Open timer',
      path: toolHref('timer'),
    };
  }
  return {
    label: `Start a ${formatReciprocityTime(whole)} exposure`,
    path: `${toolHref('timer')}${queryOf({
      [TIMER_EXPOSURE_PARAM]: String(whole),
      [TIMER_LABEL_PARAM]: EXPOSURE_STAGE_NAME,
      [LINK_OPENED_PARAM]: String(opened),
    })}`,
  };
}

/** A signed stops difference, real minus: "+1.17 stops", "−0.5 stops". */
function formatSignedStops(stops: number): string {
  const sign = stops > 0 ? '+' : stops < 0 ? '−' : '';
  return `${sign}${Math.abs(stops).toFixed(2)} stops`;
}

/**
 * Resize to Exposure: opens the stops calculator with the ORIGINAL time and
 * the stops difference, so the user can adjust from there. Both calculators
 * round stops to 2 decimals, so Exposure's result can differ from Resize's in
 * the last digit (10 s, 8x10 to 11x14: 19.3 s in Resize, 19.19 s in Exposure).
 * Null when either is not a number the stops calculator accepts (its own link
 * decides) or the difference rounds to 0.00 stops (no change to carry over).
 */
export function printTimeStep(input: {
  originalTimeSeconds: number;
  stops: number;
  opened: number;
}): (NextStep & { detail: string }) | null {
  const { originalTimeSeconds, stops, opened } = input;
  if (!Number.isFinite(originalTimeSeconds) || !Number.isFinite(stops)) {
    return null;
  }
  const search = exposureCalculatorLink.build({
    originalTime: Number(originalTimeSeconds.toFixed(3)),
    stops: Number(stops.toFixed(4)),
  });
  // The calculator's own validators (time range, +/-5 stops) decide.
  const accepted = exposureCalculatorLink.read(search);
  if (accepted.originalTime === undefined || accepted.stops === undefined) {
    return null;
  }
  if (Number(accepted.stops.toFixed(2)) === 0) return null;
  return {
    label: 'New print time',
    detail: formatSignedStops(accepted.stops),
    path: `${toolHref('exposure')}${queryOf({
      ...search,
      [LINK_OPENED_PARAM]: String(opened),
    })}`,
  };
}
