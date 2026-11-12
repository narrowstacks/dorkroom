import { inSeparatorOf } from '@dorkroom/logic';

/**
 * Pure math for drag-to-scrub numeric rows: how far a drag moves a value,
 * the step a time field uses at a given size, and how a scrubbed value is
 * written back as text. No React, so it stays unit-testable.
 */

/** Finger travel (px) that advances the value by one step. Also the minor
 * tick spacing on the ruler, so the ruler tracks the drag 1:1. */
export const SCRUB_PX_PER_STEP = 10;

/** Decimals kept when cleaning float drift. A step such as 1/3 has no short
 * decimal form, so this caps how many places count. */
const MAX_DECIMALS = 6;

/** Decimal places in a number's shortest form, capped at `MAX_DECIMALS`. */
export function decimalsOf(n: number): number {
  const text = String(n);
  const dot = text.indexOf('.');
  if (dot === -1 || text.includes('e')) return 0;
  return Math.min(text.length - dot - 1, MAX_DECIMALS);
}

/** A fixed step, or one worked out from the current value at every step so a
 * long drag can coarsen (9.9 s -> 10 s -> 60 s) as it goes. */
export type ScrubStep = number | ((current: number) => number);

export const resolveStep = (step: ScrubStep, probe: number): number =>
  step instanceof Function ? step(probe) : step;

export interface ScrubOutcomeInput {
  start: number;
  /** Whole steps from the start; positive raises the value. */
  steps: number;
  step: ScrubStep;
  min: number;
  max: number;
}

export interface ScrubOutcome {
  value: number;
  /** The step to format `value` with: the real step, unless the value was
   * clamped to a bound, which adds the bound's decimals (a 0.1 minimum on a
   * step of 1 must not print as "0"). */
  formatStep: number;
  /** Value steps actually taken, signed: fewer than asked when a bound
   * stopped the scrub. */
  applied: number;
  /** Whether the value left `start`. A scrub never moves against its
   * direction, so a start already past a bound can stay put. */
  moved: boolean;
}

/** How far from a grid point still counts as on it. Stops are stored to two
 * decimals, so a stored 0.33 is the third. Capped well under a step. */
const ON_GRID_TOLERANCE = 0.005;

/** Whether `value` sits on the grid of `size`, within display tolerance. */
export function isOnGrid(value: number, size: number): boolean {
  return (
    Math.abs(value - Math.round(value / size) * size) <=
    Math.min(ON_GRID_TOLERANCE, size * 0.05)
  );
}

/** Float cleanup: grid points are built from a step that may not be exact. */
export const clean = (n: number): number => Number(n.toFixed(10));

export interface StepResult {
  next: number;
  /** The step size used. */
  size: number;
}

/**
 * One step from `value` in `direction`. Off the grid, the first step lands on
 * the next grid point that way (ceil rising, floor falling); on it, a whole
 * step. The step is read at the value being left when rising and just below
 * it when falling, so every boundary is crossed the same way both ways.
 */
export function stepOnce(
  value: number,
  direction: 1 | -1,
  step: ScrubStep
): StepResult {
  const size = resolveStep(step, direction > 0 ? value : value - 1e-9);
  const q = value / size;
  const nearest = Math.round(q);
  const onGrid = isOnGrid(value, size);
  const index = onGrid
    ? nearest + direction
    : direction > 0
      ? Math.ceil(q)
      : Math.floor(q);
  return { next: clean(index * size), size };
}

/**
 * Where `steps` whole steps from `start` land, clamped to [min, max]. Never
 * moves against the direction of travel: a start below `min` that is being
 * lowered stays where it is.
 */
export function scrubOutcome({
  start,
  steps,
  step,
  min,
  max,
}: ScrubOutcomeInput): ScrubOutcome {
  const direction = steps < 0 ? -1 : 1;
  let value = start;
  let formatStep = resolveStep(step, start);
  let clamped = false;
  let applied = 0;
  for (let i = 0; i < Math.abs(steps); i += 1) {
    const { next, size } = stepOnce(value, direction, step);
    // The first step from outside the range toward it lands on the bound
    // itself, even when the bound sits between grid points.
    const entering = direction > 0 ? value < min : value > max;
    const target = entering
      ? direction > 0
        ? Math.min(next, min)
        : Math.max(next, max)
      : next;
    const bounded = Math.min(max, Math.max(min, target));
    if (direction > 0 ? bounded <= value : bounded >= value) break;
    value = bounded;
    formatStep = size;
    clamped = bounded !== next;
    applied += direction;
  }
  return {
    value,
    applied,
    moved: value !== start,
    formatStep: clamped
      ? 10 ** -Math.max(decimalsOf(formatStep), decimalsOf(value))
      : formatStep,
  };
}

/**
 * Which way a drag moves the value: -1 means dragging right lowers it, like a
 * ruler sliding under a fixed indicator (the ruler follows the finger, so
 * the number under the indicator drops). Every scrub row uses this one direction.
 */
export const SCRUB_DIRECTION = -1;

/** Value steps for `steps` whole steps of finger travel (right positive). */
export function directedSteps(steps: number): number {
  // `+ 0` turns -0 into 0 so a zero drag stays exactly zero.
  return steps * SCRUB_DIRECTION + 0;
}

/** Finger travel (px) before a pan is recognised as a scrub. The pan's
 * `activeOffsetX` and the tap's `maxDistance` use this same number. */
export const SCRUB_SLOP = 8;

/**
 * Effective travel for a pan translation `t` (px), given `dir`, the sign of
 * the movement that activated it (0 until known, which counts as no travel).
 * The translation starts at 0 at recognition, so on the side the drag started
 * toward it is the identity: the strip follows at once, with no jump. Touch-down
 * is `SCRUB_SLOP` behind the activation point, so on the reverse side the
 * slop is a dead zone: the finger back where it went down is exactly 0 and
 * restores the starting value. (iOS only: RNGH resets the translation at
 * activation there, and this app is iOS only.) A worklet, for the pan.
 */
export function effectiveDx(t: number, dir: number): number {
  'worklet';
  if (dir > 0) return t >= 0 ? t : Math.min(0, t + SCRUB_SLOP);
  if (dir < 0) return t <= 0 ? t : Math.max(0, t - SCRUB_SLOP);
  return 0;
}

/**
 * Whole steps for `translation` px of effective travel (see `effectiveDx`). A
 * worklet: the pan runs it on the UI thread to decide when JS needs to hear,
 * and the reducer runs it on the JS thread, so both always agree.
 */
export function stepsFromTranslation(translation: number): number {
  'worklet';
  return Math.round(translation / SCRUB_PX_PER_STEP);
}

export interface ResolveScrubStartInput {
  /** The current text as a number, `NaN`/`null` when it does not parse. */
  parsed: number | null;
  /** The last value the text parsed to, if it ever did. */
  lastParsed: number | null;
  min: number;
  max: number;
}

/** Where a scrub begins: the text's value, else the last one that parsed,
 * else zero held inside the bounds. */
export function resolveScrubStart({
  parsed,
  lastParsed,
  min,
  max,
}: ResolveScrubStartInput): number {
  if (parsed !== null && Number.isFinite(parsed)) return parsed;
  if (lastParsed !== null && Number.isFinite(lastParsed)) return lastParsed;
  return Math.min(max, Math.max(min, 0));
}

export interface ScrubbedTextInput extends ScrubOutcomeInput {
  /** The text when the scrub began. */
  startText: string;
  /** Number to text; defaults to `formatScrubbed`. */
  format?: (value: number, step: number) => string;
}

/**
 * The text a scrub of `steps` writes. Zero net steps, or a scrub that could
 * not move, is the exact starting text, so an off-grid start (12.37) is only
 * snapped once the drag takes a step and returns to it when dragged back. The
 * start's decimal separator is kept: a comma in, a comma out.
 */
export function scrubbedText({
  startText,
  format = formatScrubbed,
  ...input
}: ScrubbedTextInput): string {
  if (input.steps === 0) return startText;
  const { value, formatStep, moved } = scrubOutcome(input);
  if (!moved) return startText;
  return inSeparatorOf(startText, format(value, formatStep));
}

/** The focal-length step while dragging, in mm: finer for short lenses. */
export function adaptiveFocalStep(mm: number): number {
  if (mm < 100) return 1;
  if (mm < 500) return 5;
  return 10;
}

/** The time step used while dragging a duration: finer when short. */
export function adaptiveTimeStep(seconds: number): number {
  if (seconds < 10) return 0.1;
  if (seconds < 60) return 0.5;
  return 1;
}

/** A scrubbed value as text, with the step's number of decimals. */
export function formatScrubbed(value: number, step: number): string {
  return value.toFixed(decimalsOf(step));
}
