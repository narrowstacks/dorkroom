import { describe, expect, it, vi } from 'vitest';
import { createTimerStore, isRunActive } from './timer-store';
import type { TimerStage } from './types';

const stage = (id: string, durationSeconds: number): TimerStage => ({
  id,
  kind: 'custom',
  name: id,
  durationSeconds,
  temperatureF: null,
  agitation: null,
  agitationPattern: null,
});

const setup = () => {
  let t = 1_000_000;
  const store = createTimerStore(
    [stage('a', 60), stage('b', 30)],
    'p1',
    () => t
  );
  return {
    store,
    advance: (ms: number) => {
      t += ms;
    },
  };
};

describe('timer store', () => {
  it('counts from the wall clock, not from how often it is polled', () => {
    const { store, advance } = setup();
    store.dispatch({ type: 'START' });
    advance(75_000);
    // One poll after a 75 s suspension lands in stage b, 15 s in.
    store.sync();
    const { timer } = store.getSnapshot();
    expect(timer.currentStageIndex).toBe(1);
    expect(timer.remainingSeconds).toBe(15);
  });

  it('does not count idle or paused time', () => {
    const { store, advance } = setup();
    advance(30_000);
    store.dispatch({ type: 'START' });
    advance(10_000);
    store.dispatch({ type: 'PAUSE' });
    advance(600_000);
    store.sync();
    expect(store.getSnapshot().timer.remainingSeconds).toBe(50);
    store.dispatch({ type: 'RESUME' });
    advance(5_000);
    store.sync();
    expect(store.getSnapshot().timer.remainingSeconds).toBe(45);
  });

  it('applies elapsed time before a skip so nothing is lost', () => {
    const { store, advance } = setup();
    store.dispatch({ type: 'START' });
    advance(20_000);
    store.dispatch({ type: 'NEXT_STAGE' });
    advance(5_000);
    store.sync();
    expect(store.getSnapshot().timer.currentStageIndex).toBe(1);
    expect(store.getSnapshot().timer.remainingSeconds).toBe(25);
  });

  it('keeps the same run for a subscriber that mounts later', () => {
    const { store, advance } = setup();
    store.dispatch({ type: 'START' });
    advance(10_000);
    store.sync();
    // A screen remounting just reads the snapshot again.
    expect(store.getSnapshot().timer.remainingSeconds).toBe(50);
    expect(isRunActive(store.getSnapshot().timer)).toBe(true);
  });

  it('notifies only on change and keeps the snapshot stable otherwise', () => {
    const { store } = setup();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const before = store.getSnapshot();
    store.sync();
    store.dispatch({ type: 'PAUSE' });
    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(before);
    store.setSelectedPresetId('p2');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.setAlertsDenied(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
