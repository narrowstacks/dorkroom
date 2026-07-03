import type { Combination } from '@dorkroom/api';
import { describe, expect, it } from 'vitest';
import { totalDurationSeconds } from './engine';
import {
  DEFAULT_BW_PRESET,
  DEFAULT_BW_STAGES,
  parsePresets,
  recipeMinutesToSeconds,
  STANDARD_PROCESS_TEMP_F,
  stagesFromCombination,
  timerPresetsSchema,
} from './presets';

const combination = (overrides: Partial<Combination> = {}): Combination => ({
  id: 1,
  uuid: 'u-1',
  name: 'HP5+ in HC-110',
  filmStockId: 'film-1',
  filmSlug: 'hp5',
  developerId: 'dev-1',
  developerSlug: 'hc-110',
  shootingIso: 400,
  dilutionId: null,
  customDilution: 'B (1:31)',
  temperatureC: 20,
  temperatureF: 68,
  timeMinutes: 7.5,
  agitationMethod: 'Agitate 30s, then 10s/min',
  agitationSchedule: null,
  pushPull: 0,
  tags: null,
  notes: null,
  infoSource: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('DEFAULT_BW_PRESET', () => {
  it('is a develop → stop → fix → wash sequence', () => {
    expect(DEFAULT_BW_STAGES.map((s) => s.kind)).toEqual([
      'dev',
      'stop',
      'fix',
      'wash',
    ]);
  });

  it('runs at the standard 68°F where temperature matters', () => {
    const wash = DEFAULT_BW_STAGES.find((s) => s.kind === 'wash');
    expect(DEFAULT_BW_STAGES[0].temperatureF).toBe(STANDARD_PROCESS_TEMP_F);
    expect(wash?.temperatureF).toBeNull(); // running water, not process-critical
  });

  it('validates against the persistence schema', () => {
    expect(timerPresetsSchema.safeParse([DEFAULT_BW_PRESET]).success).toBe(
      true
    );
  });

  it('has stage durations that sum to the expected total', () => {
    // 7 + 1 + 5 + 10 minutes
    expect(totalDurationSeconds(DEFAULT_BW_STAGES)).toBe(23 * 60);
  });

  it('assigns the Ilford cadence to the dev stage and no agitation to wash', () => {
    const dev = DEFAULT_BW_STAGES.find((s) => s.kind === 'dev');
    const wash = DEFAULT_BW_STAGES.find((s) => s.kind === 'wash');
    expect(dev?.agitationPattern?.id).toBe('ilford');
    expect(wash?.agitationPattern?.id).toBe('none');
  });
});

describe('recipeMinutesToSeconds', () => {
  it('rounds fractional minutes to whole seconds', () => {
    expect(recipeMinutesToSeconds(7.5)).toBe(450);
    expect(recipeMinutesToSeconds(6.25)).toBe(375);
  });

  it('clamps invalid / non-positive values to 0', () => {
    expect(recipeMinutesToSeconds(0)).toBe(0);
    expect(recipeMinutesToSeconds(-3)).toBe(0);
    expect(recipeMinutesToSeconds(Number.NaN)).toBe(0);
  });
});

describe('stagesFromCombination', () => {
  it('prefills the dev stage from the recipe time/temp/agitation', () => {
    const [dev] = stagesFromCombination(combination());
    expect(dev.kind).toBe('dev');
    expect(dev.durationSeconds).toBe(450); // 7.5 min
    expect(dev.temperatureF).toBe(68);
    expect(dev.agitation).toBe('Agitate 30s, then 10s/min');
  });

  it('appends a standard stop/fix/wash tail aligned to the recipe temp', () => {
    const stages = stagesFromCombination(combination({ temperatureF: 75 }));
    expect(stages.map((s) => s.kind)).toEqual(['dev', 'stop', 'fix', 'wash']);
    expect(stages.find((s) => s.kind === 'stop')?.temperatureF).toBe(75);
    expect(stages.find((s) => s.kind === 'fix')?.temperatureF).toBe(75);
  });

  it('falls back to null agitation when the recipe has none', () => {
    const [dev] = stagesFromCombination(combination({ agitationMethod: '' }));
    expect(dev.agitation).toBeNull();
  });

  it('produces a schema-valid sequence', () => {
    const stages = stagesFromCombination(combination());
    expect(
      timerPresetsSchema.safeParse([{ ...DEFAULT_BW_PRESET, stages }]).success
    ).toBe(true);
  });

  it('maps a stand agitation method to the stand pattern', () => {
    const [dev] = stagesFromCombination(
      combination({ agitationMethod: 'stand' })
    );
    expect(dev.agitationPattern?.id).toBe('stand');
  });

  it('falls back to the source tag for the dev pattern when there is no agitation method', () => {
    const [kodak] = stagesFromCombination(
      combination({ agitationMethod: '', tags: ['official-kodak'] })
    );
    expect(kodak.agitationPattern?.id).toBe('kodak');

    const [ilford] = stagesFromCombination(
      combination({ agitationMethod: '', tags: ['official-cinestill'] })
    );
    expect(ilford.agitationPattern?.id).toBe('ilford');
  });
});

describe('parsePresets', () => {
  it('returns [] for undefined / empty / malformed JSON', () => {
    expect(parsePresets(undefined)).toEqual([]);
    expect(parsePresets('')).toEqual([]);
    expect(parsePresets('{not json')).toEqual([]);
  });

  it('returns [] when the shape fails validation', () => {
    expect(parsePresets(JSON.stringify([{ id: 1 }]))).toEqual([]);
  });

  it('round-trips a valid preset array', () => {
    const raw = JSON.stringify([DEFAULT_BW_PRESET]);
    expect(parsePresets(raw)).toEqual([DEFAULT_BW_PRESET]);
  });

  it('parses an old-format preset (no agitationPattern key) with agitationPattern: null', () => {
    const oldStage = {
      id: 'dev',
      kind: 'dev',
      name: 'Develop',
      durationSeconds: 420,
      temperatureF: 68,
      agitation: 'Agitate first 30s, then 10s every minute',
      // No `agitationPattern` key at all — predates this field.
    };
    const oldPreset = {
      id: 'legacy',
      name: 'Legacy preset',
      stages: [oldStage],
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    };
    const parsed = parsePresets(JSON.stringify([oldPreset]));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].stages).toHaveLength(1);
    expect(parsed[0].stages[0].agitationPattern).toBeNull();
  });

  it('parses a stage with a malformed agitationPattern as null, without dropping the array', () => {
    const badStage = {
      id: 'dev',
      kind: 'dev',
      name: 'Develop',
      durationSeconds: 420,
      temperatureF: 68,
      agitation: null,
      agitationPattern: { id: 'bogus' },
    };
    const preset = {
      id: 'malformed',
      name: 'Malformed preset',
      stages: [badStage],
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    };
    const parsed = parsePresets(JSON.stringify([preset]));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].stages).toHaveLength(1);
    expect(parsed[0].stages[0].agitationPattern).toBeNull();
  });
});
