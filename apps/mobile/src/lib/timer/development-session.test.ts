import { describe, expect, it } from 'vitest';
import { combo } from '@/test/fixtures';
import {
  createDevelopmentSessionStore,
  developmentRecordFrom,
  type RecipeSnapshot,
  recipeSnapshotFrom,
} from './development-session';
import { DEFAULT_BW_PRESET, stagesFromCombination } from './presets';
import { createTimerStore } from './timer-store';
import type { TimerStage } from './types';

const recipe = combo({ uuid: 'c-42', timeMinutes: 9, shootingIso: 800 });

const snapshot: RecipeSnapshot = recipeSnapshotFrom(recipe, {
  filmName: 'Ilford HP5 Plus',
  developerName: 'Kodak D-76',
  dilution: '1+1',
});

/** A timer store with a fake clock and a session following it. The screen's
 * own steps (prefill, preset chips, edits) are replayed as store calls. */
function setup() {
  let t = 1_000_000;
  const timer = createTimerStore(
    DEFAULT_BW_PRESET.stages,
    DEFAULT_BW_PRESET.id,
    () => t
  );
  const session = createDevelopmentSessionStore(timer);
  const totalSeconds = (stages: readonly TimerStage[]) =>
    stages.reduce((sum, stage) => sum + stage.durationSeconds, 0);
  return {
    timer,
    session,
    /** What the recipe screen then the timer screen do for "Start Process Timer". */
    openRecipe(rollId?: string) {
      session.start(recipe, { rollId, recipe: snapshot });
      timer.setSelectedPresetId('');
      timer.dispatch({ type: 'LOAD', stages: stagesFromCombination(recipe) });
    },
    runToEnd() {
      timer.dispatch({ type: 'START' });
      t += totalSeconds(timer.getSnapshot().timer.stages) * 1000 + 1000;
      timer.sync();
    },
    selectPreset() {
      timer.setSelectedPresetId(DEFAULT_BW_PRESET.id);
      timer.dispatch({ type: 'LOAD', stages: DEFAULT_BW_PRESET.stages });
    },
    edit(change: (stages: TimerStage[]) => TimerStage[]) {
      timer.setSelectedPresetId('');
      timer.dispatch({
        type: 'LOAD',
        stages: change([...timer.getSnapshot().timer.stages]),
      });
    },
  };
}

describe('recipeSnapshotFrom', () => {
  it('snapshots the names and the numbers of a recipe', () => {
    expect(snapshot).toEqual({
      recipeId: 'c-42',
      recipeName: 'Ilford HP5 Plus in Kodak D-76',
      developer: 'Kodak D-76',
      dilution: '1+1',
      temperatureF: 68,
      timeSeconds: 540,
      shootingIso: 800,
    });
  });

  it('falls back to the numeric id and the recipe name, leaving unknowns out', () => {
    const bare = recipeSnapshotFrom(
      combo({
        uuid: '',
        id: 7,
        name: 'House recipe',
        temperatureF: Number.NaN,
      }),
      {}
    );
    expect(bare.recipeId).toBe('7');
    expect(bare.recipeName).toBe('House recipe');
    expect(bare.developer).toBeUndefined();
    expect(bare.temperatureF).toBeUndefined();
  });
});

describe('developmentRecordFrom', () => {
  it('takes the recipe snapshot and the develop stage as run', () => {
    const stages = stagesFromCombination(recipe).map((stage) =>
      stage.kind === 'dev'
        ? { ...stage, durationSeconds: 600, temperatureF: 70 }
        : stage
    );
    expect(developmentRecordFrom(snapshot, stages, 'now')).toEqual({
      ...snapshot,
      developedAt: 'now',
      timeSeconds: 600,
      temperatureF: 70,
    });
  });

  it('records only the date and the develop stage for a run without a recipe', () => {
    expect(
      developmentRecordFrom(undefined, DEFAULT_BW_PRESET.stages, 'now')
    ).toEqual({
      developedAt: 'now',
      timeSeconds: DEFAULT_BW_PRESET.stages.find((s) => s.kind === 'dev')
        ?.durationSeconds,
      temperatureF:
        DEFAULT_BW_PRESET.stages.find((s) => s.kind === 'dev')?.temperatureF ??
        undefined,
    });
  });

  it('keeps the recipe temperature when the stage has none', () => {
    const stages = stagesFromCombination(recipe).map((stage) => ({
      ...stage,
      temperatureF: null,
    }));
    expect(developmentRecordFrom(snapshot, stages, 'now').temperatureF).toBe(
      68
    );
  });
});

describe('development session', () => {
  it('binds to the recipe the timer loads and keeps it through the run', () => {
    const s = setup();
    s.openRecipe('roll-1');
    expect(s.session.getState().active).toEqual({
      rollId: 'roll-1',
      recipe: snapshot,
    });
    s.runToEnd();
    expect(s.timer.getSnapshot().timer.status).toBe('completed');
    expect(s.session.getState().active?.rollId).toBe('roll-1');
    expect(s.session.canSave()).toBe(true);
  });

  it('is dropped when the timer did not take the recipe (a run was going)', () => {
    const s = setup();
    s.timer.dispatch({ type: 'START' });
    s.session.start(recipe, { rollId: 'roll-1', recipe: snapshot });
    // The screen drops the prefill; the next change is a tick of the old run.
    s.timer.dispatch({ type: 'TICK', seconds: 1 });
    expect(s.session.getState().pending).toBeNull();
    expect(s.session.getState().active).toBeNull();
  });

  it('ends on a preset, an exposure link or an edit without a develop stage', () => {
    const s = setup();
    s.openRecipe('roll-1');
    s.selectPreset();
    expect(s.session.getState().active).toBeNull();

    s.openRecipe('roll-1');
    s.edit((stages) => stages.filter((stage) => stage.kind !== 'dev'));
    expect(s.session.getState().active).toBeNull();
  });

  it('survives an edit that keeps the develop stage', () => {
    const s = setup();
    s.openRecipe('roll-1');
    s.edit((stages) =>
      stages.map((stage) =>
        stage.kind === 'fix' ? { ...stage, durationSeconds: 120 } : stage
      )
    );
    expect(s.session.getState().active?.rollId).toBe('roll-1');
  });

  it('ends on Reset, mid-run or after completion', () => {
    const s = setup();
    s.openRecipe('roll-1');
    s.timer.dispatch({ type: 'START' });
    s.timer.dispatch({ type: 'RESET' });
    expect(s.session.getState().active).toBeNull();

    s.openRecipe('roll-1');
    s.runToEnd();
    s.timer.dispatch({ type: 'RESET' });
    expect(s.session.getState().active).toBeNull();
  });

  it('ignores a preset chip change that does not load stages', () => {
    const s = setup();
    s.openRecipe('roll-1');
    s.timer.setSelectedPresetId('other');
    expect(s.session.getState().active?.rollId).toBe('roll-1');
  });
});

describe('save guard', () => {
  it('allows one save per completed run', () => {
    const s = setup();
    s.openRecipe('roll-1');
    expect(s.session.canSave()).toBe(false);
    s.runToEnd();
    expect(s.session.markSaved('roll-1')).toBe(true);
    expect(s.session.canSave()).toBe(false);
    expect(s.session.markSaved('roll-2')).toBe(false);
    expect(s.session.getState().saved).toEqual({ run: 1, rollId: 'roll-1' });
    // Saving ends the session.
    expect(s.session.getState().active).toBeNull();
  });

  it('allows the next run to be saved again', () => {
    const s = setup();
    s.runToEnd();
    s.session.markSaved('roll-1');
    s.timer.dispatch({ type: 'RESET' });
    expect(s.session.canSave()).toBe(false);
    s.runToEnd();
    expect(s.session.getState().run).toBe(2);
    expect(s.session.canSave()).toBe(true);
  });

  it('never saves before a run completed', () => {
    const s = setup();
    expect(s.session.markSaved('roll-1')).toBe(false);
    s.timer.dispatch({ type: 'START' });
    expect(s.session.markSaved('roll-1')).toBe(false);
  });

  it('remembers Not now for the run only', () => {
    const s = setup();
    s.runToEnd();
    s.session.dismiss();
    expect(s.session.getState().dismissedRun).toBe(1);
    s.timer.dispatch({ type: 'RESET' });
    s.runToEnd();
    expect(s.session.getState().dismissedRun).not.toBe(
      s.session.getState().run
    );
  });
});

describe('a completion that never ran', () => {
  /** Next tapped through every stage without Start: idle to completed. */
  const skipThroughFromIdle = (s: ReturnType<typeof setup>) => {
    const count = s.timer.getSnapshot().timer.stages.length;
    for (let i = 0; i < count; i += 1) {
      s.timer.dispatch({ type: 'NEXT_STAGE' });
    }
  };

  it('is never offered', () => {
    const s = setup();
    s.runToEnd();
    s.timer.dispatch({ type: 'RESET' });
    skipThroughFromIdle(s);
    expect(s.timer.getSnapshot().timer.status).toBe('completed');
    expect(s.session.getState().ranToEnd).toBe(false);
    expect(s.session.canSave()).toBe(false);
    expect(s.session.markSaved('roll-1')).toBe(false);
  });

  it('is not shown as the saved run after a save and Reset', () => {
    const s = setup();
    s.runToEnd();
    expect(s.session.getState().ranToEnd).toBe(true);
    s.session.markSaved('roll-1');
    s.timer.dispatch({ type: 'RESET' });
    skipThroughFromIdle(s);
    const state = s.session.getState();
    // The card shows "Saved to" only for a run that ran to its end.
    expect(state.saved?.run).toBe(state.run);
    expect(state.ranToEnd).toBe(false);
  });

  it('counts a run paused and then skipped to its end', () => {
    const s = setup();
    s.timer.dispatch({ type: 'START' });
    s.timer.dispatch({ type: 'PAUSE' });
    const count = s.timer.getSnapshot().timer.stages.length;
    for (let i = 0; i < count; i += 1) {
      s.timer.dispatch({ type: 'NEXT_STAGE' });
    }
    expect(s.timer.getSnapshot().timer.status).toBe('completed');
    expect(s.session.canSave()).toBe(true);
  });
});

describe('Reset with a recipe start still queued', () => {
  it('ends the bound session and drops the queued one', () => {
    const s = setup();
    s.openRecipe('roll-1');
    s.timer.dispatch({ type: 'START' });
    // Another recipe is started while the run goes (the timer will refuse it).
    s.session.start(recipe, { rollId: 'roll-2', recipe: snapshot });
    s.timer.dispatch({ type: 'RESET' });
    expect(s.session.getState().pending).toBeNull();
    expect(s.session.getState().active).toBeNull();
  });
});

describe('record types', () => {
  it('rejects a misspelled key where a record is built', () => {
    // @ts-expect-error: `timeSecond` is not a field of the record.
    const bad: RecipeSnapshot = { timeSecond: 60 };
    expect(bad).toBeDefined();
    const record = developmentRecordFrom(undefined, [], 'now');
    // @ts-expect-error: the built record has no index signature.
    expect(record.dilutoin).toBeUndefined();
  });
});

describe('ranToEnd belongs to one run', () => {
  it('stays saved after PREV_STAGE on the completed run (no second offer)', () => {
    const s = setup();
    s.runToEnd();
    expect(s.session.markSaved('roll-1')).toBe(true);
    s.timer.dispatch({ type: 'PREV_STAGE' });
    expect(s.timer.getSnapshot().timer.status).toBe('completed');
    expect(s.session.canSave()).toBe(false);
    expect(s.session.getState().saved?.run).toBe(s.session.getState().run);
  });

  it('is cleared by a LOAD while completed', () => {
    const s = setup();
    s.runToEnd();
    expect(s.session.getState().ranToEnd).toBe(true);
    s.selectPreset();
    expect(s.session.getState().ranToEnd).toBe(false);
    expect(s.session.canSave()).toBe(false);
  });
});
