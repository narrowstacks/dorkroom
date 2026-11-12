import {
  clean,
  directedSteps,
  isOnGrid,
  resolveScrubStart,
  resolveStep,
  SCRUB_PX_PER_STEP,
  scrubbedText,
  scrubOutcome,
  type ScrubStep,
  stepOnce,
  stepsFromTranslation,
} from '@/components/scrub/scrub-value';

/**
 * The ruler's bookkeeping as a pure reducer.
 *
 * Ticks live in a fixed coordinate system: an ORIGIN value sits at index 0 and
 * the tick `i` steps away is at `x = i * 10` px, found by walking the same step
 * function the scrub uses (so adaptive steps are still 10px each). The window
 * of ticks that is rendered can change at any time with no position
 * correction, because a tick's position never depends on the window. The only
 * moving part is one translate, and the value under the centre indicator is
 * the one at index `-translate / 10`.
 *
 * The origin is replaced only when the step or bounds change, or when a value
 * typed from outside lands more than `ROOM_CAP` steps away. Every other change
 * (a drag, a nudge, a typed value near the origin) moves the translate and
 * leaves the ticks exactly where they were. During a drag the UI thread owns
 * the live position; the reducer's `translate` then is informational, and
 * uses the same formula so the settle at the end is a few px at most.
 */

/** Labels closer than this (px) are thinned to a round multiple. */
export const RULER_MIN_LABEL_GAP = 40;

/** Most steps looked ahead to find how far a bound is. */
const ROOM_CAP = 5000;

export interface RulerTick {
  value: number;
  /** Steps from the origin. */
  index: number;
  /** Pixels from the origin; higher values are to the right. */
  x: number;
  major: boolean;
  /** Text above a major tick, or `null` for none. No unit. */
  label: string | null;
}

export interface RulerConfig {
  step: ScrubStep;
  min: number;
  max: number;
  parse: (text: string) => number | null;
  format: (value: number, step: number) => string;
  /** Width of the strip in px; 0 before it has been measured. */
  width: number;
}

export interface Located {
  /** The grid point at or just below the value. */
  grid: number;
  /** How far past it, in steps (0 when on the grid). */
  frac: number;
}

/** The grid point at or below `value`, and the fraction of a step past it. */
export function locate(value: number, step: ScrubStep): Located {
  const size = resolveStep(step, value);
  const q = value / size;
  if (isOnGrid(value, size))
    return { grid: clean(Math.round(q) * size), frac: 0 };
  const low = Math.floor(q);
  return { grid: clean(low * size), frac: q - low };
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** The step multiple that is a "round" tick, for ruler majors. */
export function majorEveryFor(size: number): number {
  const parts = 1 / size;
  for (const n of [2, 3, 4]) {
    if (Math.abs(parts - n) < 1e-6) return n;
  }
  return 5;
}

/** Labels go on every Nth major, N chosen from 1, 2, 5, 10... so they sit at
 * least `RULER_MIN_LABEL_GAP` apart. */
export function labelEveryFor(majorEvery: number): number {
  const gap = majorEvery * SCRUB_PX_PER_STEP;
  for (const n of [1, 2, 5, 10, 20, 50, 100]) {
    if (n * gap >= RULER_MIN_LABEL_GAP) return n;
  }
  return 100;
}

const isWhole = (n: number): boolean => Math.abs(n - Math.round(n)) < 1e-6;

export interface WindowInput {
  origin: number;
  step: ScrubStep;
  min: number;
  max: number;
  /** First and last step index to render, from the origin. */
  lo: number;
  hi: number;
}

interface Point {
  value: number;
  index: number;
}

/**
 * The ticks for steps `lo..hi` from the origin: one per step, 10px apart, lower
 * values to the left, none outside `min`..`max`. Majors sit on a round grid
 * (`majorEveryFor`), and only every Nth of them is labelled so labels never
 * crowd. Ticks keep their position whatever the window, so a new window needs
 * no correction. A bound that falls between two grid points gets its own minor,
 * unlabelled tick at its true fractional position, so a value clamped to it
 * rests on a tick.
 */
export function rulerWindowTicks({
  origin,
  step,
  min,
  max,
  lo,
  hi,
}: WindowInput): RulerTick[] {
  const make = (value: number, index: number): RulerTick => {
    const size = resolveStep(step, value);
    const every = majorEveryFor(size);
    const unit = every * size;
    const major = isWhole(value / unit);
    const labelled = major && isWhole(value / (labelEveryFor(every) * unit));
    const decimals = Math.min(String(size).split('.')[1]?.length ?? 0, 2);
    return {
      value,
      index,
      x: index * SCRUB_PX_PER_STEP,
      major,
      label: labelled ? String(Number(value.toFixed(decimals))) : null,
    };
  };
  // Every grid point from the origin out to the window, plus the first one
  // past each bound so a bound between two grid points can be placed.
  const points: Point[] = [{ value: origin, index: 0 }];
  let value = origin;
  for (let i = 1; i <= hi; i += 1) {
    const { next } = stepOnce(value, 1, step);
    if (next <= value) break;
    value = next;
    points.push({ value, index: i });
    if (value > max) break;
  }
  value = origin;
  for (let i = -1; i >= lo; i -= 1) {
    const { next } = stepOnce(value, -1, step);
    if (next >= value) break;
    value = next;
    points.push({ value, index: i });
    if (value < min) break;
  }
  points.sort((a, b) => a.index - b.index);

  const out: RulerTick[] = [];
  for (const p of points) {
    if (p.index >= lo && p.index <= hi && p.value >= min && p.value <= max) {
      out.push(make(p.value, p.index));
    }
  }
  for (let k = 0; k + 1 < points.length; k += 1) {
    const a = points[k];
    const b = points[k + 1];
    for (const bound of [min, max]) {
      if (!(a.value < bound && bound < b.value)) continue;
      const fraction = (bound - a.value) / (b.value - a.value);
      const index = a.index + fraction * (b.index - a.index);
      if (index < lo || index > hi) continue;
      out.push({
        value: bound,
        index,
        x: index * SCRUB_PX_PER_STEP,
        major: false,
        label: null,
      });
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

export interface IndexWindow {
  lo: number;
  hi: number;
}

/** The window around position `p`: two strip widths each side, so a fast fling
 * never outruns the rendered ticks between the steps JS hears about. */
function windowAround(p: number, width: number): IndexWindow {
  const reach = (width * 2) / SCRUB_PX_PER_STEP;
  return { lo: Math.floor(p - reach), hi: Math.ceil(p + reach) };
}

/** Widens the window once the overscan beyond the strip drops under one width
 * on either side. */
function ensureWindow(state: RulerState, width: number): RulerState {
  if (width <= 0) return state;
  const p = -state.translate / SCRUB_PX_PER_STEP;
  const half = width / 2 / SCRUB_PX_PER_STEP;
  const spare = width / SCRUB_PX_PER_STEP;
  if (
    p - half - state.windowLo >= spare &&
    state.windowHi - (p + half) >= spare
  ) {
    return state;
  }
  const { lo, hi } = windowAround(p, width);
  return { ...state, windowLo: lo, windowHi: hi };
}

/** Where the line sits for a position, in px. `+ 0` turns -0 into 0. */
const translateOf = (index: number): number => -index * SCRUB_PX_PER_STEP + 0;

/** Steps from `origin` to the grid point `grid`, found by walking the step
 * function; `null` when it is farther than `ROOM_CAP` or not on this grid. */
export function gridIndex(
  origin: number,
  grid: number,
  step: ScrubStep
): number | null {
  if (Math.abs(grid - origin) < 1e-7) return 0;
  const direction = grid > origin ? 1 : -1;
  let value = origin;
  for (let i = 1; i <= ROOM_CAP; i += 1) {
    const { next } = stepOnce(value, direction, step);
    if (direction > 0 ? next <= value : next >= value) return null;
    if (Math.abs(next - grid) < 1e-7) return direction * i;
    if (direction > 0 ? next > grid : next < grid) return null;
    value = next;
  }
  return null;
}

/** Position of `value` in steps from `origin`, fractional between ticks, or
 * `null` when it is farther than `ROOM_CAP` steps. */
export function positionOf(
  origin: number,
  value: number,
  step: ScrubStep
): number | null {
  const { grid, frac } = locate(value, step);
  const steps = gridIndex(origin, grid, step);
  return steps === null ? null : steps + frac;
}

interface Session {
  startText: string;
  /** The value the drag began at, NOT held inside the bounds: a start outside
   * them steps from where it really is, so the first step toward the range
   * lands on the bound. */
  startValue: number;
  /** Which side of the range the start is on, if outside it. */
  outside: 'below' | 'above' | null;
  /** Position of the shown value (held inside the bounds), in steps from the
   * origin. */
  startIndex: number;
  /** `lastParsed` as the drag began, restored whenever the text is back at the
   * start so a drag out and back leaves nothing behind. */
  startLastParsed: number | null;
  /** Whether this session has written a text yet. */
  wrote: boolean;
  /** The last text this session wrote. */
  lastText: string;
}

export interface RulerState {
  origin: number;
  /** Counts re-origins. */
  originSeq: number;
  /** Position of the shown value, in steps from the origin (may be fractional
   * while the value is between two ticks). */
  index: number;
  /** The text the machine believes is shown. */
  text: string;
  lastParsed: number | null;
  /** Where the line sits, in px. Informational during a drag (the UI thread
   * owns the live position), exact at rest. */
  translate: number;
  /** The translate range a drag may cover from the current origin, in px:
   * `minTranslate` is the highest reachable value. Bounds farther than
   * `ROOM_CAP` steps (or infinite) are capped that far from the rest position. */
  minTranslate: number;
  maxTranslate: number;
  /** Positions of the bounds from the origin, `null` when infinite or far. */
  lowBound: number | null;
  highBound: number | null;
  /** Unique texts the machine asked the row to write that may still echo back.
   * Never ordered: an echo is recognised by being in here, not by position. */
  written: string[];
  /** Whether the most recent external text equalled `text`: the newest write
   * has come back, so nothing older can still be on its way. */
  echoSettled: boolean;
  session: Session | null;
  windowLo: number;
  windowHi: number;
  /** The text this event asks the row to write, if any. Sync events (external,
   * config, layout) never set it. */
  write: string | null;
  /** The step and bounds the grid was built for. */
  gridKey: { step: ScrubStep; min: number; max: number };
}

/** Events about the outside world. They never write. */
export type SyncRulerEvent =
  { type: 'external'; text: string } | { type: 'config' } | { type: 'layout' };

/** Events from the user. They may write. */
export type ActRulerEvent =
  | { type: 'start' }
  | { type: 'move'; dx: number }
  | { type: 'end' }
  | { type: 'nudge'; direction: 1 | -1 };

export type RulerEvent = SyncRulerEvent | ActRulerEvent;

/** Most written texts remembered. */
const WRITTEN_CAP = 64;

const isInteger = (n: number) => Math.abs(n - Math.round(n)) < 1e-9;

/** Where `applied` value steps from `startIndex` land. The first step from a
 * position between two ticks goes to the next tick that way. */
export function indexAfter(startIndex: number, applied: number): number {
  if (applied === 0) return startIndex;
  const whole = isInteger(startIndex);
  if (applied > 0) {
    return (
      (whole ? Math.round(startIndex) : Math.ceil(startIndex)) +
      applied -
      (whole ? 0 : 1)
    );
  }
  return (
    (whole ? Math.round(startIndex) : Math.floor(startIndex)) +
    applied +
    (whole ? 0 : 1)
  );
}

/** Refreshes the drag range for the state's origin, bounds and rest position. */
function withReach(state: RulerState): RulerState {
  const low = Math.min(state.lowBound ?? state.index - ROOM_CAP, state.index);
  const high = Math.max(state.highBound ?? state.index + ROOM_CAP, state.index);
  const minTranslate = translateOf(high);
  const maxTranslate = translateOf(low);
  if (
    minTranslate === state.minTranslate &&
    maxTranslate === state.maxTranslate
  ) {
    return state;
  }
  return { ...state, minTranslate, maxTranslate };
}

const finish = (state: RulerState, width: number): RulerState =>
  ensureWindow(withReach(state), width);

interface ResolvedText {
  lastParsed: number | null;
  /** The value to show, held inside the bounds. */
  value: number;
}

function resolveText(
  state: RulerState,
  text: string,
  config: RulerConfig
): ResolvedText {
  const parsed = config.parse(text);
  const valid = parsed !== null && Number.isFinite(parsed);
  const lastParsed = valid ? parsed : state.lastParsed;
  const start = resolveScrubStart({
    parsed,
    lastParsed,
    min: config.min,
    max: config.max,
  });
  // Out of range, the ruler shows the bound: ticks up to it, never blank.
  return { lastParsed, value: clamp(start, config.min, config.max) };
}

/** Lays the ruler out afresh around `text`: a new origin on the grid, with the
 * shown value offset by its fraction of a step. */
function reOrigin(
  state: RulerState,
  text: string,
  config: RulerConfig,
  written: string[] = []
): RulerState {
  const { lastParsed, value } = resolveText(state, text, config);
  const { grid, frac } = locate(value, config.step);
  const bound = (b: number) =>
    Number.isFinite(b) ? positionOf(grid, b, config.step) : null;
  return finish(
    {
      origin: grid,
      originSeq: state.originSeq + 1,
      index: frac,
      text,
      lastParsed,
      translate: translateOf(frac),
      minTranslate: Number.NaN,
      maxTranslate: Number.NaN,
      lowBound: bound(config.min),
      highBound: bound(config.max),
      written,
      echoSettled: true,
      session: null,
      windowLo: 0,
      windowHi: -1,
      write: null,
      gridKey: { step: config.step, min: config.min, max: config.max },
    },
    config.width
  );
}

/** Moves to `text` without touching the origin; `null` when the value is
 * farther than `ROOM_CAP` steps from it. */
function placeAtOrigin(
  state: RulerState,
  text: string,
  config: RulerConfig,
  written: string[]
): RulerState | null {
  const { lastParsed, value } = resolveText(state, text, config);
  const index = positionOf(state.origin, value, config.step);
  if (index === null) return null;
  return finish(
    {
      ...state,
      text,
      lastParsed,
      index,
      translate: translateOf(index),
      written,
      echoSettled: true,
      session: null,
    },
    config.width
  );
}

export function createRulerState(
  text: string,
  config: RulerConfig
): RulerState {
  return reOrigin(
    {
      origin: 0,
      originSeq: -1,
      index: 0,
      text,
      lastParsed: null,
      translate: 0,
      minTranslate: 0,
      maxTranslate: 0,
      lowBound: null,
      highBound: null,
      written: [],
      echoSettled: true,
      session: null,
      windowLo: 0,
      windowHi: -1,
      write: null,
      gridKey: { step: config.step, min: config.min, max: config.max },
    },
    text,
    config
  );
}

function newSession(state: RulerState, config: RulerConfig): Session {
  const parsed = config.parse(state.text);
  const startValue = resolveScrubStart({
    parsed,
    lastParsed: state.lastParsed,
    min: config.min,
    max: config.max,
  });
  return {
    startText: state.text,
    startValue,
    outside:
      startValue < config.min
        ? 'below'
        : startValue > config.max
          ? 'above'
          : null,
    startIndex: state.index,
    startLastParsed: state.lastParsed,
    wrote: false,
    lastText: state.text,
  };
}

interface SteppedText {
  text: string;
  index: number;
}

/** The text, and the position, after `steps` value steps from the session's
 * start. */
function stepTo(
  state: RulerState,
  session: Session,
  steps: number,
  config: RulerConfig
): SteppedText {
  const input = {
    start: session.startValue,
    steps,
    step: config.step,
    min: config.min,
    max: config.max,
  };
  const { applied, value } = scrubOutcome(input);
  const text = scrubbedText({
    startText: session.startText,
    format: config.format,
    ...input,
  });
  if (applied === 0) return { text, index: session.startIndex };
  // The first step from outside the range toward it only reaches the bound,
  // which is where the line already sits.
  const toward = session.outside === 'below' ? 1 : -1;
  const entering = session.outside !== null && Math.sign(applied) === toward;
  let index = indexAfter(
    session.startIndex,
    entering ? applied - toward : applied
  );
  // A value held at a bound rests at that bound's own position, which is
  // fractional when the bound is off the grid.
  if (value === config.min && state.lowBound !== null) index = state.lowBound;
  else if (value === config.max && state.highBound !== null) {
    index = state.highBound;
  }
  return { text, index };
}

/** Records `text` as shown, asking the row to write it when it changed. */
function withText(
  state: RulerState,
  session: Session | null,
  text: string,
  config: RulerConfig
): RulerState {
  const changed = text !== (session ? session.lastText : state.text);
  const parsed = config.parse(text);
  return {
    ...state,
    text,
    lastParsed:
      session && text === session.startText
        ? session.startLastParsed
        : parsed !== null && Number.isFinite(parsed)
          ? parsed
          : state.lastParsed,
    session: session
      ? { ...session, lastText: text, wrote: session.wrote || changed }
      : session,
    written:
      changed && !state.written.includes(text)
        ? [...state.written, text].slice(-WRITTEN_CAP)
        : state.written,
    echoSettled: changed ? false : state.echoSettled,
    write: changed ? text : null,
  };
}

const sameGrid = (state: RulerState, config: RulerConfig): boolean =>
  state.gridKey.step === config.step &&
  state.gridKey.min === config.min &&
  state.gridKey.max === config.max;

export function rulerReduce(
  prev: RulerState,
  event: RulerEvent,
  config: RulerConfig
): RulerState {
  const state: RulerState = { ...prev, write: null };
  switch (event.type) {
    case 'external': {
      const known = state.written.includes(event.text);
      if (state.session) {
        // A drag in progress: a written text is an echo, whatever its order.
        if (known && event.text === state.text) {
          return { ...state, echoSettled: true };
        }
        if (known && state.session.wrote) {
          return { ...state, echoSettled: false };
        }
        if (known) {
          // Nothing written yet in this drag: the newest echo is catching up
          // after a late one moved the ruler. Take it and restart the drag's
          // start from it, keeping the record.
          const moved = sameGrid(state, config)
            ? placeAtOrigin(state, event.text, config, state.written)
            : null;
          const next =
            moved ?? reOrigin(state, event.text, config, state.written);
          return { ...next, session: newSession(next, config) };
        }
        if (event.text === state.text) return state;
      } else if (state.written.length > 0) {
        // The newest write came back: nothing older is still on its way.
        if (event.text === state.text) {
          return { ...state, written: [], echoSettled: true };
        }
      } else if (event.text === state.text) {
        return state;
      }
      // An outside change (also a late in-order echo, which the newest echo
      // then undoes). Only a written text keeps the record.
      const keep = known && !state.session ? state.written : [];
      const placed = sameGrid(state, config)
        ? placeAtOrigin(state, event.text, config, keep)
        : null;
      return placed ?? reOrigin(state, event.text, config, keep);
    }
    case 'config':
      return sameGrid(state, config)
        ? state
        : reOrigin(state, state.text, config);
    case 'layout':
      return ensureWindow(state, config.width);
    case 'start':
      if (state.session) return state;
      return { ...state, session: newSession(state, config) };
    case 'move': {
      const session = state.session;
      if (!session) return state;
      const steps = directedSteps(stepsFromTranslation(event.dx));
      const { text, index } = stepTo(state, session, steps, config);
      // The same formula the UI thread uses for the live line.
      const translate = clamp(
        translateOf(session.startIndex) + event.dx,
        state.minTranslate,
        state.maxTranslate
      );
      const moved = withText(
        { ...state, index, translate },
        session,
        text,
        config
      );
      return ensureWindow(moved, config.width);
    }
    case 'end': {
      if (!state.session) return state;
      return finish(
        {
          ...state,
          session: null,
          translate: translateOf(state.index),
          written: state.echoSettled ? [] : state.written,
        },
        config.width
      );
    }
    case 'nudge': {
      const session = newSession(state, config);
      const parsed = config.parse(state.text);
      if (parsed === null || !Number.isFinite(parsed)) {
        // Nothing to step from: first land on the tick the line shows.
        const shown = clamp(session.startValue, config.min, config.max);
        const text = config.format(shown, resolveStep(config.step, shown));
        // The line goes where the written (rounded) text is, not where the
        // unrounded value was.
        const written = clamp(
          config.parse(text) ?? shown,
          config.min,
          config.max
        );
        const index =
          positionOf(state.origin, written, config.step) ?? state.index;
        return finish(
          withText(
            { ...state, index, translate: translateOf(index) },
            null,
            text,
            config
          ),
          config.width
        );
      }
      const { text, index } = stepTo(state, session, event.direction, config);
      return finish(
        withText(
          { ...state, index, translate: translateOf(index) },
          null,
          text,
          config
        ),
        config.width
      );
    }
  }
}
