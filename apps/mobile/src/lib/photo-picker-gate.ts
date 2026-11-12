import { useSyncExternalStore } from 'react';
import { getSafelight } from '@/lib/safelight-store';

/**
 * The system photo picker is its own window: the safelight overlay cannot reach
 * it, so it opens at full colour and brightness. While the mode is on, anything
 * that would open it goes through `gatePhotoPicker`, which asks first in an
 * in-app sheet (covered by the overlay). With the mode off it runs at once.
 *
 * The picker must open only AFTER the gate's sheet (an RN `Modal`) has fully
 * dismissed: expo-image-picker presents from the top-most controller, so a
 * picker opened while the sheet is still up would be presented on it and torn
 * down with it. So confirming only marks the request and closes the sheet; the
 * host calls `photoPickerDismissed` from the Modal's `onDismiss`, and that is
 * what opens the picker, exactly once. Every request settles: Cancel, the
 * backdrop, a swipe, a second request, the mode being turned off, the host
 * unmounting, or a missing `onDismiss` (a watchdog).
 */

/** What the sheet should be doing. `closing` is the sheet on its way out. */
export type GateStatus = 'idle' | 'asking' | 'closing';

type Outcome = 'confirmed' | 'cancelled';

interface Request {
  /** Launches the picker and settles the caller's promise with its result. */
  start: () => void;
  /** Settles the caller's promise as cancelled. */
  cancel: () => void;
  /** Set once the user has answered; the sheet is then dismissing. */
  outcome: Outcome | null;
  watchdog: ReturnType<typeof setTimeout> | null;
}

/** Longest to wait for the Modal's `onDismiss` before carrying on without it. */
export const DISMISS_WATCHDOG_MS = 1500;

let request: Request | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function status(): GateStatus {
  if (request === null) return 'idle';
  return request.outcome === null ? 'asking' : 'closing';
}

/** Ends `req` without opening anything. */
function cancelled(req: Request): void {
  if (req.watchdog !== null) clearTimeout(req.watchdog);
  req.cancel();
}

/**
 * Runs `open` (the call that launches the picker). Returns its result, or
 * `undefined` when the mode is on and the user did not confirm.
 */
export function gatePhotoPicker<T>(
  open: () => Promise<T>
): Promise<T | undefined> {
  if (!getSafelight()) return open();
  // A second request replaces an unanswered or closing first one.
  if (request !== null) {
    const previous = request;
    request = null;
    cancelled(previous);
  }
  return new Promise<T | undefined>((resolve, reject) => {
    request = {
      start: () => {
        open().then(resolve, reject);
      },
      cancel: () => resolve(undefined),
      outcome: null,
      watchdog: null,
    };
    emit();
  });
}

function answer(outcome: Outcome): void {
  if (request === null || request.outcome !== null) return; // double tap
  const req = request;
  req.outcome = outcome;
  // If the Modal never reports its dismissal, do not strand the promise.
  req.watchdog = setTimeout(photoPickerDismissed, DISMISS_WATCHDOG_MS);
  emit();
}

/** The user chose Open: close the sheet; the picker opens once it is gone. */
export function confirmPhotoPicker(): void {
  answer('confirmed');
}

/** The user chose Cancel, the backdrop or swiped the sheet away. */
export function cancelPhotoPicker(): void {
  answer('cancelled');
}

/**
 * The gate's sheet has fully dismissed (the Modal's `onDismiss`). Opens the
 * picker if the user confirmed, exactly once; otherwise settles as cancelled.
 * Safe to call with nothing pending, and more than once.
 */
export function photoPickerDismissed(): void {
  // A transparent full-screen Modal cannot be dismissed without an answer
  // (Cancel, the backdrop and a swipe all go through `cancelPhotoPicker`).
  if (request === null || request.outcome === null) return;
  const req = request;
  request = null;
  if (req.watchdog !== null) clearTimeout(req.watchdog);
  emit();
  if (req.outcome === 'confirmed') {
    req.start();
  } else {
    req.cancel();
  }
}

/** Settle any pending request as cancelled (the host unmounts, or the mode is
 * turned off while the sheet is open). */
export function abandonPhotoPicker(): void {
  if (request === null) return;
  const req = request;
  request = null;
  emit();
  cancelled(req);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The gate's status, for the host that renders the sheet. */
export function usePhotoPickerStatus(): GateStatus {
  return useSyncExternalStore(subscribe, status, status);
}
