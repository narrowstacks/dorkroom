import { describe, expect, it } from 'vitest';
import {
  accessoryOpenHint,
  accessoryOpenLabel,
  accessoryTarget,
  createAccessoryModelSelector,
  spokenClock,
  TIMER_ROUTE,
  timerAccessoryModel,
} from './accessory-model';
import { createTimerState, timerReducer } from './engine';
import { buildActivityProps } from './live-activity-props';
import type { TimerAction, TimerStage, TimerState } from './types';

const stage = (name: string, durationSeconds: number): TimerStage => ({
  id: name,
  kind: 'custom',
  name,
  durationSeconds,
  temperatureF: null,
  agitation: null,
  agitationPattern: null,
});

const FOUR = [
  stage('Develop', 420),
  stage('Stop', 60),
  stage('Fix', 300),
  stage('Wash', 600),
];

function run(stages: TimerStage[], ...actions: TimerAction[]): TimerState {
  return [{ type: 'START' } as const, ...actions].reduce(
    timerReducer,
    createTimerState(stages)
  );
}

describe('timerAccessoryModel', () => {
  it('is null with no run going', () => {
    expect(timerAccessoryModel(createTimerState(FOUR))).toBeNull();
  });

  it('is null once the run has completed', () => {
    const done = run([stage('Develop', 10)], { type: 'TICK', seconds: 11 });
    expect(done.status).toBe('completed');
    expect(timerAccessoryModel(done)).toBeNull();
  });

  it('describes a running stage', () => {
    const timer = run(
      FOUR,
      { type: 'NEXT_STAGE' },
      { type: 'TICK', seconds: 4.5 }
    );
    expect(timerAccessoryModel(timer)).toEqual({
      stageName: 'Stop',
      position: 'Stage 2 of 4',
      stageRemainingSeconds: 55.5,
      totalRemainingSeconds: 955.5,
      paused: false,
      accessibilityLabel: 'Stop, stage 2 of 4, 56 seconds left',
    });
  });

  it('says when the run is paused', () => {
    const timer = run(FOUR, { type: 'TICK', seconds: 115 }, { type: 'PAUSE' });
    const model = timerAccessoryModel(timer);
    expect(model?.paused).toBe(true);
    expect(model?.stageRemainingSeconds).toBe(305);
    expect(model?.accessibilityLabel).toBe(
      'Develop, stage 1 of 4, 5 minutes 5 seconds left, paused'
    );
  });

  it('on the last stage the stage and the run end together', () => {
    const timer = run(
      FOUR,
      { type: 'NEXT_STAGE' },
      { type: 'NEXT_STAGE' },
      { type: 'NEXT_STAGE' },
      { type: 'TICK', seconds: 60 }
    );
    const model = timerAccessoryModel(timer);
    expect(model?.position).toBe('Stage 4 of 4');
    expect(model?.stageRemainingSeconds).toBe(540);
    expect(model?.totalRemainingSeconds).toBe(540);
  });

  it('leaves out the position for a single-stage run', () => {
    const model = timerAccessoryModel(run([stage('Develop', 120)]));
    expect(model).not.toBeNull();
    expect(model).not.toHaveProperty('position');
    expect(model?.accessibilityLabel).toBe('Develop, 2 minutes left');
  });

  it('names a blank stage by its place', () => {
    const model = timerAccessoryModel(run([stage('  ', 30), stage('Fix', 30)]));
    expect(model?.stageName).toBe('Stage 1');
  });

  it('agrees with the Live Activity on the current stage and the end of the run', () => {
    const timer = run(FOUR, { type: 'TICK', seconds: 500 });
    const asOfMs = 1_800_000_000_000;
    const props = buildActivityProps({
      timer,
      asOfMs,
      runId: 'r',
      safelight: false,
      controls: true,
    });
    const model = timerAccessoryModel(timer);
    expect(props?.rows[props.currentRow]?.name).toBe(model?.stageName);
    expect(props?.endMs).toBe(
      asOfMs + (model?.totalRemainingSeconds ?? 0) * 1000
    );
  });
});

describe('spokenClock', () => {
  it('rounds up like the clock and says the units', () => {
    expect(spokenClock(0.2)).toBe('1 second');
    expect(spokenClock(60)).toBe('1 minute');
    expect(spokenClock(61)).toBe('1 minute 1 second');
    expect(spokenClock(0)).toBe('0 seconds');
  });
});

describe('accessoryOpenLabel', () => {
  it('names the pill and speaks the summary', () => {
    const model = timerAccessoryModel(run([stage('Develop', 120)]));
    expect(model && accessoryOpenLabel(model)).toBe(
      'Process timer, Develop, 2 minutes left.'
    );
  });
});

describe('accessoryTarget', () => {
  it('opens the timer from anywhere else', () => {
    expect(TIMER_ROUTE).toBe('/develop/recipes/timer');
    expect(accessoryTarget('/shoot')).toBe(TIMER_ROUTE);
    expect(accessoryTarget('/develop/recipes')).toBe(TIMER_ROUTE);
    expect(accessoryTarget(null)).toBe(TIMER_ROUTE);
  });

  it('does nothing when the timer is already showing', () => {
    expect(accessoryTarget(TIMER_ROUTE)).toBeNull();
  });
});

describe('accessoryOpenHint', () => {
  it('says a tap opens the timer, except on the timer itself', () => {
    expect(accessoryOpenHint('/shoot')).toBe('Opens the timer.');
    expect(accessoryOpenHint(TIMER_ROUTE)).toBeUndefined();
  });
});

describe('createAccessoryModelSelector', () => {
  it('keeps the same model within a displayed second', () => {
    const select = createAccessoryModelSelector();
    const start = run(FOUR);
    const first = select(start);
    expect(select(timerReducer(start, { type: 'TICK', seconds: 0.25 }))).toBe(
      first
    );
    expect(select(timerReducer(start, { type: 'TICK', seconds: 0.75 }))).toBe(
      first
    );
  });

  it('gives a new model when the second, the status or the stage changes', () => {
    const select = createAccessoryModelSelector();
    const start = run(FOUR, { type: 'TICK', seconds: 0.5 });
    const first = select(start);
    const nextSecond = select(
      timerReducer(start, { type: 'TICK', seconds: 1 })
    );
    expect(nextSecond).not.toBe(first);
    expect(nextSecond?.stageRemainingSeconds).toBe(418.5);
    const paused = timerReducer(start, { type: 'PAUSE' });
    expect(select(paused)?.paused).toBe(true);
    expect(
      select(timerReducer(paused, { type: 'NEXT_STAGE' }))?.stageName
    ).toBe('Stop');
  });

  it('gives a new model after LOAD with other stages of the same length', () => {
    const select = createAccessoryModelSelector();
    const first = select(run(FOUR));
    const reloaded = [
      {
        type: 'LOAD',
        stages: FOUR.map((s) => ({ ...s, name: `${s.name} B` })),
      },
      { type: 'START' },
    ] satisfies TimerAction[];
    const next = reloaded.reduce(timerReducer, run(FOUR));
    expect(select(next)).not.toBe(first);
    expect(select(next)?.stageName).toBe('Develop B');
  });

  it('returns the same model for an equal but separate paused snapshot', () => {
    const select = createAccessoryModelSelector();
    const paused = run(FOUR, { type: 'TICK', seconds: 3 }, { type: 'PAUSE' });
    const first = select(paused);
    expect(select({ ...paused })).toBe(first);
  });

  it('gives null once the run is over', () => {
    const select = createAccessoryModelSelector();
    const start = run(FOUR);
    select(start);
    expect(select(timerReducer(start, { type: 'RESET' }))).toBeNull();
  });
});
