// Pure scheduling of the alerts a running timer should deliver: one at every
// stage boundary and one at the start of every agitation window. The notification
// scheduler turns each cue into a local notification while the app is backgrounded.
// No React, no native imports.
import { agitationWindows } from './agitation';
import type { TimerState } from './types';

/** iOS keeps at most 64 pending local notifications per app; stay under it. */
export const MAX_SCHEDULED_CUES = 60;

export type CueKind = 'stage' | 'agitate';

export interface TimerCue {
  kind: CueKind;
  /** Seconds from the moment of `state` until the cue fires. Always > 0. */
  offsetSeconds: number;
  /** The stage the cue belongs to (the one that ends, or the one to agitate). */
  stageIndex: number;
  title: string;
  body: string;
}

/**
 * Upcoming cues for a running `state`, soonest first, capped at `limit`.
 * Every stage end fits within the cap before any agitation start does.
 * A paused, idle or completed timer has none. Agitation windows that start at
 * the very beginning of a stage are folded into the stage-boundary cue.
 */
export function upcomingCues(
  state: TimerState,
  limit: number = MAX_SCHEDULED_CUES
): TimerCue[] {
  if (state.status !== 'running') return [];

  const cues: TimerCue[] = [];
  // Seconds from now until the current stage's start (negative while mid-stage).
  let stageStartOffset =
    state.remainingSeconds -
    Math.max(0, state.stages[state.currentStageIndex]?.durationSeconds ?? 0);

  for (let i = state.currentStageIndex; i < state.stages.length; i += 1) {
    const stage = state.stages[i];
    if (!stage) break;
    const duration = Math.max(0, stage.durationSeconds);

    if (stage.agitationPattern) {
      for (const window of agitationWindows(stage.agitationPattern, duration)) {
        const offset = stageStartOffset + window.startSeconds;
        if (window.startSeconds <= 0 || offset <= 0) continue;
        const length = Math.round(window.endSeconds - window.startSeconds);
        cues.push({
          kind: 'agitate',
          offsetSeconds: offset,
          stageIndex: i,
          title: 'Agitate',
          body: `${stage.name}: agitate for ${length} s`,
        });
      }
    }

    const next = state.stages[i + 1];
    cues.push({
      kind: 'stage',
      offsetSeconds: stageStartOffset + duration,
      stageIndex: i,
      title: next ? `${stage.name} done` : 'Process complete',
      body: next ? `Next: ${next.name}` : `${stage.name} finished`,
    });
    stageStartOffset += duration;
  }

  const bySoonest = (a: TimerCue, b: TimerCue) =>
    a.offsetSeconds - b.offsetSeconds ||
    (a.kind === b.kind ? 0 : a.kind === 'stage' ? -1 : 1);
  const upcoming = cues.filter((cue) => cue.offsetSeconds > 0);
  const cap = Math.max(0, limit);

  // Stage ends (and completion) are the alerts that matter most, so they get
  // their slots first; agitation starts fill whatever is left, soonest first.
  // Otherwise a long stage with frequent agitation could push its own end
  // past the cap.
  const stages = upcoming
    .filter((cue) => cue.kind === 'stage')
    .sort(bySoonest)
    .slice(0, cap);
  const agitations = upcoming
    .filter((cue) => cue.kind === 'agitate')
    .sort(bySoonest)
    .slice(0, cap - stages.length);
  return [...stages, ...agitations].sort(bySoonest);
}
