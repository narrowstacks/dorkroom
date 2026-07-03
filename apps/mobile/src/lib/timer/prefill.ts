// One-shot hand-off for the recipe → "Start Process Timer" link. The recipe
// detail screen stashes its `Combination` here and navigates; the timer screen
// consumes it once on mount and seeds its stages via `stagesFromCombination`.
// A module singleton (rather than router params) keeps the full, nested
// Combination object typed and avoids serializing it through the URL — the two
// screens are in the same JS context, so a plain in-memory pass is enough.
import type { Combination } from '@dorkroom/api';

let pending: Combination | null = null;

/** Queue a recipe to prefill the next timer screen that mounts. */
export function setTimerPrefill(combination: Combination): void {
  pending = combination;
}

/**
 * Read and clear the queued prefill. Returns `null` when nothing is queued (the
 * standalone timer entry), so callers fall back to the default sequence. One-shot:
 * a second call returns `null` until something new is queued.
 */
export function consumeTimerPrefill(): Combination | null {
  const queued = pending;
  pending = null;
  return queued;
}
