import { describe, expect, it } from 'vitest';
import { createBackgroundAlerts } from './background-alerts';
import { createTimerState, timerReducer } from './engine';
import {
  actionForTarget,
  createInteractionHandler,
} from './live-activity-interaction';
import type { TimerStoreSnapshot } from './timer-store';
import type { TimerAction, TimerStage, TimerState } from './types';

const T0 = 1_800_000_000_000;
const stage = (id: string, durationSeconds: number): TimerStage => ({
  id,
  kind: 'custom',
  name: id,
  durationSeconds,
  temperatureF: null,
  agitation: null,
  agitationPattern: null,
});
const START: TimerAction = { type: 'START' };

function setup(owned: string | null = 'act-1') {
  const log: string[] = [];
  let timer: TimerState = timerReducer(
    createTimerState([stage('a', 60), stage('b', 30)]),
    START
  );
  const snapshot = (): TimerStoreSnapshot => ({
    timer,
    selectedPresetId: '',
    alertsDenied: false,
    anchorMs: T0,
  });
  const handler = createInteractionHandler({
    owns: (id) => id === owned,
    store: {
      dispatch: (action) => {
        log.push(`dispatch:${action.type}`);
        timer = timerReducer(timer, action);
      },
      sync: () => log.push('sync'),
      getSnapshot: snapshot,
    },
    alerts: {
      ensure: async (state) => {
        log.push(`alerts:${state.timer.status}`);
        // settles later than the call, like a native round trip
        await Promise.resolve();
        log.push('alerts-settled');
      },
    },
    activity: {
      sync: () => log.push('activity-sync'),
      flushNow: async () => {
        log.push('flush');
      },
    },
  });
  return { handler, log, getTimer: () => timer };
}

describe('actionForTarget', () => {
  it('maps the widget buttons to timer actions', () => {
    expect(actionForTarget('pause')).toEqual({ type: 'PAUSE' });
    expect(actionForTarget('resume')).toEqual({ type: 'RESUME' });
    expect(actionForTarget('skip')).toEqual({ type: 'NEXT_STAGE' });
    expect(actionForTarget('__expo_widgets_target_0')).toBeNull();
  });
});

describe('interaction handler', () => {
  it('changes the timer, settles the alerts, then flushes the activity, in that order', async () => {
    const t = setup();
    await t.handler({ source: 'act-1', target: 'pause' });
    expect(t.log).toEqual([
      'dispatch:PAUSE',
      'sync',
      'alerts:paused',
      'alerts-settled',
      'activity-sync',
      'flush',
    ]);
    expect(t.getTimer().status).toBe('paused');
  });

  it('does not touch anything for an activity it does not own', async () => {
    const t = setup('act-1');
    await t.handler({ source: 'someone-else', target: 'pause' });
    expect(t.log).toEqual([]);
    expect(t.getTimer().status).toBe('running');
  });

  it('does not touch anything for a cold background launch with no activity', async () => {
    const t = setup(null);
    await t.handler({ source: 'act-1', target: 'skip' });
    expect(t.log).toEqual([]);
  });

  it('ignores a target it does not know', async () => {
    const t = setup();
    await t.handler({ source: 'act-1', target: 'nope' });
    expect(t.log).toEqual([]);
  });

  it('a double press changes the state once more only where it matters', async () => {
    const t = setup();
    await t.handler({ source: 'act-1', target: 'pause' });
    await t.handler({ source: 'act-1', target: 'pause' });
    // the second press dispatches a no-op: state is the same paused state
    expect(t.getTimer().status).toBe('paused');
    expect(t.log.filter((l) => l === 'dispatch:PAUSE')).toHaveLength(2);
    expect(t.getTimer().remainingSeconds).toBe(60);
  });
});

describe('interaction handler with the real alerts owner', () => {
  it('a double press and the React path asking too schedule and cancel only once', async () => {
    const calls: string[] = [];
    let timer: TimerState = timerReducer(
      createTimerState([stage('a', 60), stage('b', 30)]),
      START
    );
    const alerts = createBackgroundAlerts({
      schedule: async (cues) => {
        calls.push(`schedule:${cues.length}`);
      },
      cancel: async () => {
        calls.push('cancel');
      },
      isActive: () => false,
      now: () => T0,
    });
    const handler = createInteractionHandler({
      owns: () => true,
      store: {
        dispatch: (action) => {
          timer = timerReducer(timer, action);
        },
        sync: () => {},
        getSnapshot: () => ({
          timer,
          selectedPresetId: '',
          alertsDenied: false,
          anchorMs: T0,
        }),
      },
      alerts,
      activity: { sync: () => {}, flushNow: async () => {} },
    });
    await handler({ source: 'a', target: 'pause' });
    await handler({ source: 'a', target: 'pause' });
    // the React effect then runs for the same paused state
    await alerts.ensure({ timer, anchorMs: T0 });
    expect(calls).toEqual(['cancel']);
    await handler({ source: 'a', target: 'resume' });
    await alerts.ensure({ timer, anchorMs: T0 });
    expect(calls).toEqual(['cancel', 'schedule:2']);
  });
});

describe('interaction handler when the alerts fail', () => {
  it('still updates the activity, and the same state is retried next time', async () => {
    const calls: string[] = [];
    let timer: TimerState = timerReducer(
      createTimerState([stage('a', 60), stage('b', 30)]),
      START
    );
    let failing = true;
    const alerts = createBackgroundAlerts({
      schedule: async () => {
        calls.push('schedule');
      },
      cancel: async () => {
        calls.push(failing ? 'cancel-fails' : 'cancel');
        if (failing) throw new Error('iOS refused');
      },
      isActive: () => false,
      now: () => T0,
    });
    const handler = createInteractionHandler({
      owns: () => true,
      store: {
        dispatch: (action) => {
          timer = timerReducer(timer, action);
        },
        sync: () => {},
        getSnapshot: () => ({
          timer,
          selectedPresetId: '',
          alertsDenied: false,
          anchorMs: T0,
        }),
      },
      alerts,
      activity: {
        sync: () => calls.push('activity-sync'),
        flushNow: async () => {
          calls.push('flush');
        },
      },
    });
    await expect(handler({ source: 'a', target: 'pause' })).rejects.toThrow(
      'iOS refused'
    );
    expect(calls).toEqual(['cancel-fails', 'activity-sync', 'flush']);
    // the claim was released: the same paused state asks iOS again
    failing = false;
    await handler({ source: 'a', target: 'pause' });
    expect(calls.filter((c) => c === 'cancel')).toHaveLength(1);
  });
});
