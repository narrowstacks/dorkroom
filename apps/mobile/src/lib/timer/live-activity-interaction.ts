// A button on the Live Activity, handled in one function called straight from
// the native event. The press runs in the app process while iOS may be about to
// suspend it again, so nothing here waits for a React render or the activity's
// debounce: in order it changes the timer, settles the alerts with iOS, then
// updates the activity right away. A press for an activity this process does
// not own (a cold background launch, a run that is gone) does nothing at all.
import type { AlertState } from './background-alerts';
import type { TimerStoreSnapshot } from './timer-store';
import type { TimerAction } from './types';

/** A button on the activity, as the widget names it, to the timer action it asks for. */
export function actionForTarget(target: string): TimerAction | null {
  switch (target) {
    case 'pause':
      return { type: 'PAUSE' };
    case 'resume':
      return { type: 'RESUME' };
    case 'skip':
      return { type: 'NEXT_STAGE' };
    default:
      return null;
  }
}

export interface InteractionDeps {
  /** Whether `source` (the activity id in the event) is the activity this process drives. */
  owns: (source: string) => boolean;
  store: {
    dispatch: (action: TimerAction) => void;
    sync: () => void;
    getSnapshot: () => TimerStoreSnapshot;
  };
  alerts: { ensure: (state: AlertState) => Promise<void> };
  activity: {
    /** Report the store's timer to the activity (cheap, may only queue an update). */
    sync: () => void;
    /** Send the queued update now, bypassing the debounce. Resolves when iOS has it. */
    flushNow: () => Promise<void>;
  };
}

export interface InteractionEvent {
  source: string;
  target: string;
}

export function createInteractionHandler(
  deps: InteractionDeps
): (event: InteractionEvent) => Promise<void> {
  const { owns, store, alerts, activity } = deps;
  return async (event) => {
    if (!owns(event.source)) return;
    const action = actionForTarget(event.target);
    if (action === null) return;
    store.dispatch(action);
    store.sync();
    const { timer, anchorMs } = store.getSnapshot();
    try {
      await alerts.ensure({ timer, anchorMs });
    } finally {
      // Even when the alerts failed, the activity must show the new state.
      activity.sync();
      await activity.flushNow();
    }
  };
}
