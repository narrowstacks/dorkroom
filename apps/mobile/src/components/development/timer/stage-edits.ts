// Pure immutable helpers for the preset editor. The editor renders these; the
// list transforms live here so they stay unit-tested and the .tsx is a thin view.
import { createBlankStage } from '@/lib/timer/presets';
import type { TimerStage } from '@/lib/timer/types';

/** Replace the stage at `index` with a patched copy. Out-of-range is a no-op. */
export function updateStageAt(
  stages: TimerStage[],
  index: number,
  patch: Partial<TimerStage>
): TimerStage[] {
  if (index < 0 || index >= stages.length) return stages;
  return stages.map((stage, i) =>
    i === index ? { ...stage, ...patch } : stage
  );
}

/** Remove the stage at `index`. Out-of-range is a no-op. */
export function removeStageAt(
  stages: TimerStage[],
  index: number
): TimerStage[] {
  if (index < 0 || index >= stages.length) return stages;
  return stages.filter((_, i) => i !== index);
}

/** Swap a stage with its neighbour `delta` away (−1 up, +1 down). */
export function moveStage(
  stages: TimerStage[],
  index: number,
  delta: number
): TimerStage[] {
  const target = index + delta;
  if (index < 0 || index >= stages.length) return stages;
  if (target < 0 || target >= stages.length) return stages;
  const next = [...stages];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Append a fresh custom stage with a unique id (stage ids double as React keys, so
 * appending the literal `createBlankStage()` id twice would collide).
 */
export function appendStage(stages: TimerStage[]): TimerStage[] {
  const blank = createBlankStage();
  return [...stages, { ...blank, id: `stage-${stages.length}-${blank.id}` }];
}

/**
 * Combine whole minutes and seconds into a duration in seconds, clamped ≥ 0.
 * Used by the editor's two-stepper duration control.
 */
export function durationFromParts(minutes: number, seconds: number): number {
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return Math.round(safeMinutes) * 60 + Math.round(safeSeconds);
}

export interface DurationParts {
  minutes: number;
  seconds: number;
}

/** Split a duration in seconds into whole-minute and remaining-second parts. */
export function durationToParts(durationSeconds: number): DurationParts {
  const safe = Number.isFinite(durationSeconds)
    ? Math.max(0, Math.round(durationSeconds))
    : 0;
  return { minutes: Math.floor(safe / 60), seconds: safe % 60 };
}
