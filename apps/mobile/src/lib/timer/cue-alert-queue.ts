// Schedule and cancel the background cue alerts one at a time, in call order,
// so a quick background-then-foreground can never leave alerts scheduled after
// the cancel. Pure: the notification calls come in as a dependency, so the
// queue's failure behavior is testable without the native module.
import type { TimerCue } from './cues';

export interface CueNotifications {
  cancelAll: () => Promise<void>;
  /** Schedule one alert for `cue` at `date`; resolves with its id. */
  scheduleAt: (cue: TimerCue, date: Date) => Promise<string>;
}

export interface CueAlertQueue {
  /** Replace any pending alerts with one per cue, dated from `nowMs`. */
  schedule: (cues: TimerCue[], nowMs: number) => Promise<void>;
  cancel: () => Promise<void>;
}

export function createCueAlertQueue(native: CueNotifications): CueAlertQueue {
  let queue: Promise<void> = Promise.resolve();
  // A failed task rejects its own caller (so `backgroundAlerts` can release its
  // claim and retry the same state), and the queue still moves on to the next.
  const enqueue = (task: () => Promise<void>): Promise<void> => {
    queue = queue.then(task, task);
    return queue;
  };
  return {
    schedule: (cues, nowMs) =>
      enqueue(async () => {
        await native.cancelAll();
        await Promise.all(
          cues.map((cue) =>
            native.scheduleAt(cue, new Date(nowMs + cue.offsetSeconds * 1000))
          )
        );
      }),
    cancel: () => enqueue(() => native.cancelAll()),
  };
}
