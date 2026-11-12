import { describe, expect, it } from 'vitest';
import { createTimerState, timerReducer } from './engine';
import {
  type ActivityHandle,
  createLiveActivityController,
  createTitleResolver,
  type EndPolicy,
  type LiveActivityNative,
  NOOP_NATIVE,
  type Scheduler,
  selectNative,
  type SyncInput,
} from './live-activity-controller';
import {
  LIVE_ACTIVITY_URL,
  type TimerActivityProps,
} from './live-activity-props';
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

const STAGES = [stage('a', 60), stage('b', 30)];

const after = (state: TimerState, ...actions: TimerAction[]): TimerState =>
  actions.reduce(timerReducer, state);

const running = (): TimerState =>
  after(createTimerState(STAGES), { type: 'START' });

interface Call {
  kind: 'start' | 'update' | 'end';
  id: string;
  props: TimerActivityProps | null;
  stale?: number | null;
  policy?: EndPolicy;
}

function fakeNative(
  options: { failStart?: boolean; failUpdate?: boolean } = {}
) {
  const calls: Call[] = [];
  const live = new Map<string, ActivityHandle>();
  let counter = 0;
  const make = (id: string): ActivityHandle => ({
    id,
    update: async (props, stale) => {
      calls.push({ kind: 'update', id, props, stale });
      if (options.failUpdate) throw new Error('gone');
    },
    end: async (policy, props) => {
      calls.push({ kind: 'end', id, props, policy });
      live.delete(id);
    },
  });
  const native: LiveActivityNative = {
    start: (props, url, stale) => {
      if (options.failStart) throw new Error('disabled');
      expect(url).toBe(LIVE_ACTIVITY_URL);
      counter += 1;
      const handle = make(`act-${counter}`);
      live.set(handle.id, handle);
      calls.push({ kind: 'start', id: handle.id, props, stale });
      return handle;
    },
    list: () => [...live.values()],
  };
  return { native, calls, live, seed: (id: string) => live.set(id, make(id)) };
}

/** A scheduler the test fires by hand. */
function manualScheduler() {
  const tasks = new Map<number, () => void>();
  let next = 0;
  const scheduler: Scheduler = {
    setTimeout: (run) => {
      next += 1;
      tasks.set(next, run);
      return next;
    },
    clearTimeout: (handle) => {
      tasks.delete(handle);
    },
  };
  return {
    scheduler,
    pending: () => tasks.size,
    fire: () => {
      const all = [...tasks.values()];
      tasks.clear();
      for (const run of all) run();
    },
  };
}

function setup(
  options: Parameters<typeof fakeNative>[0] = {},
  now: () => number = () => T0
) {
  const fake = fakeNative(options);
  const timers = manualScheduler();
  const controller = createLiveActivityController({
    native: fake.native,
    controls: true,
    now,
    scheduler: timers.scheduler,
  });
  const input = (timer: TimerState, asOfMs = T0): SyncInput => ({
    timer,
    asOfMs,
    title: null,
    safelight: false,
  });
  return { ...fake, ...timers, controller, input };
}

describe('live activity controller', () => {
  it('starts one activity when a run starts, with a stale date at its end', async () => {
    const t = setup();
    t.controller.sync(t.input(running()));
    await t.controller.idle();
    expect(t.calls).toHaveLength(1);
    expect(t.calls[0]).toMatchObject({ kind: 'start', stale: T0 + 90_000 });
  });

  it('starts nothing for an idle timer', async () => {
    const t = setup();
    t.controller.sync(t.input(createTimerState(STAGES)));
    await t.controller.idle();
    expect(t.calls).toEqual([]);
  });

  it('never updates on a tick', async () => {
    const t = setup();
    const timer = running();
    t.controller.sync(t.input(timer));
    for (let s = 1; s <= 20; s += 1) {
      const ticked = after(timer, { type: 'TICK', seconds: s });
      t.controller.sync(t.input(ticked, T0 + s * 1000));
    }
    expect(t.pending()).toBe(0);
    t.fire();
    await t.controller.idle();
    expect(t.calls.map((c) => c.kind)).toEqual(['start']);
  });

  it('updates once for a pause, with the stale date cleared', async () => {
    const t = setup();
    const timer = running();
    t.controller.sync(t.input(timer));
    t.controller.sync(t.input(after(timer, { type: 'PAUSE' })));
    t.fire();
    await t.controller.idle();
    expect(t.calls.map((c) => c.kind)).toEqual(['start', 'update']);
    expect(t.calls[1]).toMatchObject({ kind: 'update', stale: null });
    expect(t.calls[1].props?.status).toBe('paused');
  });

  it('collapses a burst of changes into the latest update', async () => {
    const t = setup();
    const timer = running();
    t.controller.sync(t.input(timer));
    t.controller.sync(t.input(after(timer, { type: 'PAUSE' })));
    t.controller.sync(t.input(after(timer, { type: 'NEXT_STAGE' })));
    t.controller.sync(
      t.input(after(timer, { type: 'NEXT_STAGE' }, { type: 'PAUSE' }))
    );
    expect(t.pending()).toBe(1);
    t.fire();
    await t.controller.idle();
    const updates = t.calls.filter((c) => c.kind === 'update');
    expect(updates).toHaveLength(1);
    expect(updates[0].props?.status).toBe('paused');
    expect(updates[0].props?.rows[0].name).toBe('b');
  });

  it('skips an update that matches what was already sent', async () => {
    const t = setup();
    const timer = running();
    t.controller.sync(t.input(timer));
    t.controller.sync(t.input(after(timer, { type: 'PAUSE' })));
    t.fire();
    t.controller.sync(t.input(after(timer, { type: 'PAUSE' })));
    expect(t.pending()).toBe(0);
    await t.controller.idle();
    expect(t.calls.filter((c) => c.kind === 'update')).toHaveLength(1);
  });

  it('ends at once on reset and cancels a queued update', async () => {
    const t = setup();
    const timer = running();
    t.controller.sync(t.input(timer));
    t.controller.sync(t.input(after(timer, { type: 'PAUSE' })));
    t.controller.sync(t.input(createTimerState(STAGES)));
    expect(t.pending()).toBe(0);
    await t.controller.idle();
    expect(t.calls.map((c) => c.kind)).toEqual(['start', 'end']);
    expect(t.calls[1].policy).toEqual({ kind: 'immediate' });
    expect(t.live.size).toBe(0);
  });

  it('ends a finished run with its Done state, lingering two minutes', async () => {
    const t = setup({}, () => T0 + 90_000);
    const timer = running();
    t.controller.sync(t.input(timer));
    const done = after(timer, { type: 'TICK', seconds: 90 });
    t.controller.sync(t.input(done, T0 + 90_000));
    await t.controller.idle();
    const end = t.calls[1];
    expect(end.kind).toBe('end');
    expect(end.policy).toEqual({ kind: 'after', atMs: T0 + 90_000 + 120_000 });
    expect(end.props?.status).toBe('completed');
  });

  it('ends at once when the app only noticed the finish long after', async () => {
    let clock = T0;
    const t = setup({}, () => clock);
    const timer = running();
    t.controller.sync(t.input(timer));
    clock = T0 + 3_600_000;
    const done = after(timer, { type: 'TICK', seconds: 3600 });
    t.controller.sync(t.input(done, clock));
    await t.controller.idle();
    expect(t.calls[1].policy).toEqual({ kind: 'immediate' });
  });

  it('lingers from the Skip when a run paused on its last stage is skipped long after', async () => {
    let clock = T0;
    const t = setup({}, () => clock);
    const lastStage = after(running(), { type: 'NEXT_STAGE' });
    t.controller.sync(t.input(lastStage));
    const paused = after(lastStage, { type: 'PAUSE' });
    t.controller.sync(t.input(paused));
    t.fire();
    clock = T0 + 600_000;
    const skipped = after(paused, { type: 'NEXT_STAGE' });
    expect(skipped.status).toBe('completed');
    t.controller.sync(t.input(skipped, clock));
    await t.controller.idle();
    const end = t.calls.at(-1);
    expect(end?.kind).toBe('end');
    expect(end?.policy).toEqual({ kind: 'after', atMs: clock + 120_000 });
  });

  it('starts a fresh activity for the next run after one ends', async () => {
    const t = setup();
    const timer = running();
    t.controller.sync(t.input(timer));
    t.controller.sync(t.input(createTimerState(STAGES)));
    t.controller.sync(t.input(timer, T0 + 5000));
    await t.controller.idle();
    const starts = t.calls.filter((c) => c.kind === 'start');
    expect(starts).toHaveLength(2);
    expect(starts[0].props?.runId).not.toBe(starts[1].props?.runId);
    expect(t.live.size).toBe(1);
  });

  it('is silent and stays out of the way when starting fails', async () => {
    const t = setup({ failStart: true });
    const timer = running();
    t.controller.sync(t.input(timer));
    t.controller.sync(t.input(after(timer, { type: 'PAUSE' })));
    t.fire();
    await t.controller.idle();
    expect(t.calls).toEqual([]);
    expect(t.pending()).toBe(0);
  });

  it('does not bring back an activity the user dismissed', async () => {
    const t = setup({ failUpdate: true });
    const timer = running();
    t.controller.sync(t.input(timer));
    t.controller.sync(t.input(after(timer, { type: 'PAUSE' })));
    t.fire();
    await t.controller.idle();
    t.controller.sync(t.input(after(timer, { type: 'NEXT_STAGE' })));
    t.fire();
    await t.controller.idle();
    expect(t.calls.map((c) => c.kind)).toEqual(['start', 'update']);
  });

  it('ends every orphan at launch, and only those', async () => {
    const t = setup();
    t.seed('old-1');
    t.seed('old-2');
    const finished = t.controller.endOrphans();
    t.controller.sync(t.input(running()));
    await finished;
    await t.controller.idle();
    const ended = t.calls.filter((c) => c.kind === 'end').map((c) => c.id);
    expect(ended.sort()).toEqual(['old-1', 'old-2']);
    expect([...t.live.keys()]).toEqual(['act-1']);
  });

  it('flushNow sends the queued update at once, without the debounce', async () => {
    const t = setup();
    const timer = running();
    t.controller.sync(t.input(timer));
    t.controller.sync(t.input(after(timer, { type: 'PAUSE' })));
    expect(t.pending()).toBe(1);
    await t.controller.flushNow();
    expect(t.pending()).toBe(0);
    expect(t.calls.map((c) => c.kind)).toEqual(['start', 'update']);
    expect(t.calls[1].props?.status).toBe('paused');
    // nothing queued: a second flush does nothing
    await t.controller.flushNow();
    expect(t.calls).toHaveLength(2);
  });

  it('does nothing for a background launch with no run: no end, no update', async () => {
    const t = setup();
    t.seed('left-over');
    // what a cold launch sees: an idle timer and no handle
    t.controller.sync(t.input(createTimerState(STAGES)));
    await t.controller.flushNow();
    expect(t.calls).toEqual([]);
    expect([...t.live.keys()]).toEqual(['left-over']);
    expect(t.controller.owns('left-over')).toBe(false);
  });

  it('knows which activity it drives', () => {
    const t = setup();
    expect(t.controller.owns('act-1')).toBe(false);
    t.controller.sync(t.input(running()));
    expect(t.controller.owns('act-1')).toBe(true);
    expect(t.controller.owns('other')).toBe(false);
  });
});

describe('selectNative', () => {
  const real = fakeNative().native;
  // The layout the Babel transform produced: a string at runtime.
  const compiled = 'function(){}';

  it('uses the real native object when the layout is compiled', () => {
    expect(selectNative(compiled, () => real)).toEqual({
      native: real,
      warning: null,
    });
  });

  it('falls back, without trying, when the layout is still a function (stale Metro)', () => {
    let tried = false;
    const choice = selectNative(
      () => ({ banner: null }),
      () => {
        tried = true;
        return real;
      }
    );
    expect(tried).toBe(false);
    expect(choice.native).toBe(NOOP_NATIVE);
    expect(choice.warning).toContain('--clear');
  });

  it('falls back when the native module throws (dev client without expo-widgets)', () => {
    const choice = selectNative(compiled, () => {
      throw new Error('Cannot find native module');
    });
    expect(choice.native).toBe(NOOP_NATIVE);
    expect(choice.warning).toContain('rebuild');
  });

  it('the stand-in never starts or lists anything, and the controller stays silent', async () => {
    expect(NOOP_NATIVE.list()).toEqual([]);
    const controller = createLiveActivityController({
      native: NOOP_NATIVE,
      controls: true,
    });
    controller.sync({
      timer: running(),
      asOfMs: T0,
      title: null,
      safelight: false,
    });
    await controller.idle();
    expect(controller.owns('x')).toBe(false);
  });
});

describe('createTitleResolver', () => {
  it('looks up once per selected id', () => {
    let lookups = 0;
    const resolve = createTitleResolver((id) => {
      lookups += 1;
      return id === 'a' ? 'Tri-X' : null;
    });
    expect(resolve('a')).toBe('Tri-X');
    expect(resolve('a')).toBe('Tri-X');
    expect(resolve('a')).toBe('Tri-X');
    expect(lookups).toBe(1);
    expect(resolve('')).toBeNull();
    expect(lookups).toBe(1);
    expect(resolve('b')).toBeNull();
    expect(lookups).toBe(2);
  });
});
