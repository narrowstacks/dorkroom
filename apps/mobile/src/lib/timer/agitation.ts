// Pure agitation-pattern math for the film-processing timer. No React, no native
// imports — mirrors the header style of `engine.ts`. A pattern describes *when*
// to agitate during a stage; `agitationWindows` is the single source of truth
// that turns a pattern + stage duration into a sorted, non-overlapping list of
// [start, end) windows. Everything else (live indicator state, haptics, display
// text) derives from that list, so the countdown UI and the preset editor never
// reimplement the schedule math.

/** The seven agitation schedules the app understands. `custom` exposes the raw
 * params in the editor; the rest carry canonical params from `AGITATION_PRESETS`. */
export type AgitationPatternId =
  | 'ilford'
  | 'kodak'
  | 'stand'
  | 'semi-stand'
  | 'continuous'
  | 'none'
  | 'custom';

/** Parameters for periodic (and event-based) patterns; `custom` exposes these
 * directly in the editor. Never store `Infinity` here — it doesn't survive
 * JSON round-tripping through the persisted-preset schema. */
export interface AgitationParams {
  /** Continuous agitation for this long at t=0. 0 = none. */
  initialSeconds: number;
  /** Length of each recurring agitation window. 0 = no recurring windows. */
  agitateSeconds: number;
  /** Recurring window starts every `intervalSeconds` after the initial window. */
  intervalSeconds: number;
}

export interface AgitationPattern {
  id: AgitationPatternId;
  /** Only meaningful for `custom`; built-ins carry their canonical params. */
  params: AgitationParams;
}

export interface AgitationWindow {
  startSeconds: number;
  endSeconds: number;
}

export interface AgitationState {
  agitating: boolean;
  /** Seconds left in the active window (0 when not agitating). */
  windowRemainingSeconds: number;
  /** Seconds until the next window starts (null when none remain). */
  nextWindowInSeconds: number | null;
}

/**
 * Canonical params for every built-in (non-custom) pattern. `continuous` and
 * `none` carry all-zero params — `agitationWindows` special-cases their id
 * rather than encoding "whole stage" as an unbounded/Infinity param.
 */
export const AGITATION_PRESETS = {
  ilford: { initialSeconds: 30, agitateSeconds: 10, intervalSeconds: 60 },
  kodak: { initialSeconds: 5, agitateSeconds: 5, intervalSeconds: 30 },
  // Event-based, not periodic: a "single agitation" is a 10s window at the
  // start and (for stand) the end, or start/half/end (semi-stand). Handled as
  // special cases in `agitationWindows`, not the periodic formula below.
  stand: { initialSeconds: 10, agitateSeconds: 10, intervalSeconds: 0 },
  'semi-stand': { initialSeconds: 10, agitateSeconds: 10, intervalSeconds: 0 },
  continuous: { initialSeconds: 0, agitateSeconds: 0, intervalSeconds: 0 },
  none: { initialSeconds: 0, agitateSeconds: 0, intervalSeconds: 0 },
} satisfies Record<Exclude<AgitationPatternId, 'custom'>, AgitationParams>;

/** Clamp a window into `[0, duration]`; return null if it collapses to nothing. */
function clampWindow(
  window: AgitationWindow,
  duration: number
): AgitationWindow | null {
  const start = Math.max(0, Math.min(window.startSeconds, duration));
  const end = Math.max(0, Math.min(window.endSeconds, duration));
  return end > start ? { startSeconds: start, endSeconds: end } : null;
}

/** Sort by start and merge any windows that overlap or touch. */
function mergeWindows(windows: AgitationWindow[]): AgitationWindow[] {
  const sorted = [...windows].sort((a, b) => a.startSeconds - b.startSeconds);
  const merged: AgitationWindow[] = [];
  for (const window of sorted) {
    const last = merged[merged.length - 1];
    if (last && window.startSeconds <= last.endSeconds) {
      last.endSeconds = Math.max(last.endSeconds, window.endSeconds);
    } else {
      merged.push({ ...window });
    }
  }
  return merged;
}

/** Clamp every window into the stage and merge overlaps, dropping empties. */
function clampAndMerge(
  windows: AgitationWindow[],
  duration: number
): AgitationWindow[] {
  const clamped: AgitationWindow[] = [];
  for (const window of windows) {
    const c = clampWindow(window, duration);
    if (c) clamped.push(c);
  }
  return mergeWindows(clamped);
}

/**
 * The periodic formula shared by `ilford`, `kodak`, and `custom`: an initial
 * window at t=0 (if `initialSeconds > 0`), then recurring `agitateSeconds`
 * windows starting at every multiple of `intervalSeconds` that is
 * `>= max(initialSeconds, intervalSeconds)` — i.e. the first recurring window
 * never starts before the initial window ends.
 */
function periodicWindows(
  params: AgitationParams,
  duration: number
): AgitationWindow[] {
  const { initialSeconds, agitateSeconds, intervalSeconds } = params;
  const windows: AgitationWindow[] = [];

  if (initialSeconds > 0) {
    windows.push({ startSeconds: 0, endSeconds: initialSeconds });
  }

  if (agitateSeconds > 0 && intervalSeconds > 0) {
    const firstRecurringStart = Math.max(initialSeconds, intervalSeconds);
    let start =
      Math.ceil(firstRecurringStart / intervalSeconds) * intervalSeconds;
    while (start < duration) {
      windows.push({ startSeconds: start, endSeconds: start + agitateSeconds });
      start += intervalSeconds;
    }
  }

  return windows;
}

/**
 * The single source of truth for a pattern's agitation schedule during a stage
 * of `durationSeconds`. Always returns a sorted, non-overlapping list clamped
 * to `[0, durationSeconds]`.
 */
export function agitationWindows(
  pattern: AgitationPattern,
  durationSeconds: number
): AgitationWindow[] {
  const duration = Number.isFinite(durationSeconds) ? durationSeconds : 0;
  if (duration <= 0) return [];

  const { id, params } = pattern;
  switch (id) {
    case 'none':
      return [];

    case 'continuous':
      return clampAndMerge(
        [{ startSeconds: 0, endSeconds: duration }],
        duration
      );

    case 'stand':
      return clampAndMerge(
        [
          { startSeconds: 0, endSeconds: params.initialSeconds },
          {
            startSeconds: duration - params.agitateSeconds,
            endSeconds: duration,
          },
        ],
        duration
      );

    case 'semi-stand':
      return clampAndMerge(
        [
          { startSeconds: 0, endSeconds: params.initialSeconds },
          {
            startSeconds: duration / 2,
            endSeconds: duration / 2 + params.agitateSeconds,
          },
          {
            startSeconds: duration - params.agitateSeconds,
            endSeconds: duration,
          },
        ],
        duration
      );

    case 'ilford':
    case 'kodak':
    case 'custom':
      return clampAndMerge(periodicWindows(params, duration), duration);

    default:
      return [];
  }
}

/** Derive the live agitation state at `elapsedSeconds` into the stage. */
export function agitationStateAt(
  windows: AgitationWindow[],
  elapsedSeconds: number
): AgitationState {
  const elapsed = Number.isFinite(elapsedSeconds)
    ? Math.max(0, elapsedSeconds)
    : 0;

  const active = windows.find(
    (w) => elapsed >= w.startSeconds && elapsed < w.endSeconds
  );
  if (active) {
    return {
      agitating: true,
      windowRemainingSeconds: active.endSeconds - elapsed,
      nextWindowInSeconds: null,
    };
  }

  const next = windows.find((w) => w.startSeconds > elapsed);
  return {
    agitating: false,
    windowRemainingSeconds: 0,
    nextWindowInSeconds: next ? next.startSeconds - elapsed : null,
  };
}

const AGITATION_LABELS = {
  ilford: 'Ilford',
  kodak: 'Kodak',
  stand: 'Stand',
  'semi-stand': 'Semi-stand',
  continuous: 'Continuous',
  none: 'None',
  custom: 'Custom',
} satisfies Record<AgitationPatternId, string>;

/** Human label for a pattern id, used in the preset editor's pattern picker. */
export function agitationLabel(id: AgitationPatternId): string {
  return AGITATION_LABELS[id];
}

/** Render an interval in seconds as "minute(s)" when it's a whole number of
 * minutes, else as a compact "Ns" — used by `describePeriodicSummary`. */
function describeInterval(seconds: number): string {
  if (seconds === 60) return 'minute';
  if (seconds > 0 && seconds % 60 === 0) return `${seconds / 60} minutes`;
  return `${seconds}s`;
}

/**
 * Short human text for a periodic pattern (`ilford`/`kodak`/`custom`), derived
 * from its params rather than hardcoded per id — e.g. ilford's canonical
 * {30,10,60} reads "First 30s, then 10s every minute"; kodak's {5,5,30} reads
 * "5s every 30s" (initial and recurring windows are the same length, so the
 * "first" window isn't called out separately).
 */
function describePeriodicSummary(params: AgitationParams): string {
  const { initialSeconds, agitateSeconds, intervalSeconds } = params;
  if (agitateSeconds <= 0 || intervalSeconds <= 0) {
    return initialSeconds > 0
      ? `Agitate first ${initialSeconds}s`
      : 'No agitation';
  }
  if (initialSeconds === agitateSeconds) {
    return `${agitateSeconds}s every ${describeInterval(intervalSeconds)}`;
  }
  return `First ${initialSeconds}s, then ${agitateSeconds}s every ${describeInterval(intervalSeconds)}`;
}

/** Short human-readable summary of a pattern's full schedule. */
export function agitationSummary(pattern: AgitationPattern): string {
  switch (pattern.id) {
    case 'ilford':
    case 'kodak':
    case 'custom':
      return describePeriodicSummary(pattern.params);
    case 'stand':
      return 'Once at start, once at end';
    case 'semi-stand':
      return 'Start, halfway, end';
    case 'continuous':
      return 'Continuous';
    case 'none':
      return 'No agitation';
    default:
      return '';
  }
}

function builtinPattern(
  id: Exclude<AgitationPatternId, 'custom'>
): AgitationPattern {
  return { id, params: AGITATION_PRESETS[id] };
}

/**
 * Map a recipe's `agitation_method` (and, failing that, its source tag) to a
 * pattern for the timer prefill. Of 1020 API recipes, 1013 have
 * `agitation_method: null` — for those, the source tag is the only signal;
 * anything that isn't Ilford or Kodak defaults to the Ilford cadence, which is
 * the app's long-standing default schedule text. Case-insensitive.
 */
export function patternFromRecipe(
  agitationMethod: string,
  tags: string[]
): AgitationPattern {
  const method = agitationMethod.trim().toLowerCase();
  if (method === 'stand') return builtinPattern('stand');
  if (method === 'semi-stand' || method === 'semistand') {
    return builtinPattern('semi-stand');
  }
  if (method === 'intermittent') return builtinPattern('ilford');
  if (method === 'continuous' || method === 'rotary') {
    return builtinPattern('continuous');
  }

  const lowerTags = tags.map((t) => t.toLowerCase());
  if (lowerTags.includes('official-ilford')) return builtinPattern('ilford');
  if (lowerTags.includes('official-kodak')) return builtinPattern('kodak');

  return builtinPattern('ilford');
}
