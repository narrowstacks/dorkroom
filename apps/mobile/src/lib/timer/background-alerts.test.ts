import { describe, expect, it } from 'vitest';
import {
  alertsKey,
  type AlertState,
  createBackgroundAlerts,
} from './background-alerts';
import type { TimerCue } from './cues';
import { createTimerState, timerReducer } from './engine';
import type { TimerAction, TimerStage } from './types';

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

const STAGES = [stage('a', 60), stage('b', 30)];
const START: TimerAction = { type: 'START' };
const state = (...actions: TimerAction[]): AlertState => ({
  timer: [START, ...actions].reduce(timerReducer, createTimerState(STAGES)),
  anchorMs: T0,
});

function setup(active = false) {
  const log: string[] = [];
  let isActive = active;
  const alerts = createBackgroundAlerts({
    schedule: async (cues: TimerCue[]) => {
      log.push(`schedule:${cues.length}`);
    },
    cancel: async () => {
      log.push('cancel');
    },
    isActive: () => isActive,
    now: () => T0,
  });
  return { alerts, log, setActive: (v: boolean) => (isActive = v) };
}

describe('alertsKey', () => {
  it('does not move on a tick but does on a skip, a restart or a resume', () => {
    const running = state();
    const ticked: AlertState = {
      timer: timerReducer(running.timer, { type: 'TICK', seconds: 20 }),
      anchorMs: T0 + 20_000,
    };
    expect(alertsKey(ticked)).toBe(alertsKey(running));
    expect(alertsKey(state({ type: 'NEXT_STAGE' }))).not.toBe(
      alertsKey(running)
    );
    expect(alertsKey(state({ type: 'PAUSE' }))).toBe('stopped');
    const resumedLater: AlertState = {
      ...state({ type: 'PAUSE' }, { type: 'RESUME' }),
      anchorMs: T0 + 5000,
    };
    expect(alertsKey(resumedLater)).not.toBe(alertsKey(running));
  });
});

describe('background alerts', () => {
  it('does nothing while the app is in front', async () => {
    const t = setup(true);
    await t.alerts.ensure(state());
    expect(t.log).toEqual([]);
  });

  it('schedules once for a running state, however many times it is asked', async () => {
    const t = setup();
    await Promise.all([t.alerts.ensure(state()), t.alerts.ensure(state())]);
    await t.alerts.ensure(state());
    expect(t.log).toEqual(['schedule:2']);
  });

  it('cancels once for a stopped state, and reschedules after a resume', async () => {
    const t = setup();
    await t.alerts.ensure(state());
    await t.alerts.ensure(state({ type: 'PAUSE' }));
    await t.alerts.ensure(state({ type: 'PAUSE' }));
    expect(t.log).toEqual(['schedule:2', 'cancel']);
    await t.alerts.ensure({
      ...state({ type: 'PAUSE' }, { type: 'RESUME' }),
      anchorMs: T0 + 3000,
    });
    expect(t.log).toEqual(['schedule:2', 'cancel', 'schedule:2']);
  });

  it('reschedules for a skip while out of the foreground', async () => {
    const t = setup();
    await t.alerts.ensure(state());
    await t.alerts.ensure(state({ type: 'NEXT_STAGE' }));
    expect(t.log).toEqual(['schedule:2', 'schedule:1']);
  });

  it('clears and forgets on foreground, then schedules again after leaving', async () => {
    const t = setup();
    await t.alerts.ensure(state());
    await t.alerts.foreground();
    await t.alerts.ensure(state());
    expect(t.log).toEqual(['schedule:2', 'cancel', 'schedule:2']);
  });

  it('a stop records the stopped key, so a later pause state is not cancelled twice', async () => {
    const t = setup();
    await t.alerts.stop();
    await t.alerts.ensure(state({ type: 'PAUSE' }));
    expect(t.log).toEqual(['cancel']);
  });

  it('releases the claim when iOS fails, so the same state is retried', async () => {
    let fail = true;
    const log: string[] = [];
    const alerts = createBackgroundAlerts({
      schedule: async () => {
        log.push(fail ? 'schedule-fails' : 'schedule');
        if (fail) throw new Error('nope');
      },
      cancel: async () => {},
      isActive: () => false,
      now: () => T0,
    });
    await expect(alerts.ensure(state())).rejects.toThrow('nope');
    fail = false;
    await alerts.ensure(state());
    expect(log).toEqual(['schedule-fails', 'schedule']);
  });

  it('serialises through the queue: a slow stop issued before an ensure cannot land after it', async () => {
    // Same shape as timer-alerts: tasks run in call order, whatever they take.
    const log: string[] = [];
    let queue: Promise<void> = Promise.resolve();
    const enqueue = (name: string, ms: number): Promise<void> => {
      queue = queue.then(async () => {
        await new Promise((resolve) => setTimeout(resolve, ms));
        log.push(name);
      });
      return queue;
    };
    const alerts = createBackgroundAlerts({
      schedule: () => enqueue('schedule', 1),
      cancel: () => enqueue('cancel', 30),
      isActive: () => false,
      now: () => T0,
    });
    await alerts.ensure(state());
    const stopping = alerts.stop();
    const resumed = alerts.ensure({
      ...state({ type: 'PAUSE' }, { type: 'RESUME' }),
      anchorMs: T0 + 5000,
    });
    await Promise.all([stopping, resumed]);
    // stop first (slow), then the later schedule: alerts end up scheduled
    expect(log).toEqual(['schedule', 'cancel', 'schedule']);
  });
});
