// The one owner of "which alerts are scheduled with iOS while the app is not in
// front". Two paths ask for it: the React effect in `TimerRunEffects` (in-app
// changes, app-state changes) and the Lock Screen button handler
// (`live-activity-interaction.ts`), which must not wait for a render. Both call
// `ensure`, which is idempotent by a key derived from the state, so the same
// state is never scheduled (or cancelled) twice. Pure: the native calls and the
// app state come in as dependencies.
import { type TimerCue, upcomingCues } from './cues';
import { totalRemainingSeconds } from './engine';
import type { TimerState } from './types';

export interface BackgroundAlertsDeps {
  schedule: (cues: TimerCue[], nowMs: number) => Promise<void>;
  cancel: () => Promise<void>;
  /** Whether the app is in front (alerts are only for when it is not). */
  isActive: () => boolean;
  now?: () => number;
}

export interface AlertState {
  timer: TimerState;
  /** The wall-clock time `timer` describes. */
  anchorMs: number;
}

export interface BackgroundAlerts {
  /**
   * Make the scheduled alerts match `state` when the app is out of the
   * foreground. Resolves once iOS has been told. No-op in the foreground and
   * when the same state was already handled.
   */
  ensure: (state: AlertState) => Promise<void>;
  /**
   * The app came to the front: forget the key and clear every alert (the in-app
   * cues cover it from here). Resolves once cleared.
   */
  foreground: () => Promise<void>;
  /**
   * The run is not running (reset, finished, a cold idle start): clear every
   * alert and record that, through the same queue `ensure` uses, so a stop
   * issued before a later `ensure` can never land after it.
   */
  stop: () => Promise<void>;
}

const STOPPED = 'stopped';

/**
 * Identifies what the alerts describe: not running (all cancelled), or the stage
 * and the moment the run ends (which moves on a resume, skip or restart but not
 * on a tick; bucketed to 500 ms so clock jitter cannot flip it).
 */
export function alertsKey(state: AlertState): string {
  const { timer, anchorMs } = state;
  if (timer.status !== 'running') return STOPPED;
  const end = Math.round(
    (anchorMs + totalRemainingSeconds(timer) * 1000) / 500
  );
  return `${timer.currentStageIndex}:${timer.stages.length}:${end}`;
}

export function createBackgroundAlerts(
  deps: BackgroundAlertsDeps
): BackgroundAlerts {
  const { schedule, cancel, isActive, now = Date.now } = deps;
  let handled: string | null = null;

  return {
    ensure: async (state) => {
      if (isActive()) return;
      const key = alertsKey(state);
      if (key === handled) return;
      // Claimed before awaiting, so a second caller in the same tick sees it.
      handled = key;
      try {
        if (state.timer.status !== 'running') {
          await cancel();
          return;
        }
        // Dated from the moment the state describes, and never in the past.
        const cues = upcomingCues(state.timer).filter(
          (cue) => state.anchorMs + cue.offsetSeconds * 1000 > now()
        );
        await schedule(cues, state.anchorMs);
      } catch (error) {
        // iOS was not told: release the claim so the same state is retried.
        if (handled === key) handled = null;
        throw error;
      }
    },
    foreground: () => {
      handled = null;
      return cancel();
    },
    stop: () => {
      handled = STOPPED;
      return cancel();
    },
  };
}
