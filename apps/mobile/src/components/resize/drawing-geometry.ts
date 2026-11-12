import { computePreviewRects } from '@dorkroom/logic';

/** Room beside a rectangle for a label centred on its left or right edge. */
export const LABEL_PAD_X = 38;
/** Room above or below for a label centred on its top or bottom edge. */
export const LABEL_PAD_Y = 14;

/** The square the two rectangles are drawn in, for a stage of this size. */
export function fitResizeBox(stage: { width: number; height: number }): number {
  return Math.max(
    0,
    Math.min(stage.width - 2 * LABEL_PAD_X, stage.height - 2 * LABEL_PAD_Y)
  );
}

export type DimensionKey = 'origW' | 'origL' | 'newW' | 'newL';

export interface EdgeLabel {
  key: DimensionKey;
  /** The label's centre, in the box's coordinates: on the edge it names. */
  x: number;
  y: number;
}

/**
 * Where each of the four dimensions is written: the original's width on its
 * top edge and length on its left edge, the new print's width on its bottom
 * edge and length on its right. Opposite sides, so the two sets of labels never
 * share an edge however alike the sizes are.
 */
export function resizeLabels(
  origW: number,
  origL: number,
  newW: number,
  newL: number,
  box: number
): EdgeLabel[] {
  const { orig, target } = computePreviewRects(origW, origL, newW, newL, box);
  if (target.w <= 0 || orig.w <= 0) return [];
  return [
    { key: 'origW', x: orig.x + orig.w / 2, y: orig.y },
    { key: 'origL', x: orig.x, y: orig.y + orig.h / 2 },
    { key: 'newW', x: target.x + target.w / 2, y: target.y + target.h },
    { key: 'newL', x: target.x + target.w, y: target.y + target.h / 2 },
  ];
}

export interface HeightBars {
  /** Bar heights in px, both from the same base so they compare. */
  orig: number;
  target: number;
}

/** The enlarger column at two heights, scaled to `maxHeight` px. */
export function heightBars(
  origH: number,
  newH: number,
  maxHeight: number
): HeightBars | null {
  const tallest = Math.max(origH, newH);
  if (!Number.isFinite(tallest) || tallest <= 0 || maxHeight <= 0) return null;
  const scale = maxHeight / tallest;
  return {
    orig: Math.max(0, origH) * scale,
    target: Math.max(0, newH) * scale,
  };
}

/** A dimension for a label: up to two decimals, no trailing zeros. */
export function formatDimension(value: number): string {
  return String(Number(value.toFixed(2)));
}
