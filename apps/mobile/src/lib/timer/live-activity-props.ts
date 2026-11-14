// Pure builder for the Process Timer Live Activity's props. The widget runs in
// an isolated runtime with no clock of its own that JS could tick, so every time
// is an absolute wall-clock timestamp and the system's own timer text counts
// down to it with no updates from the app. Nothing here touches native code.
//
// What the widget CAN show without the app: each stage's countdown (its own
// `[startMs, endMs]` interval), the total time left (to `endMs`) and progress
// bars. What it CANNOT do while the app is suspended: change content at a
// scheduled time. So the schedule is rendered as "all stages shown": a finished
// stage reads 0:00, the current one counts down and later ones show their full
// duration, and the emphasis on the current row is as of the last update.
import { ACCENT, PHASE_ACCENT } from '@/theme/accents';
import { RED_LEVEL } from '@/theme/safelight';
import { agitationSummary } from './agitation';
import { computeStageSchedule, totalRemainingSeconds } from './engine';
import type { TimerState } from './types';

/** The canonical deep link a tap on the activity opens (the Process Timer). */
export const LIVE_ACTIVITY_URL = 'dorkroom://develop/recipes/timer';

/** Rows shown: the current stage and the next two. The rest fold into a "+N more" row. */
export const MAX_ROWS = 3;

/** Shown when the run has no preset or recipe name. */
export const DEFAULT_TITLE = 'Process timer';

/** Titles longer than this are cut so one long preset name cannot grow the payload. */
const MAX_TITLE_LENGTH = 40;
const MAX_NAME_LENGTH = 24;
const MAX_NOTE_LENGTH = 48;

export type ActivityStatus = 'running' | 'paused' | 'completed';

export interface ActivityRow {
  /** Stage name, cut to a short length. */
  name: string;
  /** Absolute interval the system countdown and progress bar run over. */
  startMs: number;
  endMs: number;
  /** Seconds shown while paused; 0 when running or done (the system counts, or it is 0:00). */
  frozenSeconds: number;
}

/** Literal colours: the widget cannot import the theme. Hex only. */
export interface ActivityPalette {
  /** Activity background tint. */
  bg: string;
  /** Primary text. */
  ink: string;
  /** Secondary text. */
  inkSecondary: string;
  /** Tertiary text and hints. */
  inkTertiary: string;
  /** The emphasised row, the glyph and progress tint. */
  accent: string;
  /** The empty part of a progress bar. */
  track: string;
}

export interface TimerActivityProps {
  /** Identifies the run; changes whenever a new run starts. */
  runId: string;
  title: string;
  status: ActivityStatus;
  /** Whether the Pause/Resume and Skip buttons are drawn. */
  controls: boolean;
  /** The rows window: the current stage and up to three after it. */
  rows: ActivityRow[];
  /** Stages after the window (the "+N more" line). */
  hiddenAfter: number;
  /** Index into `rows` of the stage that was current at the last update. */
  currentRow: number;
  /** Agitation instruction of the current stage as of the last update, or null. */
  note: string | null;
  /** Wall clock the run was started from (first stage start) and ends at. */
  startMs: number;
  endMs: number;
  /** Total time left while paused; 0 otherwise. */
  frozenTotalSeconds: number;
  /** The timestamp this content describes. */
  asOfMs: number;
  palette: ActivityPalette;
  safelight: boolean;
}

export interface BuildInput {
  timer: TimerState;
  /** The wall-clock time `timer` describes (the store's anchor). */
  asOfMs: number;
  runId: string;
  title?: string | null;
  safelight: boolean;
  controls: boolean;
}

const cut = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}...`;

/** Palette for the normal and the safelight look. Safelight is red levels only. */
export function activityPalette(safelight: boolean): ActivityPalette {
  if (safelight) {
    const red = (level: number) =>
      `#${level.toString(16).padStart(2, '0')}0000`;
    return {
      bg: '#000000',
      ink: red(RED_LEVEL.primary),
      inkSecondary: red(RED_LEVEL.secondary),
      inkTertiary: red(RED_LEVEL.tertiary),
      accent: red(RED_LEVEL.primary),
      track: red(RED_LEVEL.outline),
    };
  }
  return {
    bg: '#0b0b0c',
    ink: '#ffffff',
    inkSecondary: '#d4d4d8',
    inkTertiary: '#8e8e93',
    accent: ACCENT[PHASE_ACCENT.develop],
    track: '#3a3a3c',
  };
}

/** What the current stage asks of the user, as short static text. */
function stageNote(timer: TimerState): string | null {
  const stage = timer.stages[timer.currentStageIndex];
  if (!stage) return null;
  if (stage.agitationPattern) {
    const text = agitationSummary(stage.agitationPattern);
    // "No agitation" is the absence of an instruction, not something to show.
    if (text && stage.agitationPattern.id !== 'none') {
      return cut(`Agitate: ${text}`, MAX_NOTE_LENGTH);
    }
  }
  const freeform = stage.agitation?.trim();
  return freeform ? cut(freeform, MAX_NOTE_LENGTH) : null;
}

/**
 * Props for a run that is `running`, `paused` or `completed` at `asOfMs`.
 * Returns null for an idle timer or one with no stages (no activity then).
 */
export function buildActivityProps(
  input: BuildInput
): TimerActivityProps | null {
  const { timer, asOfMs, runId, safelight, controls } = input;
  if (timer.status === 'idle' || timer.stages.length === 0) return null;

  const status: ActivityStatus = timer.status;
  const completed = status === 'completed';
  const index = timer.currentStageIndex;
  const schedule = computeStageSchedule(timer.stages);
  const current = schedule[index];
  if (!current) return null;

  // Start of the first stage, anchored so the current stage is `elapsed` into
  // its run now. A paused run is anchored the same way: the widget shows frozen
  // numbers, and resuming re-anchors with a fresh update.
  const currentDuration = Math.max(0, current.stage.durationSeconds);
  const elapsed = completed
    ? 0
    : Math.max(0, currentDuration - timer.remainingSeconds);
  const runStartMs = completed
    ? asOfMs - current.endOffsetSeconds * 1000
    : asOfMs - (current.startOffsetSeconds + elapsed) * 1000;

  const remainingTotal = completed ? 0 : totalRemainingSeconds(timer);
  const endMs = completed ? asOfMs : asOfMs + remainingTotal * 1000;

  const windowStart = completed
    ? Math.max(0, schedule.length - MAX_ROWS)
    : index;
  const windowEnd = Math.min(schedule.length, windowStart + MAX_ROWS);
  const rows: ActivityRow[] = schedule
    .slice(windowStart, windowEnd)
    .map((boundary) => {
      const duration = Math.max(0, boundary.stage.durationSeconds);
      const before = boundary.stageIndex < index;
      const isCurrent = boundary.stageIndex === index;
      // Frozen values exist only while paused or done. A running row carries 0
      // so a tick never changes the props (the system counts the interval).
      let frozenSeconds = 0;
      if (status === 'paused') {
        if (before) frozenSeconds = 0;
        else if (isCurrent) frozenSeconds = Math.max(0, timer.remainingSeconds);
        else frozenSeconds = duration;
      }
      return {
        name: cut(boundary.stage.name, MAX_NAME_LENGTH),
        startMs: Math.round(runStartMs + boundary.startOffsetSeconds * 1000),
        endMs: Math.round(runStartMs + boundary.endOffsetSeconds * 1000),
        frozenSeconds: Math.round(frozenSeconds),
      };
    });

  const title = input.title?.trim();
  return {
    runId,
    title: cut(title ? title : DEFAULT_TITLE, MAX_TITLE_LENGTH),
    status,
    controls: controls && !completed,
    rows,
    hiddenAfter: schedule.length - windowEnd,
    currentRow: index - windowStart,
    note: completed ? null : stageNote(timer),
    startMs: Math.round(runStartMs),
    endMs: Math.round(endMs),
    frozenTotalSeconds: status === 'paused' ? Math.round(remainingTotal) : 0,
    asOfMs,
    palette: activityPalette(safelight),
    safelight,
  };
}

/**
 * Timestamps closer than this are the same schedule seen a tick apart. The
 * timer widget's timeline comparison (`widget-timeline.ts`) uses it too.
 */
export const TIME_TOLERANCE_MS = 750;

/**
 * Whether `next` differs from `prev` in anything the widget shows. The clock
 * sampling jitters `asOfMs` and the derived timestamps by a few ms, so those
 * count only past a tolerance; everything else is compared exactly. A tick
 * therefore never reads as a change, and a pause, resume, skip, edit or
 * foreground refresh always does.
 */
export function activityPropsChanged(
  prev: TimerActivityProps | null,
  next: TimerActivityProps
): boolean {
  if (prev === null) return true;
  if (
    prev.runId !== next.runId ||
    prev.title !== next.title ||
    prev.status !== next.status ||
    prev.controls !== next.controls ||
    prev.safelight !== next.safelight ||
    prev.hiddenAfter !== next.hiddenAfter ||
    prev.currentRow !== next.currentRow ||
    prev.note !== next.note ||
    prev.frozenTotalSeconds !== next.frozenTotalSeconds ||
    prev.rows.length !== next.rows.length
  ) {
    return true;
  }
  if (Math.abs(prev.endMs - next.endMs) > TIME_TOLERANCE_MS) return true;
  if (Math.abs(prev.startMs - next.startMs) > TIME_TOLERANCE_MS) return true;
  return prev.rows.some((row, i) => {
    const other = next.rows[i];
    return (
      other === undefined ||
      row.name !== other.name ||
      row.frozenSeconds !== other.frozenSeconds ||
      Math.abs(row.startMs - other.startMs) > TIME_TOLERANCE_MS ||
      Math.abs(row.endMs - other.endMs) > TIME_TOLERANCE_MS
    );
  });
}

/** Seconds after the end of a run that its "Done" state stays on the Lock Screen. */
export const DONE_LINGER_SECONDS = 120;

/**
 * Where the system should stop showing an ended run: a couple of minutes after
 * it finished, or at once if that moment has already passed (the app only got to
 * run again late).
 */
export function dismissalFor(
  finishedAtMs: number,
  nowMs: number
): { kind: 'immediate' } | { kind: 'after'; atMs: number } {
  const at = finishedAtMs + DONE_LINGER_SECONDS * 1000;
  return at <= nowMs ? { kind: 'immediate' } : { kind: 'after', atMs: at };
}

/** The staleDate for a running run: the moment the last stage ends. */
export function staleDateFor(props: TimerActivityProps): number | null {
  return props.status === 'running' ? props.endMs : null;
}
