// Pure view model for the tab bar accessory: the running timer as a pill above
// the tab bar on every tab. Built from the same `TimerState` the Live Activity
// is built from, with the same engine helpers, so the pill, the Lock Screen and
// the Dynamic Island agree on which stage is current and how long is left.
import { spokenDuration } from '@/lib/spoken-time';
import { getTool } from '@/lib/tools';
import { totalRemainingSeconds } from './engine';
import { isRunActive } from './timer-store';
import type { TimerState } from './types';

export interface TimerAccessoryModel {
  /** e.g. "Develop" (the current stage's name). */
  stageName: string;
  /** e.g. "Stage 2 of 4"; omitted for a single-stage run. */
  position?: string;
  /** Seconds left in the current stage. */
  stageRemainingSeconds: number;
  /** Seconds left in the whole run. */
  totalRemainingSeconds: number;
  paused: boolean;
  /** Spoken summary for VoiceOver. */
  accessibilityLabel: string;
}

/** Whole seconds, rounded up like the `m:ss` clock, in words ("3 minutes 5 seconds"). */
export function spokenClock(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0;
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins === 0) return spokenDuration(`${secs}s`);
  return spokenDuration(secs === 0 ? `${mins}m` : `${mins}m ${secs}s`);
}

/** What the pill shows, or null when no run is going (no pill then). */
export function timerAccessoryModel(
  timer: TimerState
): TimerAccessoryModel | null {
  if (!isRunActive(timer)) return null;
  const index = timer.currentStageIndex;
  const stage = timer.stages[index];
  if (stage === undefined) return null;

  const stageName = stage.name.trim() || `Stage ${index + 1}`;
  const count = timer.stages.length;
  const position = count > 1 ? `Stage ${index + 1} of ${count}` : undefined;
  const paused = timer.status === 'paused';
  const spoken = [
    stageName,
    position?.toLowerCase(),
    `${spokenClock(timer.remainingSeconds)} left`,
    paused ? 'paused' : undefined,
  ]
    .filter((part) => part !== undefined)
    .join(', ');

  const model: TimerAccessoryModel = {
    stageName,
    stageRemainingSeconds: timer.remainingSeconds,
    totalRemainingSeconds: totalRemainingSeconds(timer),
    paused,
    accessibilityLabel: spoken,
  };
  if (position !== undefined) model.position = position;
  return model;
}

/** VoiceOver label for the pill's body. */
export function accessoryOpenLabel(model: TimerAccessoryModel): string {
  return `Process timer, ${model.accessibilityLabel}.`;
}

/**
 * The model for the latest store state, reused while nothing it shows has
 * changed: the stages, the status, the stage and the whole seconds left. The
 * store moves four times a second, so the pill's two copies redraw once a
 * second instead. Its numbers can then lag the store by under a second, never
 * by a displayed digit (the clock and the spoken time round up the same way).
 */
export function createAccessoryModelSelector(): (
  timer: TimerState
) => TimerAccessoryModel | null {
  let last: { timer: TimerState; model: TimerAccessoryModel | null } | null =
    null;
  return (timer) => {
    if (last !== null) {
      const prev = last.timer;
      if (
        prev === timer ||
        (prev.stages === timer.stages &&
          prev.status === timer.status &&
          prev.currentStageIndex === timer.currentStageIndex &&
          Math.ceil(prev.remainingSeconds) ===
            Math.ceil(timer.remainingSeconds))
      ) {
        return last.model;
      }
    }
    const model = timerAccessoryModel(timer);
    last = { timer, model };
    return model;
  };
}

function timerRoute(): string {
  const tool = getTool('timer');
  if (tool === undefined) throw new Error('The tool manifest has no timer');
  return tool.route;
}

/** The Process Timer's route, from the tool manifest. */
export const TIMER_ROUTE = timerRoute();

/**
 * Where a tap on the pill goes from `current` (the route on screen): the
 * timer, or nowhere when the timer is already showing (no second copy).
 */
export function accessoryTarget(current: string | null): string | null {
  return current === TIMER_ROUTE ? null : TIMER_ROUTE;
}

/** VoiceOver hint for the pill's body: what a tap does, or none when it does nothing. */
export function accessoryOpenHint(current: string | null): string | undefined {
  return accessoryTarget(current) === null ? undefined : 'Opens the timer.';
}
