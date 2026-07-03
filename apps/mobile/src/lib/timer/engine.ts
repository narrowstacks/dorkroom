// Pure countdown state machine for the film-processing timer. No native deps, no
// React, no timers — the UI owns the clock and dispatches `TICK` with the real
// elapsed delta; this module owns every state transition so it can be unit-tested
// in isolation. See `types.ts` for the data model.
import type {
  StageBoundary,
  TimerAction,
  TimerStage,
  TimerState,
} from './types';

const clampIndex = (index: number, length: number): number =>
  Math.max(0, Math.min(index, Math.max(0, length - 1)));

/** Duration of a single stage, guarded against bad/negative data. */
function stageDuration(stages: TimerStage[], index: number): number {
  const stage = stages[index];
  return stage ? Math.max(0, stage.durationSeconds) : 0;
}

/** Build the initial (idle) state for a sequence of stages. */
export function createTimerState(stages: TimerStage[]): TimerState {
  return {
    stages,
    currentStageIndex: 0,
    remainingSeconds: stageDuration(stages, 0),
    status: stages.length === 0 ? 'completed' : 'idle',
  };
}

/** The stage currently counting down, or undefined if the sequence is empty. */
export function currentStage(state: TimerState): TimerStage | undefined {
  return state.stages[state.currentStageIndex];
}

export function isLastStage(state: TimerState): boolean {
  return state.currentStageIndex >= state.stages.length - 1;
}

/** Seconds elapsed within the current stage. */
export function elapsedInStageSeconds(state: TimerState): number {
  return (
    stageDuration(state.stages, state.currentStageIndex) -
    state.remainingSeconds
  );
}

/** Total runtime of every stage in the sequence. */
export function totalDurationSeconds(stages: TimerStage[]): number {
  return stages.reduce(
    (sum, stage) => sum + Math.max(0, stage.durationSeconds),
    0
  );
}

/** Seconds remaining across the current stage and every stage after it. */
export function totalRemainingSeconds(state: TimerState): number {
  let remaining = state.remainingSeconds;
  for (let i = state.currentStageIndex + 1; i < state.stages.length; i += 1) {
    remaining += stageDuration(state.stages, i);
  }
  return remaining;
}

/**
 * Absolute schedule of every stage relative to timer start (t=0). This is what the
 * notification scheduler needs: schedule a local notification to fire at each
 * `endOffsetSeconds` so stage-boundary alerts work while the app is backgrounded
 * (iOS suspends JS timers in the background — see the deps plan).
 */
export function computeStageSchedule(stages: TimerStage[]): StageBoundary[] {
  const boundaries: StageBoundary[] = [];
  let offset = 0;
  stages.forEach((stage, stageIndex) => {
    const duration = Math.max(0, stage.durationSeconds);
    boundaries.push({
      stageIndex,
      stage,
      startOffsetSeconds: offset,
      endOffsetSeconds: offset + duration,
    });
    offset += duration;
  });
  return boundaries;
}

/** Move to the start of `targetIndex`, completing if it runs past the last stage. */
function goToStage(state: TimerState, targetIndex: number): TimerState {
  if (targetIndex >= state.stages.length) {
    return {
      ...state,
      currentStageIndex: Math.max(0, state.stages.length - 1),
      remainingSeconds: 0,
      status: 'completed',
    };
  }
  const index = clampIndex(targetIndex, state.stages.length);
  return {
    ...state,
    currentStageIndex: index,
    remainingSeconds: stageDuration(state.stages, index),
  };
}

/** Apply `seconds` of elapsed time, carrying overflow across stage boundaries. */
function applyTick(state: TimerState, seconds: number): TimerState {
  if (state.status !== 'running' || seconds <= 0) return state;

  let index = state.currentStageIndex;
  let remaining = state.remainingSeconds - seconds;

  // Carry any overflow into subsequent stages; a single tick may cross several.
  while (remaining <= 0 && index < state.stages.length - 1) {
    index += 1;
    remaining += stageDuration(state.stages, index);
  }

  if (remaining <= 0) {
    // Ran out on the final stage → done.
    return {
      ...state,
      currentStageIndex: Math.max(0, state.stages.length - 1),
      remainingSeconds: 0,
      status: 'completed',
    };
  }

  return { ...state, currentStageIndex: index, remainingSeconds: remaining };
}

/** The single source of truth for timer transitions. */
export function timerReducer(
  state: TimerState,
  action: TimerAction
): TimerState {
  switch (action.type) {
    case 'LOAD':
      return createTimerState(action.stages);

    case 'START':
      // Only meaningful from idle; ignore empty sequences.
      if (state.status !== 'idle' || state.stages.length === 0) return state;
      return { ...state, status: 'running' };

    case 'PAUSE':
      return state.status === 'running'
        ? { ...state, status: 'paused' }
        : state;

    case 'RESUME':
      return state.status === 'paused'
        ? { ...state, status: 'running' }
        : state;

    case 'RESET':
      return createTimerState(state.stages);

    case 'TICK':
      return applyTick(state, action.seconds);

    case 'NEXT_STAGE':
      if (state.status === 'completed') return state;
      return goToStage(state, state.currentStageIndex + 1);

    case 'PREV_STAGE':
      if (state.status === 'completed') return state;
      return goToStage(state, state.currentStageIndex - 1);

    default:
      return state;
  }
}
