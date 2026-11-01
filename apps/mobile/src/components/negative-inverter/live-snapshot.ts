import type { RgbaImage } from '@dorkroom/logic';

/**
 * Pacing of the live statistics snapshots. The frame worklet hands React a
 * small copy of the negative only when asked; React asks at most every
 * {@link SNAPSHOT_INTERVAL_MS}, never while one is still on its way (so a busy
 * JS thread is not queued up behind stale snapshots), and gives up on one
 * after {@link SNAPSHOT_TIMEOUT_MS} (the camera stopped, or the frame was
 * dropped). Taps and setting changes reuse the last snapshot at once rather
 * than wait for the next.
 *
 * Exposure changes are paced the same way: the camera's auto-exposure takes a
 * moment to settle on a new bias, so the next change waits
 * {@link EXPOSURE_SETTLE_MS}.
 */

export const SNAPSHOT_INTERVAL_MS = 500;
export const SNAPSHOT_TIMEOUT_MS = 2000;
export const EXPOSURE_SETTLE_MS = 1200;

export interface SnapshotClock {
  /** When the last snapshot was asked for, or null before the first. */
  requestedAt: number | null;
  /** True from asking until the snapshot arrives. */
  waiting: boolean;
}

export const IDLE_SNAPSHOT_CLOCK: SnapshotClock = {
  requestedAt: null,
  waiting: false,
};

/** Whether to ask for a snapshot at `now` (milliseconds). */
export function snapshotDue(clock: SnapshotClock, now: number): boolean {
  if (clock.requestedAt === null) return true;
  const since = now - clock.requestedAt;
  if (clock.waiting) return since >= SNAPSHOT_TIMEOUT_MS;
  return since >= SNAPSHOT_INTERVAL_MS;
}

export function snapshotRequested(now: number): SnapshotClock {
  return { requestedAt: now, waiting: true };
}

export function snapshotReceived(clock: SnapshotClock): SnapshotClock {
  return { ...clock, waiting: false };
}

/** Whether the exposure has had time to settle since it last changed. */
export function exposureSettled(
  changedAt: number | null,
  now: number
): boolean {
  return changedAt === null || now - changedAt >= EXPOSURE_SETTLE_MS;
}

/** Mean change, in code values, under which a snapshot counts as the same
 *  picture (sensor noise is about 1 to 2). */
export const SNAPSHOT_SAME_MEAN = 2;

/** Every this many pixels, along rows and columns, is compared. */
const COMPARE_STEP = 4;

/**
 * Whether `next` shows a different picture from `previous`: the mean RGB
 * difference over a sparse grid exceeds {@link SNAPSHOT_SAME_MEAN}. A steady
 * negative on a steady light table repeats itself, and its statistics need
 * not be run again.
 */
export function snapshotChanged(
  previous: RgbaImage | null,
  next: RgbaImage
): boolean {
  if (
    !previous ||
    previous.width !== next.width ||
    previous.height !== next.height
  ) {
    return true;
  }
  let total = 0;
  let count = 0;
  for (let y = 0; y < next.height; y += COMPARE_STEP) {
    for (let x = 0; x < next.width; x += COMPARE_STEP) {
      const i = (y * next.width + x) * 4;
      total +=
        Math.abs(next.data[i] - previous.data[i]) +
        Math.abs(next.data[i + 1] - previous.data[i + 1]) +
        Math.abs(next.data[i + 2] - previous.data[i + 2]);
      count += 3;
    }
  }
  return total / count > SNAPSHOT_SAME_MEAN;
}
