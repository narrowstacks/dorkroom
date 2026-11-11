import {
  type BorderLayoutInput,
  computeBorderLayout,
  computeMaxAllowedMinBorder,
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_MIN,
  OFFSET_SLIDER_STEP,
  SLIDER_MIN_BORDER,
  SLIDER_STEP_BORDER,
} from '@dorkroom/logic';
import { valueFromSteps } from '@/components/stage/edge-drag';

/** The step a dragged edge moves the minimum border by: the slider's own. */
export const BORDER_DRAG_STEP = SLIDER_STEP_BORDER;
/** The step a dragged image moves its offsets by: the sliders' own. */
export const OFFSET_DRAG_STEP = OFFSET_SLIDER_STEP;

export interface Range {
  min: number;
  max: number;
}

/** What the minimum-border slider allows for this paper, in inches. */
export function minBorderRange(paperWidth: number, paperHeight: number): Range {
  return {
    min: SLIDER_MIN_BORDER,
    max: computeMaxAllowedMinBorder(paperWidth, paperHeight),
  };
}

interface OffsetInput {
  paperWidth: number;
  paperHeight: number;
  printWidth: number;
  printHeight: number;
  minBorder: number;
  ignoreMinBorder: boolean;
}

/**
 * How far the print may move from centre on each axis, in inches: what the
 * model keeps (half the free space, less the minimum border unless that is
 * ignored; `clampOffsets` in `@dorkroom/logic`) held to the sliders' own range.
 * Dragging stays inside this, so the image never stops following the finger
 * while the value runs on past what is drawn.
 */
export function offsetRanges(input: OffsetInput) {
  const slack = (paper: number, print: number) => {
    const half = (paper - print) / 2;
    const room = input.ignoreMinBorder ? half : half - input.minBorder;
    return Math.max(0, room);
  };
  const bound = (room: number): Range => ({
    // `+ 0` folds -0 (no room) into a plain 0.
    min: Math.max(OFFSET_SLIDER_MIN, -room) + 0,
    max: Math.min(OFFSET_SLIDER_MAX, room),
  });
  return {
    h: bound(slack(input.paperWidth, input.printWidth)),
    v: bound(slack(input.paperHeight, input.printHeight)),
  };
}

/** Finger travel, in px, that moves a value by one `step` inch. */
export function pxPerStep(
  boxWidth: number,
  paperWidth: number,
  step: number
): number {
  return paperWidth > 0 ? (boxWidth / paperWidth) * step : 0;
}

/** A pair of offsets, in inches. */
export interface Offsets {
  h: number;
  v: number;
}

/**
 * The offsets after a drag inside the image, from where it began. Dragging
 * right or down moves the print right or down. In the model that is a NEGATIVE
 * horizontal offset (`left = halfW - offsetH` in `bordersFromGaps`) and a
 * positive vertical one (`top = halfH + offsetV`).
 */
export function offsetsAfterDrag(input: {
  start: Offsets;
  /** Whole steps of finger travel: right and down are positive. */
  stepsX: number;
  stepsY: number;
  ranges: { h: Range; v: Range };
}): Offsets {
  const { start, stepsX, stepsY, ranges } = input;
  return {
    h: valueFromSteps({
      start: start.h,
      steps: -stepsX,
      step: OFFSET_DRAG_STEP,
      ...ranges.h,
    }),
    v: valueFromSteps({
      start: start.v,
      steps: stepsY,
      step: OFFSET_DRAG_STEP,
      ...ranges.v,
    }),
  };
}

/** The window size `computeBorderLayout` fits its preview to; the drawing ignores it. */
const LAYOUT_VIEWPORT = { width: 400, height: 800 };
/** The most steps a table covers: a custom paper could otherwise ask for thousands. */
export const MAX_TABLE_STEPS = 400;

/** Every edge's inward position (px) at each step of the minimum border. */
export interface EdgePositions {
  /** How many steps the tables hold (each array has this length). */
  count: number;
  left: number[];
  right: number[];
  top: number[];
  bottom: number[];
}

/**
 * Where each edge of the image sits, in px inward from the paper's edge, for
 * every step of the minimum border from `range.min` to `range.max`, read from
 * the real layout. Dragging looks the finger's position up in this table
 * (`nearestStep`), so the edge under the finger follows it exactly through
 * whatever the layout does: the tight axis switching, a ratio that is loose on
 * one axis, a flip, even borders. An array is usually non-decreasing but not
 * always: an edge pinned by an offset limit moves inward and then back out as
 * the border grows (`right = 2 * halfW - m` once `clampOffsets` binds), which is
 * why `nearestStep` searches locally. The border in
 * `values` is ignored; offsets, ratio, paper and orientation are not.
 */
export function edgePositionsByStep(
  values: BorderLayoutInput,
  pxPerInch: number,
  range: Range,
  step: number = BORDER_DRAG_STEP
): EdgePositions {
  const out: EdgePositions = {
    count: 0,
    left: [],
    right: [],
    top: [],
    bottom: [],
  };
  if (!(step > 0) || !(pxPerInch > 0)) return out;
  const count = Math.min(
    MAX_TABLE_STEPS,
    Math.max(0, Math.round((range.max - range.min) / step)) + 1
  );
  for (let k = 0; k < count; k++) {
    const minBorder = range.min + k * step;
    const { calculation: c } = computeBorderLayout(
      { ...values, minBorder, lastValidMinBorder: minBorder },
      { viewport: LAYOUT_VIEWPORT }
    );
    out.left.push(c.leftBorder * pxPerInch);
    out.right.push(c.rightBorder * pxPerInch);
    out.top.push(c.topBorder * pxPerInch);
    out.bottom.push(c.bottomBorder * pxPerInch);
  }
  out.count = count;
  return out;
}

/** What `layoutInputOf` reads from the calculator hook's return. */
interface CalculatorState {
  aspectRatio: BorderLayoutInput['aspectRatio'];
  paperSize: BorderLayoutInput['paperSize'];
  customAspectWidth: number;
  customAspectHeight: number;
  customPaperWidth: number;
  customPaperHeight: number;
  isLandscape: boolean;
  isRatioFlipped: boolean;
  minBorder: number;
  enableOffset: boolean;
  horizontalOffset: number;
  verticalOffset: number;
  ignoreMinBorder: boolean;
  calculation: { lastValidMinBorder: number };
}

/** The values the calculator's layout was computed from, for asking it "what if". */
export function layoutInputOf(calc: CalculatorState): BorderLayoutInput {
  return {
    paperSize: calc.paperSize,
    lastValidCustomPaperWidth: calc.customPaperWidth,
    lastValidCustomPaperHeight: calc.customPaperHeight,
    aspectRatio: calc.aspectRatio,
    lastValidCustomAspectWidth: calc.customAspectWidth,
    lastValidCustomAspectHeight: calc.customAspectHeight,
    isLandscape: calc.isLandscape,
    isRatioFlipped: calc.isRatioFlipped,
    minBorder: calc.minBorder,
    lastValidMinBorder: calc.calculation.lastValidMinBorder,
    enableOffset: calc.enableOffset,
    horizontalOffset: calc.horizontalOffset,
    verticalOffset: calc.verticalOffset,
    ignoreMinBorder: calc.ignoreMinBorder,
  };
}
