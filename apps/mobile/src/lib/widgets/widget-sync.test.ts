import { describe, expect, it } from 'vitest';
import {
  createCoalescer,
  createWidgetPusher,
  dropPastEntries,
  KEEP_ALIVE_MS,
  propsChanged,
  type Scheduler,
  selectWidgetNative,
  snapshotTimeline,
  type WidgetEntry,
  WIDGETS_UNAVAILABLE_WARNING,
  withKeepAlive,
} from './widget-sync';

function fakeScheduler() {
  const queue = new Map<number, () => void>();
  let next = 0;
  const scheduler: Scheduler = {
    setTimeout: (run) => {
      next += 1;
      queue.set(next, run);
      return next;
    },
    clearTimeout: (id) => void queue.delete(id),
  };
  const fire = () => {
    const runs = [...queue.values()];
    queue.clear();
    for (const run of runs) run();
  };
  return { scheduler, fire, pending: () => queue.size };
}

interface Label {
  label: string;
}

function setup() {
  const { scheduler, fire, pending } = fakeScheduler();
  const pushed: WidgetEntry<Label>[][] = [];
  let failing = false;
  let builds = 0;
  const pusher = createWidgetPusher<Label, Label>({
    push: (entries) => {
      if (failing) throw new Error('no app group');
      pushed.push(entries);
    },
    changed: propsChanged,
    scheduler,
    debounceMs: 300,
  });
  const offer = (label: string) =>
    pusher.offer({ label }, () => {
      builds += 1;
      return snapshotTimeline({ label }, 0);
    });
  return {
    pusher,
    offer,
    fire,
    pending,
    pushed,
    builds: () => builds,
    fail: (on: boolean) => (failing = on),
  };
}

const at = (ms: number, label: string): WidgetEntry<Label> => ({
  date: new Date(ms),
  props: { label },
});

describe('createWidgetPusher', () => {
  it('pushes the first offer after the debounce, building it only then', () => {
    const t = setup();
    t.offer('a');
    expect(t.pushed).toHaveLength(0);
    expect(t.builds()).toBe(0);
    t.fire();
    expect(t.pushed).toEqual([snapshotTimeline({ label: 'a' }, 0)]);
    expect(t.builds()).toBe(1);
  });

  it('never re-pushes an identical key, and builds nothing for it', () => {
    const t = setup();
    t.offer('a');
    t.fire();
    t.offer('a');
    expect(t.pending()).toBe(0);
    t.fire();
    expect(t.pushed).toHaveLength(1);
    expect(t.builds()).toBe(1);
  });

  it('coalesces a burst into the latest, and a stream cannot starve it', () => {
    const t = setup();
    t.offer('a');
    t.offer('b');
    t.offer('c');
    expect(t.pending()).toBe(1);
    t.fire();
    expect(t.pushed.map((e) => e[0].props.label)).toEqual(['c']);
  });

  it('drops an offer that went back to what was already pushed', () => {
    const t = setup();
    t.offer('a');
    t.fire();
    t.offer('b');
    t.offer('a');
    t.fire();
    expect(t.pushed).toHaveLength(1);
  });

  it('retries after a failed push', () => {
    const t = setup();
    t.fail(true);
    t.offer('a');
    t.fire();
    expect(t.pushed).toHaveLength(0);
    t.fail(false);
    t.offer('a');
    t.fire();
    expect(t.pushed).toHaveLength(1);
  });

  it('flushNow pushes a pending offer at once and cancels the timer', () => {
    const t = setup();
    t.offer('a');
    t.pusher.flushNow();
    expect(t.pushed).toHaveLength(1);
    expect(t.pending()).toBe(0);
    // nothing pending, nothing pushed
    t.pusher.flushNow();
    expect(t.pushed).toHaveLength(1);
  });
});

describe('dropPastEntries', () => {
  const entries = [at(0, 'a'), at(100, 'b'), at(200, 'c')];

  it('keeps the entry current at now and everything after it', () => {
    expect(dropPastEntries(entries, 150).map((e) => e.props.label)).toEqual([
      'b',
      'c',
    ]);
    expect(dropPastEntries(entries, 100).map((e) => e.props.label)).toEqual([
      'b',
      'c',
    ]);
    expect(dropPastEntries(entries, 999).map((e) => e.props.label)).toEqual([
      'c',
    ]);
  });

  it('keeps all of a timeline that has not started', () => {
    expect(dropPastEntries(entries, -5)).toHaveLength(3);
  });
});

describe('withKeepAlive and snapshotTimeline', () => {
  it('appends a copy of the last entry a year after it, or after now', () => {
    const kept = withKeepAlive([at(0, 'a'), at(100, 'b')], 50);
    expect(kept.map((e) => [e.date.getTime(), e.props.label])).toEqual([
      [0, 'a'],
      [100, 'b'],
      [100 + KEEP_ALIVE_MS, 'b'],
    ]);
    const late = withKeepAlive([at(0, 'a')], 5_000);
    expect(late[1].date.getTime()).toBe(5_000 + KEEP_ALIVE_MS);
    expect(withKeepAlive([], 0)).toEqual([]);
  });

  it('dates the keep-alive a year ahead', () => {
    expect(KEEP_ALIVE_MS).toBe(365 * 24 * 60 * 60 * 1000);
  });

  it('a snapshot is now and the keep-alive, same props', () => {
    expect(snapshotTimeline({ label: 'x' }, 7)).toEqual([
      at(7, 'x'),
      at(7 + KEEP_ALIVE_MS, 'x'),
    ]);
  });
});

describe('createCoalescer', () => {
  it('runs once after a burst, then again for the next burst', () => {
    const { scheduler, fire } = fakeScheduler();
    let runs = 0;
    const soon = createCoalescer(() => (runs += 1), 300, scheduler);
    soon();
    soon();
    soon();
    expect(runs).toBe(0);
    fire();
    expect(runs).toBe(1);
    soon();
    fire();
    expect(runs).toBe(2);
  });
});

describe('selectWidgetNative', () => {
  const real = { name: 'real' };
  const noop = { name: 'noop' };

  it('uses the native object when every layout was compiled to a string', () => {
    expect(
      selectWidgetNative(['function(){}', 'function(){}'], () => real, noop)
    ).toEqual({ native: real, warning: null });
  });

  it('falls back to the stand-in with a warning when a layout is still a function', () => {
    let tried = false;
    const choice = selectWidgetNative(
      ['function(){}', () => null],
      () => {
        tried = true;
        return real;
      },
      noop
    );
    expect(choice).toEqual({
      native: noop,
      warning: WIDGETS_UNAVAILABLE_WARNING,
    });
    expect(tried).toBe(false);
  });

  it('falls back when creating the native widgets throws', () => {
    expect(
      selectWidgetNative(
        ['function(){}'],
        () => {
          throw new Error('no module');
        },
        noop
      )
    ).toEqual({ native: noop, warning: WIDGETS_UNAVAILABLE_WARNING });
  });
});
