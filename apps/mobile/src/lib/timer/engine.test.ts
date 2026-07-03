import { describe, expect, it } from 'vitest';
import {
  computeStageSchedule,
  createTimerState,
  currentStage,
  elapsedInStageSeconds,
  isLastStage,
  timerReducer,
  totalDurationSeconds,
  totalRemainingSeconds,
} from './engine';
import type { TimerAction, TimerStage, TimerState } from './types';

const stage = (
  id: string,
  durationSeconds: number,
  kind: TimerStage['kind'] = 'custom'
): TimerStage => ({
  id,
  kind,
  name: id,
  durationSeconds,
  temperatureF: null,
  agitation: null,
});

const THREE: TimerStage[] = [
  stage('a', 60, 'dev'),
  stage('b', 30, 'stop'),
  stage('c', 90, 'fix'),
];

/** Reduce a sequence of actions from an initial state. */
const run = (state: TimerState, ...actions: TimerAction[]): TimerState =>
  actions.reduce(timerReducer, state);

describe('createTimerState', () => {
  it('starts idle on the first stage with its full duration', () => {
    expect(createTimerState(THREE)).toEqual({
      stages: THREE,
      currentStageIndex: 0,
      remainingSeconds: 60,
      status: 'idle',
    });
  });

  it('is immediately completed for an empty sequence', () => {
    const state = createTimerState([]);
    expect(state.status).toBe('completed');
    expect(state.remainingSeconds).toBe(0);
  });

  it('guards against a negative stored duration', () => {
    expect(createTimerState([stage('x', -10)]).remainingSeconds).toBe(0);
  });
});

describe('start / pause / resume', () => {
  it('START moves idle → running', () => {
    expect(run(createTimerState(THREE), { type: 'START' }).status).toBe(
      'running'
    );
  });

  it('START is a no-op when not idle', () => {
    const running = run(createTimerState(THREE), { type: 'START' });
    expect(run(running, { type: 'START' })).toBe(running);
  });

  it('START is a no-op for an empty sequence', () => {
    const empty = createTimerState([]);
    expect(run(empty, { type: 'START' }).status).toBe('completed');
  });

  it('PAUSE only applies while running, RESUME only while paused', () => {
    const idle = createTimerState(THREE);
    expect(run(idle, { type: 'PAUSE' })).toBe(idle); // ignored when idle
    const paused = run(idle, { type: 'START' }, { type: 'PAUSE' });
    expect(paused.status).toBe('paused');
    expect(run(paused, { type: 'PAUSE' })).toBe(paused); // ignored when paused
    expect(run(paused, { type: 'RESUME' }).status).toBe('running');
  });
});

describe('TICK', () => {
  const running = run(createTimerState(THREE), { type: 'START' });

  it('decrements remaining within a stage', () => {
    const next = run(running, { type: 'TICK', seconds: 20 });
    expect(next.currentStageIndex).toBe(0);
    expect(next.remainingSeconds).toBe(40);
    expect(next.status).toBe('running');
  });

  it('is ignored when not running', () => {
    const idle = createTimerState(THREE);
    expect(run(idle, { type: 'TICK', seconds: 10 })).toBe(idle);
  });

  it('ignores non-positive deltas', () => {
    expect(run(running, { type: 'TICK', seconds: 0 })).toBe(running);
    expect(run(running, { type: 'TICK', seconds: -5 })).toBe(running);
  });

  it('crosses a single boundary, carrying the overflow into the next stage', () => {
    // 60s stage, tick 70 → 10s consumed into the 30s stop stage.
    const next = run(running, { type: 'TICK', seconds: 70 });
    expect(next.currentStageIndex).toBe(1);
    expect(next.remainingSeconds).toBe(20);
  });

  it('lands exactly on a boundary by advancing to the next stage', () => {
    const next = run(running, { type: 'TICK', seconds: 60 });
    expect(next.currentStageIndex).toBe(1);
    expect(next.remainingSeconds).toBe(30);
  });

  it('crosses multiple short stages in one big tick', () => {
    // 60 + 30 = 90 consumed → into the 90s fix stage with 5s used.
    const next = run(running, { type: 'TICK', seconds: 95 });
    expect(next.currentStageIndex).toBe(2);
    expect(next.remainingSeconds).toBe(85);
  });

  it('completes when time runs out on the final stage', () => {
    const next = run(running, { type: 'TICK', seconds: 1000 });
    expect(next.status).toBe('completed');
    expect(next.currentStageIndex).toBe(2);
    expect(next.remainingSeconds).toBe(0);
  });
});

describe('NEXT_STAGE / PREV_STAGE', () => {
  const running = run(createTimerState(THREE), { type: 'START' });

  it('NEXT_STAGE jumps to the start of the next stage, keeping status', () => {
    const next = run(running, { type: 'NEXT_STAGE' });
    expect(next.currentStageIndex).toBe(1);
    expect(next.remainingSeconds).toBe(30);
    expect(next.status).toBe('running');
  });

  it('NEXT_STAGE on the last stage completes the timer', () => {
    const onLast = run(running, { type: 'NEXT_STAGE' }, { type: 'NEXT_STAGE' });
    const done = run(onLast, { type: 'NEXT_STAGE' });
    expect(done.status).toBe('completed');
    expect(done.remainingSeconds).toBe(0);
  });

  it('NEXT_STAGE skips a partially-elapsed stage cleanly', () => {
    const partial = run(running, { type: 'TICK', seconds: 25 });
    const skipped = run(partial, { type: 'NEXT_STAGE' });
    expect(skipped.currentStageIndex).toBe(1);
    expect(skipped.remainingSeconds).toBe(30);
  });

  it('PREV_STAGE steps back to the start of the previous stage', () => {
    const onSecond = run(running, { type: 'NEXT_STAGE' });
    const back = run(onSecond, { type: 'PREV_STAGE' });
    expect(back.currentStageIndex).toBe(0);
    expect(back.remainingSeconds).toBe(60);
  });

  it('PREV_STAGE on the first stage restarts it', () => {
    const partial = run(running, { type: 'TICK', seconds: 25 });
    const restarted = run(partial, { type: 'PREV_STAGE' });
    expect(restarted.currentStageIndex).toBe(0);
    expect(restarted.remainingSeconds).toBe(60);
  });

  it('NEXT/PREV are ignored once completed', () => {
    const done = run(running, { type: 'TICK', seconds: 1000 });
    expect(run(done, { type: 'NEXT_STAGE' })).toBe(done);
    expect(run(done, { type: 'PREV_STAGE' })).toBe(done);
  });
});

describe('RESET / LOAD', () => {
  it('RESET returns to idle on the first stage', () => {
    const mid = run(
      createTimerState(THREE),
      { type: 'START' },
      { type: 'TICK', seconds: 75 }
    );
    expect(timerReducer(mid, { type: 'RESET' })).toEqual(
      createTimerState(THREE)
    );
  });

  it('LOAD replaces the sequence and resets to idle', () => {
    const replaced = run(run(createTimerState(THREE), { type: 'START' }), {
      type: 'LOAD',
      stages: [stage('only', 10)],
    });
    expect(replaced.stages).toHaveLength(1);
    expect(replaced.status).toBe('idle');
    expect(replaced.remainingSeconds).toBe(10);
  });
});

describe('selectors', () => {
  const running = run(
    createTimerState(THREE),
    { type: 'START' },
    { type: 'TICK', seconds: 20 }
  );

  it('currentStage / isLastStage', () => {
    expect(currentStage(running)?.id).toBe('a');
    expect(isLastStage(running)).toBe(false);
    const onLast = run(running, { type: 'NEXT_STAGE' }, { type: 'NEXT_STAGE' });
    expect(isLastStage(onLast)).toBe(true);
  });

  it('elapsedInStageSeconds', () => {
    expect(elapsedInStageSeconds(running)).toBe(20);
  });

  it('totalDurationSeconds sums all stages', () => {
    expect(totalDurationSeconds(THREE)).toBe(180);
  });

  it('totalRemainingSeconds spans the current and later stages', () => {
    // 40 left in stage a + 30 (b) + 90 (c) = 160
    expect(totalRemainingSeconds(running)).toBe(160);
  });
});

describe('computeStageSchedule', () => {
  it('produces cumulative start/end offsets for notification scheduling', () => {
    expect(computeStageSchedule(THREE)).toEqual([
      {
        stageIndex: 0,
        stage: THREE[0],
        startOffsetSeconds: 0,
        endOffsetSeconds: 60,
      },
      {
        stageIndex: 1,
        stage: THREE[1],
        startOffsetSeconds: 60,
        endOffsetSeconds: 90,
      },
      {
        stageIndex: 2,
        stage: THREE[2],
        startOffsetSeconds: 90,
        endOffsetSeconds: 180,
      },
    ]);
  });

  it('returns an empty schedule for no stages', () => {
    expect(computeStageSchedule([])).toEqual([]);
  });
});
