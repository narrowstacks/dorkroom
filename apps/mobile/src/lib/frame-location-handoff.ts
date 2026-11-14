// One-shot, in-memory hand-off of a location from the log-frame sheet to the
// shot form ("More options..."). Like `timer/prefill.ts`, it is a module
// singleton and not a route param: coordinates must never sit in a URL, because
// the shot form's route is reachable by an outside link that could plant them,
// and navigation state would carry them.
//
// Keyed by the capture's photo file name, so a location can only reach the form
// opened for that capture. A newer hand-off replaces an older one, and the form
// clears whatever it did not use.
import type { ShotLocationFields } from '@/schemas/film-log.schema';

let pending: { key: string; location: ShotLocationFields } | null = null;

/** Queue a location for the shot form that opens for `key`. */
export function setFrameLocationHandoff(
  key: string,
  location: ShotLocationFields
): void {
  pending = { key, location };
}

/** The queued location for `key`, without consuming it (safe in a render); the form reads it once. */
export function peekFrameLocationHandoff(
  key: string | undefined
): ShotLocationFields | undefined {
  return key !== undefined && pending?.key === key
    ? pending.location
    : undefined;
}

/** Drops anything queued. The form calls it once it has read, and on unmount. */
export function clearFrameLocationHandoff(): void {
  pending = null;
}
