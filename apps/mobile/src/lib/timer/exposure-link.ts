// The Process Timer's "exposure" link (`/develop/recipes/timer?exposure=112`):
// a one-stage sequence for a timed exposure, such as a reciprocity-corrected
// long exposure. The pure half of what `TimerScreen` does with the link, plus
// the one module-level memory of which opening was handled last.
import {
  EXPOSURE_STAGE_NAME,
  MAX_TIMER_EXPOSURE_SECONDS,
  MIN_TIMER_EXPOSURE_SECONDS,
} from '@/lib/next-step';
import type { TimerStage } from '@/lib/timer/types';

const MAX_STAGE_NAME_LENGTH = 40;

/**
 * The link's seconds as a number, or NaN when absent, not a number, under 2 s
 * or over 24 hours (ignored, as the builder never makes them).
 */
export function exposureSecondsFromParam(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return Number.NaN;
  const seconds = Number(value);
  return seconds < MIN_TIMER_EXPOSURE_SECONDS ||
    seconds > MAX_TIMER_EXPOSURE_SECONDS
    ? Number.NaN
    : seconds;
}

/**
 * A single custom stage of whole seconds (at least 1), with no temperature and
 * no agitation, and a stable id.
 */
export function exposureStages(seconds: number, label?: string): TimerStage[] {
  const name = label?.trim().slice(0, MAX_STAGE_NAME_LENGTH);
  return [
    {
      id: 'exposure',
      kind: 'custom',
      name: name ? name : EXPOSURE_STAGE_NAME,
      durationSeconds: Number.isFinite(seconds)
        ? Math.max(1, Math.round(seconds))
        : 1,
      temperatureF: null,
      agitation: null,
      agitationPattern: null,
    },
  ];
}

/**
 * Identity of one opening of the link: its `at` marker, else (a link built
 * without one, as an App Intent would) the exposure value, so the same value
 * twice in a row is one opening. Undefined when the link names no exposure.
 */
export function exposureLinkKey(
  at: string | undefined,
  exposure: string | undefined
): string | undefined {
  if (at !== undefined && at !== '') return `at:${at}`;
  if (exposure !== undefined && exposure.trim() !== '') {
    return `exposure:${exposure.trim()}`;
  }
  return undefined;
}

/** How far ahead of now an `at` may be before it is not trusted (clock skew). */
export const MAX_AT_AHEAD_MS = 60_000;

/**
 * The `at` time inside an `at:<ms>` key, or undefined when the key has none, it
 * is not a number, or it is more than a minute ahead of `now`: such an `at`
 * (an external link with a far-future time) would block every later link, so it
 * takes part in identity checks only, never in ordering.
 */
function openedOf(key: string | undefined, now: number): number | undefined {
  if (key === undefined || !key.startsWith('at:')) return undefined;
  const opened = Number(key.slice(3));
  if (!Number.isFinite(opened) || opened > now + MAX_AT_AHEAD_MS) {
    return undefined;
  }
  return opened;
}

/**
 * Whether a link seen now should load its stage: it names a usable time, it is
 * a different opening from the last one handled, no run is in progress (a link
 * never replaces a run), and, for an `at` that can be trusted, it is newer than
 * the newest opening handled (`lastOpened`): an older one is a stale link (an
 * older timer screen, or params that came back) and never applies over it.
 */
export function shouldApplyExposureLink(input: {
  key: string | undefined;
  lastAppliedKey: string | undefined;
  /** The newest trusted `at` handled so far. */
  lastOpened?: number;
  now: number;
  runActive: boolean;
  seconds: number;
}): boolean {
  const { key, lastAppliedKey, lastOpened, now, runActive, seconds } = input;
  if (key === undefined || key === lastAppliedKey) return false;
  const opened = openedOf(key, now);
  if (
    opened !== undefined &&
    lastOpened !== undefined &&
    opened <= lastOpened
  ) {
    return false;
  }
  if (runActive) return false;
  return Number.isFinite(seconds) && seconds >= MIN_TIMER_EXPOSURE_SECONDS;
}

// Module level, like the recipe prefill queue: a screen that re-mounts with the
// same params still in its route can never re-apply over stages the user has
// since edited or a preset they picked. Two memories: the last key handled
// (identity) and the newest trusted `at` handled (order, only ever moves
// forward).
let lastHandledKey: string | undefined;
let newestOpened: number | undefined;

/** The opening handled last (applied, or dropped for a run or a recipe). */
export function lastHandledExposureKey(): string | undefined {
  return lastHandledKey;
}

/** The newest trusted `at` handled so far. */
export function lastHandledExposureOpened(): number | undefined {
  return newestOpened;
}

/**
 * Records an opening as handled. A stale opening does not move the order
 * memory back, and an untrusted `at` (far future) never enters it.
 */
export function markExposureLinkHandled(
  key: string | undefined,
  now: number
): void {
  if (key === undefined) return;
  const opened = openedOf(key, now);
  if (opened === undefined || newestOpened === undefined) {
    // Identity only for an untrusted or at-less key; order memory is kept.
    if (opened !== undefined) newestOpened = opened;
    lastHandledKey = key;
    return;
  }
  if (opened < newestOpened) return;
  newestOpened = opened;
  lastHandledKey = key;
}

/** Forgets the last opening; for tests. */
export function resetExposureLinkMemory(): void {
  lastHandledKey = undefined;
  newestOpened = undefined;
}
