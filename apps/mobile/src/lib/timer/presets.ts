// Preset sequences, the default B&W process, and the recipe → stages prefill
// mapping. Pure data + pure builders (no native deps, no MMKV) so it's fully
// unit-tested. The MMKV persistence layer lives in `presets-storage.ts`.
import type { Combination } from '@dorkroom/api';
import { z } from 'zod';
import { AGITATION_PRESETS, patternFromRecipe } from './agitation';
import type { StageKind, TimerPreset, TimerStage } from './types';

/** Standard B&W process temperature: 20 °C === 68 °F. */
export const STANDARD_PROCESS_TEMP_F = 68;

const stageKindSchema = z.enum(['dev', 'stop', 'fix', 'wash', 'custom']);

const agitationParamsSchema = z.object({
  initialSeconds: z.number().nonnegative(),
  agitateSeconds: z.number().nonnegative(),
  intervalSeconds: z.number().nonnegative(),
});

const agitationPatternSchema = z.object({
  id: z.enum([
    'ilford',
    'kodak',
    'stand',
    'semi-stand',
    'continuous',
    'none',
    'custom',
  ]),
  params: agitationParamsSchema,
});

export const timerStageSchema = z.object({
  id: z.string(),
  kind: stageKindSchema,
  name: z.string(),
  durationSeconds: z.number().nonnegative(),
  temperatureF: z.number().nullable(),
  agitation: z.string().nullable(),
  // Old persisted presets predate this field entirely; malformed values (e.g.
  // an unknown id) must not fail the whole stage/array — both cases fall back
  // to `null` (no pattern assigned, the freeform `agitation` text still shows).
  agitationPattern: agitationPatternSchema
    .nullish()
    .transform((v) => v ?? null)
    .catch(null),
});

export const timerPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  stages: z.array(timerStageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const timerPresetsSchema = z.array(timerPresetSchema);

/**
 * Pure: parse a stored JSON string into presets, falling back to [] on bad/corrupt
 * data. Kept here (not in the native storage module) so it's unit-testable.
 */
export function parsePresets(raw: string | undefined): TimerPreset[] {
  if (!raw) return [];
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }
  const result = timerPresetsSchema.safeParse(json);
  return result.success ? result.data : [];
}

const minutes = (m: number): number => Math.round(m * 60);

/**
 * The non-develop tail of a standard B&W process (stop → fix → wash). Reused both
 * by the default preset and by the recipe prefill, which only knows the dev step.
 * `tempF` lets the prefill align the wet chemistry with the recipe's temperature.
 */
function bwTailStages(tempF: number | null): TimerStage[] {
  return [
    {
      id: 'stop',
      kind: 'stop',
      name: 'Stop bath',
      durationSeconds: minutes(1),
      temperatureF: tempF,
      agitation: 'Continuous',
      agitationPattern: {
        id: 'continuous',
        params: AGITATION_PRESETS.continuous,
      },
    },
    {
      id: 'fix',
      kind: 'fix',
      name: 'Fixer',
      durationSeconds: minutes(5),
      temperatureF: tempF,
      agitation: 'First 30s, then 10s every minute',
      agitationPattern: { id: 'ilford', params: AGITATION_PRESETS.ilford },
    },
    {
      id: 'wash',
      kind: 'wash',
      name: 'Wash',
      durationSeconds: minutes(10),
      // Wash is running water; temperature isn't process-critical.
      temperatureF: null,
      agitation: 'Running water',
      agitationPattern: { id: 'none', params: AGITATION_PRESETS.none },
    },
  ];
}

/** A ready-to-run default B&W sequence (develop → stop → fix → wash). */
export const DEFAULT_BW_STAGES: TimerStage[] = [
  {
    id: 'dev',
    kind: 'dev',
    name: 'Develop',
    durationSeconds: minutes(7),
    temperatureF: STANDARD_PROCESS_TEMP_F,
    agitation: 'First 30s, then 10s every minute',
    agitationPattern: { id: 'ilford', params: AGITATION_PRESETS.ilford },
  },
  ...bwTailStages(STANDARD_PROCESS_TEMP_F),
];

/** The built-in default preset, always offered alongside user-saved presets. */
export const DEFAULT_BW_PRESET: TimerPreset = {
  id: 'default-bw',
  name: 'B&W (standard)',
  stages: DEFAULT_BW_STAGES,
  createdAt: '1970-01-01T00:00:00.000Z',
  updatedAt: '1970-01-01T00:00:00.000Z',
};

/** Round a recipe time (minutes, possibly fractional) to whole seconds, clamped ≥0. */
export function recipeMinutesToSeconds(timeMinutes: number): number {
  if (!Number.isFinite(timeMinutes) || timeMinutes <= 0) return 0;
  return Math.round(timeMinutes * 60);
}

/**
 * Build a full stage sequence from a development recipe (a `Combination`): the dev
 * stage is prefilled from the recipe's time/temp/agitation, then a standard
 * stop/fix/wash tail (aligned to the recipe temperature) is appended. The result
 * is a starting point — every stage stays editable in the UI.
 */
export function stagesFromCombination(combination: Combination): TimerStage[] {
  const tempF = Number.isFinite(combination.temperatureF)
    ? combination.temperatureF
    : null;
  const devStage: TimerStage = {
    id: 'dev',
    kind: 'dev',
    name: 'Develop',
    durationSeconds: recipeMinutesToSeconds(combination.timeMinutes),
    temperatureF: tempF,
    agitation: combination.agitationMethod || null,
    agitationPattern: patternFromRecipe(
      combination.agitationMethod,
      combination.tags ?? []
    ),
  };
  return [devStage, ...bwTailStages(tempF)];
}

/** A blank stage with sensible defaults, for the "add custom stage" UI affordance. */
export function createBlankStage(kind: StageKind = 'custom'): TimerStage {
  return {
    id: kind,
    kind,
    name: '',
    durationSeconds: 0,
    temperatureF: null,
    agitation: null,
    agitationPattern: null,
  };
}
