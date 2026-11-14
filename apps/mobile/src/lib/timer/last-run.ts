// The last run that was STARTED, kept so "Start last timer" (a Control Center
// control, `dorkroom://develop/recipes/timer?start=last`) can start it again.
// Saved in the timer's MMKV instance whenever a run starts, validated with Zod
// on read: anything unreadable is treated as no last run.
import { z } from 'zod';
import { TIMER_START_LAST } from '@/lib/next-step';
import { timerStageSchema } from './presets';
import { storage } from './presets-storage';
import type { TimerStage } from './types';

export const LAST_RUN_KEY = 'lastRun';

const lastRunSchema = z.object({
  stages: z.array(timerStageSchema).min(1),
  /** The preset the run was started from, '' when the stages were edited or came from a recipe. */
  presetId: z.string(),
  /** The preset's name at the time, for display; null without a preset. */
  title: z.string().nullable(),
});

export type LastRun = z.infer<typeof lastRunSchema>;

/** The stored value, or null when absent or not a valid run. Pure. */
export function parseLastRun(raw: string | undefined): LastRun | null {
  if (raw === undefined || raw === '') return null;
  try {
    const parsed = lastRunSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function getLastRun(): LastRun | null {
  return parseLastRun(storage.getString(LAST_RUN_KEY));
}

export function saveLastRun(
  stages: TimerStage[],
  presetId: string,
  title: string | null
): void {
  if (stages.length === 0) return;
  const run: LastRun = { stages, presetId, title };
  storage.set(LAST_RUN_KEY, JSON.stringify(run));
}

/** Whether the link's `start` param asks for the last run. */
export const isStartLast = (start: string | undefined): boolean =>
  start?.trim().toLowerCase() === TIMER_START_LAST;

/**
 * What a `start=last` opening does:
 * - `start`: no run is going and a last run exists: load it and start it
 * - `show-run`: a run is going: leave it, the screen shows it
 * - `nothing-to-start`: nothing was ever run: the timer stays idle
 * - `ignore`: not a new opening (a re-mount, a stale or repeated link)
 */
export type StartLastDecision =
  'start' | 'show-run' | 'nothing-to-start' | 'ignore';

export function startLastDecision(input: {
  isNewOpening: boolean;
  runActive: boolean;
  hasLastRun: boolean;
}): StartLastDecision {
  if (!input.isNewOpening) return 'ignore';
  if (input.runActive) return 'show-run';
  return input.hasLastRun ? 'start' : 'nothing-to-start';
}

/**
 * The preset chip to select for a restored run: its own preset when it still
 * exists with the same stages, else none (the stages are shown as edited).
 */
export function restoredPresetId(
  run: LastRun,
  presets: readonly { id: string; stages: TimerStage[] }[]
): string {
  if (run.presetId === '') return '';
  const preset = presets.find((p) => p.id === run.presetId);
  return preset !== undefined &&
    JSON.stringify(preset.stages) === JSON.stringify(run.stages)
    ? run.presetId
    : '';
}
