// What the Process Timer is developing, so a finished run can offer to save
// itself to a roll ("Save to roll"). In memory only, beside the timer store and
// in the same module-store style as `prefill.ts`: a run does not survive the
// app being killed, and neither does this.
//
// The recipe screen queues a session (the recipe's snapshot and, when it was
// reached from a roll waiting to be developed, that roll) just before it hands
// the recipe to the timer. The session follows the timer store from there:
//
// - The next change of the timer state binds it, if that change loaded the
//   recipe's own stages; any other change drops it (the timer dropped the
//   recipe because a run was going).
// - Once bound, a load of other stages ends it: a preset, an exposure link, or
//   an edit that leaves no develop stage. An edit that keeps a develop stage
//   keeps it (the develop time saved is the one that ran).
// - Reset (a return to idle with the same stages) ends it.
// - `end` ends it by hand: Start last timer restores a stored run, which holds
//   no recipe, so it must not inherit the recipe loaded before it.
//
// Separately it counts runs (each idle to running start is a new run) and
// remembers which run was saved, so one run can be saved at most once.
import type { Combination } from '@dorkroom/api';
import type { RollDevelopmentFields } from '@/schemas/film-log.schema';
import { stagesFromCombination } from './presets';
import { timerStore } from './timer-store';
import type { TimerStage, TimerState } from './types';

/** The recipe's half of a development record, taken when it was started.
 * From the strict field type, so it follows the schema's keys. */
export type RecipeSnapshot = Omit<
  RollDevelopmentFields,
  'developedAt' | 'notes'
>;

export interface DevelopmentSession {
  rollId?: string;
  recipe?: RecipeSnapshot;
}

/** The names a recipe snapshot needs, resolved by the recipe screen. */
export interface RecipeNames {
  filmName?: string;
  developerName?: string;
  dilution?: string;
}

/** The snapshot of a recipe, from its `Combination` and the names the recipe
 * screen shows for it. Non-finite numbers are left out. */
export function recipeSnapshotFrom(
  combination: Combination,
  names: RecipeNames
): RecipeSnapshot {
  const film = names.filmName?.trim();
  const developer = names.developerName?.trim();
  const recipeName =
    film && developer ? `${film} in ${developer}` : combination.name?.trim();
  const recipeId = combination.uuid || String(combination.id);
  return {
    recipeId: recipeId || undefined,
    recipeName: recipeName || undefined,
    developer: developer || undefined,
    dilution: names.dilution?.trim() || undefined,
    temperatureF: Number.isFinite(combination.temperatureF)
      ? combination.temperatureF
      : undefined,
    timeSeconds: Number.isFinite(combination.timeMinutes)
      ? Math.round(combination.timeMinutes * 60)
      : undefined,
    shootingIso: Number.isFinite(combination.shootingIso)
      ? combination.shootingIso
      : undefined,
  };
}

/** The first develop stage of a sequence, if any. */
export function developStage(
  stages: readonly TimerStage[]
): TimerStage | undefined {
  return stages.find((stage) => stage.kind === 'dev');
}

/**
 * The development record for a finished run: the recipe's snapshot when the
 * run came from one, with the develop stage's time and temperature as run
 * (they may have been edited), else only those and the date.
 */
export function developmentRecordFrom(
  recipe: RecipeSnapshot | undefined,
  stages: readonly TimerStage[],
  developedAt: string
): RollDevelopmentFields {
  const dev = developStage(stages);
  return {
    ...recipe,
    developedAt,
    temperatureF: dev?.temperatureF ?? recipe?.temperatureF,
    timeSeconds: dev?.durationSeconds ?? recipe?.timeSeconds,
  };
}

/** Two sequences hold the same stages (ids aside). */
function sameStages(
  a: readonly TimerStage[],
  b: readonly TimerStage[]
): boolean {
  return (
    a.length === b.length &&
    a.every((stage, i) => {
      const other = b[i];
      return (
        other !== undefined &&
        stage.kind === other.kind &&
        stage.name === other.name &&
        stage.durationSeconds === other.durationSeconds &&
        stage.temperatureF === other.temperatureF
      );
    })
  );
}

export interface DevelopmentSessionState {
  /** Queued by the recipe screen, waiting for the timer to load its stages. */
  pending: { session: DevelopmentSession; stages: TimerStage[] } | null;
  /** Bound to the stages the timer holds. */
  active: DevelopmentSession | null;
  /** Runs started since launch; 0 before the first. */
  run: number;
  /** The run that was saved to a roll, and to which. */
  saved: { run: number; rollId: string } | null;
  /** The run whose offer was turned down ("Not now"). */
  dismissedRun: number | null;
  /** Whether the current run actually ran to its end (running or paused to
   * completed). Next tapped through every stage from idle also completes the
   * timer, without a run: that is never offered, nor shown as saved. */
  ranToEnd: boolean;
}

export const INITIAL_SESSION_STATE: DevelopmentSessionState = {
  pending: null,
  active: null,
  run: 0,
  saved: null,
  dismissedRun: null,
  ranToEnd: false,
};

/** Pure: the session after the timer state went from `prev` to `next`.
 * `presetSelected` is whether that change chose a preset chip. */
export function sessionAfterTimerChange(
  state: DevelopmentSessionState,
  prev: TimerState,
  next: TimerState,
  presetSelected: boolean
): DevelopmentSessionState {
  const queued = state.pending;
  const pending = null;
  let { active, run, ranToEnd } = state;
  const loaded = next.stages !== prev.stages;

  if (loaded) {
    if (queued && sameStages(next.stages, queued.stages)) {
      active = queued.session;
    } else if (active) {
      const keeps = !presetSelected && developStage(next.stages) !== undefined;
      if (!keeps) active = null;
    }
  } else if (next.status === 'idle' && prev.status !== 'idle') {
    // Reset, even with a recipe start still queued (dropped above).
    active = null;
  }

  if (prev.status === 'idle' && next.status === 'running') run += 1;
  // A new stage list (a LOAD, even while completed) or a return to idle ends
  // the run `ranToEnd` belongs to.
  if (loaded || next.status === 'idle') ranToEnd = false;
  else if (
    next.status === 'completed' &&
    (prev.status === 'running' || prev.status === 'paused')
  ) {
    ranToEnd = true;
  }

  if (
    pending === state.pending &&
    active === state.active &&
    run === state.run &&
    ranToEnd === state.ranToEnd
  ) {
    return state;
  }
  return { ...state, pending, active, run, ranToEnd };
}

/** The part of the timer store the session needs. */
export interface TimerSource {
  getSnapshot: () => { timer: TimerState; selectedPresetId: string };
  subscribe: (listener: () => void) => () => void;
}

export interface DevelopmentSessionStore {
  getState: () => DevelopmentSessionState;
  subscribe: (listener: () => void) => () => void;
  /** Queue the session for the recipe about to be handed to the timer. */
  start: (combination: Combination, session: DevelopmentSession) => void;
  /** Whether the current run may still be saved (completed, not yet saved). */
  canSave: () => boolean;
  /** Record that the current run was saved to `rollId`. False when it was
   * already saved, or nothing completed: the caller must not write then. */
  markSaved: (rollId: string) => boolean;
  /** End the session and drop a queued one, for stages that belong to no
   * recipe (Start last timer restoring a stored run). */
  end: () => void;
  /** Turn down the offer for the current run ("Not now"). */
  dismiss: () => void;
}

export function createDevelopmentSessionStore(
  timer: TimerSource
): DevelopmentSessionStore {
  let state = INITIAL_SESSION_STATE;
  let last = timer.getSnapshot();
  const listeners = new Set<() => void>();
  const commit = (next: DevelopmentSessionState) => {
    if (next === state) return;
    state = next;
    for (const listener of listeners) listener();
  };

  timer.subscribe(() => {
    const snapshot = timer.getSnapshot();
    const prev = last;
    last = snapshot;
    if (snapshot.timer === prev.timer) return;
    commit(
      sessionAfterTimerChange(
        state,
        prev.timer,
        snapshot.timer,
        snapshot.selectedPresetId !== ''
      )
    );
  });

  const canSave = () =>
    timer.getSnapshot().timer.status === 'completed' &&
    state.ranToEnd &&
    state.run > 0 &&
    state.saved?.run !== state.run;

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start: (combination, session) => {
      commit({
        ...state,
        pending: { session, stages: stagesFromCombination(combination) },
      });
    },
    end: () => {
      if (state.active || state.pending) {
        commit({ ...state, active: null, pending: null });
      }
    },
    canSave,
    markSaved: (rollId) => {
      if (!canSave()) return false;
      commit({ ...state, active: null, saved: { run: state.run, rollId } });
      return true;
    },
    dismiss: () => {
      if (state.dismissedRun !== state.run) {
        commit({ ...state, dismissedRun: state.run });
      }
    },
  };
}

declare global {
  // Fast Refresh re-evaluates this module; a second store would subscribe to
  // the timer again and leave the first one listening. Development only.
  var __dorkroomDevelopmentSession:
    { timer: TimerSource; session: DevelopmentSessionStore } | undefined;
}

function getSession(): DevelopmentSessionStore {
  // Read off `globalThis`: `__DEV__` is Metro's, and vitest does not define
  // it, so a bare reference would throw when a test imports this module.
  // SAFETY: only compared with `true`; any other value, or none, means not
  // development, so the assertion cannot make a wrong value pass.
  if ((globalThis as { __DEV__?: unknown }).__DEV__ !== true) {
    return createDevelopmentSessionStore(timerStore);
  }
  const kept = globalThis.__dorkroomDevelopmentSession;
  // Reused only while it follows the same timer store (a refreshed
  // timer-store module makes a new one).
  if (kept?.timer === timerStore) return kept.session;
  const session = createDevelopmentSessionStore(timerStore);
  globalThis.__dorkroomDevelopmentSession = { timer: timerStore, session };
  return session;
}

/** The app's one session, following the app's one timer. */
export const developmentSession = getSession();
