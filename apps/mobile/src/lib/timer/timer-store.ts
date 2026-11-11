// The running timer, held above any screen so a run survives navigating away
// and back (and the tab bar swapping screens). A plain module-level store read
// with `useSyncExternalStore`, the same shape as the one-shot `prefill.ts`
// hand-off: no provider, no native imports, fully unit-testable with a fake
// clock. It is deliberately not persisted: a run does not survive the app being
// killed (alerts already scheduled with iOS still fire, see `timer-alerts.ts`).
//
// Time is never counted in ticks. The store keeps the wall-clock timestamp its
// state was captured at (`anchorMs`) and `sync()` projects forward from it with
// `projectState`, so a backgrounded or suspended app catches up exactly.
import { createTimerState, projectState, timerReducer } from './engine';
import { DEFAULT_BW_PRESET } from './presets';
import type { TimerAction, TimerStage, TimerState } from './types';

export interface TimerStoreSnapshot {
  timer: TimerState;
  /** Preset chip selected on the screen ('' once the stages were edited). */
  selectedPresetId: string;
  /** Alert permission was refused, so backgrounded runs will be silent. */
  alertsDenied: boolean;
  /** The wall-clock time `timer` was captured at (what a running timer is projected from). */
  anchorMs: number;
}

export interface TimerStore {
  getSnapshot: () => TimerStoreSnapshot;
  subscribe: (listener: () => void) => () => void;
  /** Catch the countdown up to the wall clock. Cheap; call as often as needed. */
  sync: () => void;
  dispatch: (action: TimerAction) => void;
  setSelectedPresetId: (id: string) => void;
  setAlertsDenied: (denied: boolean) => void;
}

export function createTimerStore(
  initialStages: TimerStage[],
  initialPresetId: string,
  now: () => number = Date.now
): TimerStore {
  let anchorMs = now();
  let snapshot: TimerStoreSnapshot = {
    timer: createTimerState(initialStages),
    selectedPresetId: initialPresetId,
    alertsDenied: false,
    anchorMs,
  };
  const listeners = new Set<() => void>();

  const commit = (next: TimerStoreSnapshot) => {
    snapshot = next;
    for (const listener of listeners) listener();
  };

  const sync = () => {
    const at = now();
    const projected = projectState(snapshot.timer, anchorMs, at);
    anchorMs = at;
    if (projected !== snapshot.timer) {
      commit({ ...snapshot, timer: projected, anchorMs });
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    sync,
    dispatch: (action) => {
      sync();
      const next = timerReducer(snapshot.timer, action);
      anchorMs = now();
      if (next !== snapshot.timer) {
        commit({ ...snapshot, timer: next, anchorMs });
      }
    },
    setSelectedPresetId: (id) => {
      if (id !== snapshot.selectedPresetId) {
        commit({ ...snapshot, selectedPresetId: id });
      }
    },
    setAlertsDenied: (denied) => {
      if (denied !== snapshot.alertsDenied) {
        commit({ ...snapshot, alertsDenied: denied });
      }
    },
  };
}

export const timerStore = createTimerStore(
  DEFAULT_BW_PRESET.stages,
  DEFAULT_BW_PRESET.id
);

/** A run is active while it is counting down or paused mid-way. */
export function isRunActive(timer: TimerState): boolean {
  return timer.status === 'running' || timer.status === 'paused';
}
