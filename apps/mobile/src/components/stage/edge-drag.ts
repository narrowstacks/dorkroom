/**
 * The pure step maths of an edge drag, shared by the UI-thread pan (which
 * only has to know when the whole-step count changes) and the JS side (which
 * turns a step count into a value). Like the scrub ruler: the gesture tells JS
 * once per step, never per frame.
 */

export type Edge = 'left' | 'right' | 'top' | 'bottom';

export type Axis = 'x' | 'y';

/** Finger travel (px) before an edge pan is recognised. */
export const EDGE_SLOP = 4;
/** An edge's hit target, in points, centred on the edge. */
export const EDGE_HIT = 44;

/** The axis an edge is dragged along, and the sign that means "inward". */
export const EDGE_AXIS = {
  left: { axis: 'x', inward: 1 },
  right: { axis: 'x', inward: -1 },
  top: { axis: 'y', inward: 1 },
  bottom: { axis: 'y', inward: -1 },
} as const satisfies Record<Edge, { axis: Axis; inward: 1 | -1 }>;

/**
 * Whole steps for `deltaPx` of finger travel along an edge's inward
 * direction, `pxPerStep` px to a step. A worklet: the pan runs it to decide
 * when JS needs to hear, and JS runs it again to know the same number.
 */
export function stepsFromDelta(deltaPx: number, pxPerStep: number): number {
  'worklet';
  if (!(pxPerStep > 0) || !Number.isFinite(deltaPx)) return 0;
  // `+ 0` turns -0 into 0 so a zero drag stays exactly zero.
  return Math.round(deltaPx / pxPerStep) + 0;
}

/**
 * The step count, relative to `startIndex`, whose on-screen position is nearest
 * `positions[startIndex] + travel`. `positions` holds an edge's inward position
 * (px from its starting side) per step of the value.
 *
 * The search is confined to the monotonic run of the table that contains the
 * start (extended both ways while the slope keeps its sign). An edge pinned by
 * an offset limit moves inward and then back out as the border grows, so the
 * whole table is not monotonic and a global nearest search would flip between
 * the two sides of the peak whenever the target sits under it. Confined to one
 * run the peak is a soft bound: the drag stops there. Inside the run the walk
 * starts from where the drag is now (`previousSteps`, relative to
 * `startIndex`) and moves only while the distance falls strictly, so a tie
 * keeps the current step (a finger back at its touch-down point restores the
 * start exactly). A flat run is crossed when its far side is nearer the
 * target, and otherwise the walk stops at the run's first entry nearest where
 * it came from. A worklet: the pan runs it on every update.
 */
export function nearestStep(
  positions: readonly number[],
  startIndex: number,
  travel: number,
  previousSteps: number = 0
): number {
  'worklet';
  const count = positions.length;
  if (count === 0 || !Number.isFinite(travel)) return 0;
  const from = Math.min(Math.max(Math.round(startIndex), 0), count - 1);
  const target = positions[from] + travel;

  // The slope at the start: the first change after it, else the last before it.
  let slope = 0;
  for (let i = from + 1; i < count && slope === 0; i++) {
    slope = Math.sign(positions[i] - positions[from]);
  }
  for (let i = from - 1; i >= 0 && slope === 0; i--) {
    slope = Math.sign(positions[from] - positions[i]);
  }
  // The monotonic run around the start.
  let lo = from;
  let hi = from;
  while (hi + 1 < count && (positions[hi + 1] - positions[hi]) * slope >= 0) {
    hi++;
  }
  while (lo > 0 && (positions[lo] - positions[lo - 1]) * slope >= 0) lo--;

  let cur = Math.min(Math.max(from + Math.round(previousSteps), lo), hi);
  for (let guard = 0; guard <= count; guard++) {
    const here = Math.abs(positions[cur] - target);
    let next = -1;
    let nextDistance = here;
    for (let dir = -1; dir <= 1; dir += 2) {
      // The first entry in this direction that differs from the current one.
      let j = cur + dir;
      while (j >= lo && j <= hi && positions[j] === positions[cur]) j += dir;
      if (j < lo || j > hi) continue;
      const d = Math.abs(positions[j] - target);
      if (d < nextDistance) {
        next = j;
        nextDistance = d;
      }
    }
    if (next < 0) break;
    cur = next;
  }
  // Back on the start's value: the same flat stretch (the run is monotonic), so
  // the start itself, whichever end of the stretch the walk stopped at.
  if (positions[cur] === positions[from]) return 0;
  return cur - from + 0;
}

/** The index of `value` on a grid of `step` from `min`, held to `0..count - 1`. */
export function gridIndex(
  value: number,
  min: number,
  step: number,
  count: number
): number {
  if (count <= 0 || !(step > 0)) return 0;
  return Math.min(Math.max(Math.round((value - min) / step), 0), count - 1);
}

/** Rounds to a multiple of `step` (steps are binary fractions or 0.1 grids). */
export function snapToStep(value: number, step: number): number {
  return Number((Math.round(value / step) * step).toFixed(6)) + 0;
}

/**
 * The value `steps` whole steps from `start`, held to `min`..`max` only in the
 * direction of travel. A start already outside the range (a typed border too
 * big for the mat) is where the drag begins, so an inward drag cannot make it
 * jump back to the bound: it stays put, and an outward drag walks it down from
 * where it is. With no steps it is the start itself.
 */
export function valueFromSteps(input: {
  start: number;
  steps: number;
  step: number;
  min: number;
  max: number;
}): number {
  const { start, steps, step, min, max } = input;
  // No travel: the start exactly as it was, even off the grid (a typed 2.3 on a
  // 1/4 grid must not become 2.25 by dragging out a step and back).
  if (steps === 0) return start;
  const raw = snapToStep(start + steps * step, step);
  if (steps > 0) return Math.min(raw, Math.max(max, start));
  if (steps < 0) return Math.max(raw, Math.min(min, start));
  return raw;
}

/**
 * The finest of `steps` (ascending) that still takes at least `minPx` of
 * finger travel, so a fine grid on a small drawing never makes the drawing
 * redraw every pixel. Falls back to the coarsest.
 */
export function adaptiveStep(
  steps: readonly number[],
  pxPerUnit: number,
  minPx: number
): number {
  const coarsest = steps[steps.length - 1];
  if (!(pxPerUnit > 0)) return coarsest;
  return steps.find((s) => s * pxPerUnit >= minPx) ?? coarsest;
}
