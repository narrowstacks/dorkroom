import { matBorderToInput } from '@dorkroom/logic';
import type { Edge } from '@/components/stage/edge-drag';
import { adaptiveStep, gridIndex } from '@/components/stage/edge-drag';

/**
 * How a dragged window edge moves a border. Each of the four borders is its own
 * field in `useMatCalculator` (top, bottom, left and right are independent; the
 * "bottom weight" only steers best fit), so an edge drives exactly its own side.
 */

/** The border field each window edge sets. */
export const BORDER_KEY = {
  left: 'borderLeft',
  right: 'borderRight',
  top: 'borderTop',
  bottom: 'borderBottom',
} as const satisfies Record<Edge, string>;

/** The grid a drag lands on, finest first: the cutter's 1/16 up to a whole inch. */
export const MAT_DRAG_STEPS = [1 / 16, 1 / 8, 1 / 4, 1 / 2, 1] as const;
/** The least finger travel, in px, a step may take, so a large mat does not
 * redraw for every pixel. */
export const MIN_STEP_PX = 4;
/** The smallest window a drag will leave, in inches, on either axis. */
export const MIN_WINDOW = 0.5;

/** The grid step for a drawing that shows `pxPerInch` px to an inch. */
export function matDragStep(pxPerInch: number): number {
  return adaptiveStep(MAT_DRAG_STEPS, pxPerInch, MIN_STEP_PX);
}

interface Layout {
  ow: number;
  oh: number;
  bt: number;
  bb: number;
  bl: number;
  br: number;
}

/**
 * How far an edge's border may go, in inches: from nothing to what leaves
 * `MIN_WINDOW` between it and the opposite border.
 */
export function matBorderRange(edge: Edge, { ow, oh, bt, bb, bl, br }: Layout) {
  const room = {
    left: ow - br,
    right: ow - bl,
    top: oh - bb,
    bottom: oh - bt,
  }[edge];
  return { min: 0, max: Math.max(0, room - MIN_WINDOW) };
}

/** The current border, in inches, of one side. */
export function matBorderOf(edge: Edge, l: Layout): number {
  return { left: l.bl, right: l.br, top: l.bt, bottom: l.bb }[edge];
}

/** The most steps an edge's table holds. */
const MAX_TABLE_STEPS = 400;

interface EdgeTrack {
  positions: number[];
  startIndex: number;
}

/**
 * An edge's inward position (px from the board's edge) at every step of its
 * border, and the index its current border sits at. A border moves 1:1 with the
 * finger on a grid of `step`, so this is linear, but it takes the same shape as
 * Border's tables so both drag through `nearestStep`.
 */
export function matEdgeTrack(
  edge: Edge,
  layout: Layout,
  step: number,
  scale: number
): EdgeTrack {
  if (!(step > 0) || !(scale > 0)) return { positions: [], startIndex: 0 };
  const { min, max } = matBorderRange(edge, layout);
  const count = Math.min(
    MAX_TABLE_STEPS,
    Math.max(0, Math.round((max - min) / step)) + 1
  );
  const positions = Array.from(
    { length: count },
    (_, k) => (min + k * step) * scale
  );
  return {
    positions,
    startIndex: gridIndex(matBorderOf(edge, layout), min, step, count),
  };
}

/**
 * The text to write into a border field after a drag step. With no steps it is
 * the text the field held when the drag began, verbatim (a typed `0.3` must not
 * come back as `0.3125` after dragging out and back); otherwise the grid value
 * in the field's own format.
 */
export function borderTextAfterDrag(input: {
  startText: string;
  steps: number;
  value: number;
}): string {
  return input.steps === 0 ? input.startText : matBorderToInput(input.value);
}
