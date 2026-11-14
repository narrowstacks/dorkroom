import { beforeEach, describe, expect, it } from 'vitest';
import {
  getLastRun,
  isStartLast,
  LAST_RUN_KEY,
  parseLastRun,
  restoredPresetId,
  saveLastRun,
  startLastDecision,
} from './last-run';
import { DEFAULT_BW_PRESET } from './presets';
import { storage } from './presets-storage';

const STAGES = DEFAULT_BW_PRESET.stages;

beforeEach(() => {
  storage.clearAll();
});

describe('last run storage', () => {
  it('is none until a run is saved', () => {
    expect(getLastRun()).toBeNull();
  });

  it('round-trips the stages, preset and title', () => {
    saveLastRun(STAGES, DEFAULT_BW_PRESET.id, DEFAULT_BW_PRESET.name);
    expect(getLastRun()).toEqual({
      stages: STAGES,
      presetId: DEFAULT_BW_PRESET.id,
      title: DEFAULT_BW_PRESET.name,
    });
    saveLastRun(STAGES.slice(0, 1), '', null);
    expect(getLastRun()).toEqual({
      stages: STAGES.slice(0, 1),
      presetId: '',
      title: null,
    });
  });

  it('never saves an empty run', () => {
    saveLastRun(STAGES, '', null);
    saveLastRun([], '', null);
    expect(getLastRun()?.stages).toEqual(STAGES);
  });

  it('degrades to none on anything unreadable', () => {
    expect(parseLastRun(undefined)).toBeNull();
    expect(parseLastRun('')).toBeNull();
    expect(parseLastRun('{not json')).toBeNull();
    expect(parseLastRun('[]')).toBeNull();
    expect(
      parseLastRun(JSON.stringify({ stages: [], presetId: '', title: null }))
    ).toBeNull();
    expect(
      parseLastRun(
        JSON.stringify({ stages: [{ id: 'x' }], presetId: '', title: null })
      )
    ).toBeNull();
    storage.set(LAST_RUN_KEY, '{"stages":5}');
    expect(getLastRun()).toBeNull();
  });
});

describe('isStartLast', () => {
  it('accepts last, any case, trimmed', () => {
    expect(isStartLast('last')).toBe(true);
    expect(isStartLast(' Last ')).toBe(true);
    expect(isStartLast(undefined)).toBe(false);
    expect(isStartLast('')).toBe(false);
    expect(isStartLast('first')).toBe(false);
  });
});

describe('startLastDecision', () => {
  it('starts the last run when nothing is running', () => {
    expect(
      startLastDecision({
        isNewOpening: true,
        runActive: false,
        hasLastRun: true,
      })
    ).toBe('start');
  });

  it('just shows a run that is going', () => {
    expect(
      startLastDecision({
        isNewOpening: true,
        runActive: true,
        hasLastRun: true,
      })
    ).toBe('show-run');
    expect(
      startLastDecision({
        isNewOpening: true,
        runActive: true,
        hasLastRun: false,
      })
    ).toBe('show-run');
  });

  it('leaves the timer idle when nothing was ever run', () => {
    expect(
      startLastDecision({
        isNewOpening: true,
        runActive: false,
        hasLastRun: false,
      })
    ).toBe('nothing-to-start');
  });

  it('ignores an opening already handled (a re-mount or a stale link)', () => {
    expect(
      startLastDecision({
        isNewOpening: false,
        runActive: false,
        hasLastRun: true,
      })
    ).toBe('ignore');
  });
});

describe('restoredPresetId', () => {
  const run = { stages: STAGES, presetId: 'p1', title: 'Mine' };

  it('selects the run preset when it still has the same stages', () => {
    expect(restoredPresetId(run, [{ id: 'p1', stages: STAGES }])).toBe('p1');
  });

  it('selects nothing when the preset is gone or was edited since', () => {
    expect(restoredPresetId(run, [])).toBe('');
    expect(restoredPresetId(run, [{ id: 'p1', stages: STAGES.slice(1) }])).toBe(
      ''
    );
    expect(
      restoredPresetId({ ...run, presetId: '' }, [{ id: '', stages: STAGES }])
    ).toBe('');
  });
});
