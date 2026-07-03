// Domain types for the film-processing timer. Pure data — no native deps, no UI.
// The timer runs an ordered list of stages (develop → stop → fix → wash, plus any
// custom stages) as a countdown state machine. The reducer in `engine.ts` owns all
// transitions; the UI layer (added later) drives `TICK` from a wall-clock source and
// renders the resulting `TimerState`.

/** The kind of a processing stage. `custom` covers pre-soak, Photo-Flo, etc. */
export type StageKind = 'dev' | 'stop' | 'fix' | 'wash' | 'custom';

/** A single processing step with a fixed duration and optional process reminders. */
export interface TimerStage {
  /** Stable id (used as a React key and for notification identifiers). */
  id: string;
  kind: StageKind;
  /** Display name, e.g. "Develop", "Stop bath". */
  name: string;
  /** Duration of this stage in whole seconds. */
  durationSeconds: number;
  /** Optional target temperature in °F (the recipe/process temp). */
  temperatureF: number | null;
  /** Optional agitation reminder shown while the stage runs. */
  agitation: string | null;
}

/** A named, reorderable sequence of stages, persisted in MMKV. */
export interface TimerPreset {
  id: string;
  name: string;
  stages: TimerStage[];
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
}

/** Lifecycle of the countdown. */
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

/** The full state machine value the reducer maps over. */
export interface TimerState {
  stages: TimerStage[];
  /** Index into `stages` of the stage currently counting down. */
  currentStageIndex: number;
  /** Seconds left in the current stage. */
  remainingSeconds: number;
  status: TimerStatus;
}

/**
 * Actions accepted by `timerReducer`.
 *
 * `TICK` advances wall-clock time by `seconds` (the UI passes the real elapsed
 * delta so the countdown can't drift from accumulated rounding). A tick that
 * overruns the current stage carries the overflow into the next stage, so a
 * single large tick can cross multiple short stages.
 *
 * `NEXT_STAGE` is the manual skip / advance-stage control; `PREV_STAGE` steps
 * back. Both jump to the *start* of the target stage and preserve run/pause.
 */
export type TimerAction =
  | { type: 'LOAD'; stages: TimerStage[] }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' }
  | { type: 'TICK'; seconds: number }
  | { type: 'NEXT_STAGE' }
  | { type: 'PREV_STAGE' };

/** A computed start/end window for one stage, relative to timer start (t=0). */
export interface StageBoundary {
  stageIndex: number;
  stage: TimerStage;
  /** Seconds from timer start to the moment this stage begins. */
  startOffsetSeconds: number;
  /** Seconds from timer start to the moment this stage ends. */
  endOffsetSeconds: number;
}
