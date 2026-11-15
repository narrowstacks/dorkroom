import { cutText, type WidgetPalette } from '@/lib/widgets/widget-palette';
// Pure builder of the Process Timer widget's TIMELINE. Unlike a Live Activity,
// a Home Screen widget CAN change on a schedule without the app: WidgetKit
// shows each timeline entry from its date on. So a running run is pushed once
// as one entry per stage, dated at that stage's absolute start, then "Done" at
// the run's end, then the idle state 30 minutes later, and the widget names the
// right stage after every boundary with the app suspended.
//
// Two steps. `timerWidgetSchedule` turns the store's state into the SCHEDULE
// (absolute stage times, status, frozen values): it is what decides whether
// the widget must be told (`timerScheduleChanged`), and it is the same however
// late it is built during an uninterrupted run, so a stage boundary passing is
// not a change. `timerWidgetEntries` turns a schedule into entries at push
// time: entries wholly in the past are dropped (the first entry is the current
// one, which the gallery preview shows) and a keep-alive copy closes it.
//
// The anchoring is the Live Activity's own (`buildActivityProps`: the run's
// absolute start and end from the store's `anchorMs`), so the two surfaces can
// never disagree about when a stage starts.
//
// Zero-length stages are left out of the widget entirely: never an entry,
// never "next", not counted in "Stage n of N". Such a stage is current for no
// time at all, so naming it would announce a stage the user never sees. (The
// Live Activity lists every stage as a row, a 0 s stage included, reading
// 0:00; that is unchanged.)
import { dropPastEntries, withKeepAlive } from '@/lib/widgets/widget-sync';
import { computeStageSchedule } from './engine';
import {
  buildActivityProps,
  DEFAULT_TITLE,
  LIVE_ACTIVITY_URL,
  TIME_TOLERANCE_MS,
} from './live-activity-props';
import type { TimerState } from './types';

/** Matches the `name` of the widget in app.json's `expo-widgets` entry. */
export const TIMER_WIDGET_NAME = 'TimerWidget';

/** A tap opens the Process Timer, the Live Activity's link. */
export const TIMER_WIDGET_URL = LIVE_ACTIVITY_URL;

/** How long "Done" shows after a run ends before the widget goes back to idle. */
export const DONE_SHOWN_MS = 30 * 60 * 1000;

const MAX_STAGE = 24;
const MAX_TITLE = 40;

export type TimerWidgetStatus = 'idle' | 'running' | 'paused' | 'done';

export interface TimerWidgetProps {
  status: TimerWidgetStatus;
  /** The run's title ("Process timer" without one); empty when idle. */
  title: string;
  /** The stage current from this entry's date on; empty when idle or done. */
  stage: string;
  /** 1-based number of `stage` among the stages that take time, and their count. */
  stageNumber: number;
  stageCount: number;
  /** The next stage that takes time, or empty on the last one. */
  next: string;
  /** Absolute interval of `stage` (running only; 0 otherwise). `stageEndMs` is
   * also the "ends 7:42 PM" line, which cannot go stale. */
  stageStartMs: number;
  stageEndMs: number;
  /** Absolute interval of the whole run (running only; 0 otherwise). */
  runStartMs: number;
  runEndMs: number;
  /** Paused only: what is left of the stage and of the run, frozen. */
  frozenStageSeconds: number;
  frozenTotalSeconds: number;
  /** Idle only: "Last: <title>" when the last run had one, else a hint. */
  idleLine: string;
  url: string;
  palette: WidgetPalette;
}

export interface TimerWidgetEntry {
  date: Date;
  props: TimerWidgetProps;
}

export interface TimerWidgetState {
  timer: TimerState;
  /** The preset's name, or null for a recipe or edited run. */
  title: string | null;
  /** The last run started (`last-run.ts`), for the idle line; null when none. */
  lastRun: { title: string | null } | null;
  /**
   * For a completed run: when it ended, if known (the run end last pushed, as
   * the Live Activity's controller does). Else the anchor, when the app saw it.
   */
  finishedAtMs?: number | null;
}

/** A stage that takes time, as the widget shows it. */
export interface ScheduledStage {
  name: string;
  /** Absolute interval while running; 0 otherwise. */
  startMs: number;
  endMs: number;
}

/** Everything the widget will show for a run, independent of when it is built. */
export interface TimerWidgetSchedule {
  status: TimerWidgetStatus;
  title: string;
  /** The idle line: now when idle, after "Done" otherwise. */
  idleLine: string;
  /** The stages that take time, in order. */
  stages: ScheduledStage[];
  /** Paused: index into `stages` of the stage that resumes; else -1. */
  current: number;
  frozenStageSeconds: number;
  frozenTotalSeconds: number;
  /** Running: the run's interval. Done: `runEndMs` is when it finished. */
  runStartMs: number;
  runEndMs: number;
  palette: WidgetPalette;
}

function idleLine(title: string | null | undefined): string {
  const trimmed = title?.trim();
  return trimmed
    ? cutText(`Last: ${trimmed}`, MAX_TITLE)
    : 'Tap to open the timer';
}

function emptySchedule(palette: WidgetPalette): TimerWidgetSchedule {
  return {
    status: 'idle',
    title: '',
    idleLine: '',
    stages: [],
    current: -1,
    frozenStageSeconds: 0,
    frozenTotalSeconds: 0,
    runStartMs: 0,
    runEndMs: 0,
    palette,
  };
}

/** The schedule for the timer as it is at `anchorMs` (the store's anchor). */
export function timerWidgetSchedule(
  state: TimerWidgetState,
  anchorMs: number,
  palette: WidgetPalette
): TimerWidgetSchedule {
  const { timer } = state;
  const activity = buildActivityProps({
    timer,
    asOfMs: anchorMs,
    runId: '',
    title: state.title,
    safelight: false,
    controls: false,
  });
  if (activity === null) {
    return {
      ...emptySchedule(palette),
      idleLine: idleLine(state.lastRun?.title),
    };
  }

  const title = cutText(activity.title || DEFAULT_TITLE, MAX_TITLE);
  const timed = computeStageSchedule(timer.stages).filter(
    (boundary) => boundary.endOffsetSeconds > boundary.startOffsetSeconds
  );
  const running = activity.status === 'running';
  const stages: ScheduledStage[] = timed.map((boundary) => ({
    name: cutText(boundary.stage.name, MAX_STAGE),
    startMs: running
      ? Math.round(activity.startMs + boundary.startOffsetSeconds * 1000)
      : 0,
    endMs: running
      ? Math.round(activity.startMs + boundary.endOffsetSeconds * 1000)
      : 0,
  }));
  const run = {
    ...emptySchedule(palette),
    title,
    // After this run, the idle state names it.
    idleLine: idleLine(state.title),
    stages,
  };

  if (activity.status === 'completed') {
    return {
      ...run,
      status: 'done',
      runEndMs: Math.round(state.finishedAtMs ?? anchorMs),
    };
  }
  if (activity.status === 'paused') {
    // The stage that resumes: the current one, or the next that takes time
    // when a skip left the run paused on a zero-length stage. Past the last
    // timed stage (a trailing 0 s stage, such as a blank one just added),
    // nothing is left to run: show the last timed stage with nothing left.
    const next = timed.findIndex(
      (boundary) => boundary.stageIndex >= timer.currentStageIndex
    );
    const current = next >= 0 ? next : timed.length - 1;
    const resumes = next >= 0 ? timed[next] : undefined;
    let frozenStageSeconds = 0;
    if (resumes?.stageIndex === timer.currentStageIndex) {
      frozenStageSeconds = Math.max(0, timer.remainingSeconds);
    } else if (resumes) {
      frozenStageSeconds = Math.max(0, resumes.stage.durationSeconds);
    }
    return {
      ...run,
      status: 'paused',
      // -1 only for a run with no timed stage at all, which `named` shows as
      // no stage.
      current,
      frozenStageSeconds: Math.round(frozenStageSeconds),
      frozenTotalSeconds: activity.frozenTotalSeconds,
    };
  }
  return {
    ...run,
    status: 'running',
    runStartMs: activity.startMs,
    runEndMs: activity.endMs,
  };
}

function propsFor(schedule: TimerWidgetSchedule): TimerWidgetProps {
  return {
    status: schedule.status,
    title: schedule.title,
    stage: '',
    stageNumber: 0,
    stageCount: schedule.stages.length,
    next: '',
    stageStartMs: 0,
    stageEndMs: 0,
    runStartMs: 0,
    runEndMs: 0,
    frozenStageSeconds: 0,
    frozenTotalSeconds: 0,
    idleLine: '',
    url: TIMER_WIDGET_URL,
    palette: schedule.palette,
  };
}

const named = (stages: readonly ScheduledStage[], index: number) =>
  index < 0
    ? { stage: '', stageNumber: 0, next: '' }
    : {
        stage: stages[index]?.name ?? '',
        stageNumber: index + 1,
        next: stages[index + 1]?.name ?? '',
      };

/**
 * The entries for `schedule` at `nowMs`: past entries dropped, a keep-alive
 * appended. Idle and paused are one entry from now; a run is an entry per
 * stage, "Done" at its end and idle `DONE_SHOWN_MS` after that.
 */
export function timerWidgetEntries(
  schedule: TimerWidgetSchedule,
  nowMs: number
): TimerWidgetEntry[] {
  const base = propsFor(schedule);
  const now = new Date(nowMs);
  const idleAfterRun: TimerWidgetProps = {
    ...base,
    status: 'idle',
    title: '',
    stageCount: 0,
    idleLine: schedule.idleLine,
  };

  if (schedule.status === 'idle') {
    return withKeepAlive([{ date: now, props: idleAfterRun }], nowMs);
  }
  if (schedule.status === 'paused') {
    const props: TimerWidgetProps = {
      ...base,
      ...named(schedule.stages, schedule.current),
      frozenStageSeconds: schedule.frozenStageSeconds,
      frozenTotalSeconds: schedule.frozenTotalSeconds,
    };
    return withKeepAlive([{ date: now, props }], nowMs);
  }

  const entries: TimerWidgetEntry[] = [];
  if (schedule.status === 'running') {
    schedule.stages.forEach((stage, index) => {
      entries.push({
        date: new Date(stage.startMs),
        props: {
          ...base,
          ...named(schedule.stages, index),
          stageStartMs: stage.startMs,
          stageEndMs: stage.endMs,
          runStartMs: schedule.runStartMs,
          runEndMs: schedule.runEndMs,
        },
      });
    });
  }
  const end = schedule.runEndMs;
  entries.push({ date: new Date(end), props: { ...base, status: 'done' } });
  entries.push({ date: new Date(end + DONE_SHOWN_MS), props: idleAfterRun });
  return withKeepAlive(dropPastEntries(entries, nowMs), nowMs);
}

/** The schedule and its entries in one call (tests, previews). */
export function timerWidgetTimeline(
  state: TimerWidgetState,
  anchorMs: number,
  palette: WidgetPalette,
  nowMs: number = anchorMs
): TimerWidgetEntry[] {
  return timerWidgetEntries(
    timerWidgetSchedule(state, anchorMs, palette),
    nowMs
  );
}

const sameInstant = (a: number, b: number) =>
  Math.abs(a - b) <= TIME_TOLERANCE_MS;

/** The schedule with every timestamp zeroed, for the exact part of the comparison. */
const untimed = (schedule: TimerWidgetSchedule): TimerWidgetSchedule => ({
  ...schedule,
  runStartMs: 0,
  runEndMs: 0,
  stages: schedule.stages.map((stage) => ({ ...stage, startMs: 0, endMs: 0 })),
});

/**
 * Whether `next` would show anything `prev` does not, so it must be pushed (a
 * push reloads the widget, which WidgetKit budgets). Keyed on the schedule,
 * never on the entry list: the entries lose their past ones as time passes,
 * which is not a change. Timestamps a tick apart are the same (the Live
 * Activity's tolerance); everything else is compared exactly.
 */
export function timerScheduleChanged(
  prev: TimerWidgetSchedule | null,
  next: TimerWidgetSchedule
): boolean {
  if (prev === null) return true;
  if (JSON.stringify(untimed(prev)) !== JSON.stringify(untimed(next))) {
    return true;
  }
  if (
    !sameInstant(prev.runStartMs, next.runStartMs) ||
    !sameInstant(prev.runEndMs, next.runEndMs)
  ) {
    return true;
  }
  return prev.stages.some((stage, i) => {
    const other = next.stages[i];
    return (
      other === undefined ||
      !sameInstant(stage.startMs, other.startMs) ||
      !sameInstant(stage.endMs, other.endMs)
    );
  });
}
