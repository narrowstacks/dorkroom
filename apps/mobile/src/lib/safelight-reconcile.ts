// Which copy of Safelight mode wins: the app's (MMKV, read synchronously for the
// first frame) or the App Group's (written by the Control Center toggle, which
// runs in the widget extension and so works with the app closed). Each copy
// carries the time it was last changed; the newer one wins. Pure.
//
// Stamps are monotonic on both sides, so a change is always newer than every
// stamp its writer can see even after the device clock is set back: the app
// stamps with `nextSafelightStamp`, and the extension (SafelightControl.swift)
// applies the same rule to the shared stamp, `max(now, shared + 1)`.

/**
 * The stamp for a change made now: the clock, or one past the newest stamp
 * the writer can see when the clock reads earlier (it was set back). Null
 * stamps (never written) are ignored.
 */
export function nextSafelightStamp(
  now: number,
  seen: readonly (number | null)[]
): number {
  let stamp = Math.floor(now);
  for (const previous of seen) {
    if (previous !== null && Number.isFinite(previous)) {
      stamp = Math.max(stamp, Math.floor(previous) + 1);
    }
  }
  return stamp;
}

export interface SafelightCopy {
  on: boolean;
  /** Milliseconds since the epoch; 0 when never stamped (a value from before the mirror). */
  changedAt: number;
}

export interface SharedSafelightCopy {
  /** Null when the App Group has never been written (or cannot be read). */
  on: boolean | null;
  changedAt: number | null;
}

export type SafelightReconcile =
  /** The control changed it more recently: take the shared value. */
  | { kind: 'adopt'; on: boolean; changedAt: number }
  /**
   * The shared copy is missing, or older (or tied and different): write the
   * app's value and stamp there. A stamp never moves backwards: when the shared
   * value is missing but a stamp is there, the publish uses the newer of the
   * two, and the store raises the app's own stamp to match. Also when only the stamps differ, so the
   * shared stamp never trails the app's and a later control press (stamped
   * `shared + 1`) can never tie or trail it.
   */
  | { kind: 'publish'; on: boolean; changedAt: number }
  | { kind: 'none' };

export function reconcileSafelight(
  local: SafelightCopy,
  shared: SharedSafelightCopy
): SafelightReconcile {
  const sharedAt = shared.changedAt ?? 0;
  if (shared.on === null) {
    // No shared value (never written, or the extension died between its stamp
    // and its value). Publish the app's value without moving a stamp back.
    return {
      kind: 'publish',
      on: local.on,
      changedAt: Math.max(local.changedAt, sharedAt),
    };
  }
  if (sharedAt > local.changedAt) {
    return { kind: 'adopt', on: shared.on, changedAt: sharedAt };
  }
  // Settled only when value and stamp agree. Otherwise the app's copy is as new
  // or newer: the shared copy is stale (a write that failed, or a crash between
  // the stamp and the value), so it is written again, stamp included.
  if (shared.on === local.on && sharedAt === local.changedAt) {
    return { kind: 'none' };
  }
  return { kind: 'publish', on: local.on, changedAt: local.changedAt };
}
