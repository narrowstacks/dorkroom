import type { Edge } from './edge-drag';

/** A rectangle in the drawing's coordinates. */
export interface EdgeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A visible bar's length: up to this, from this share of its edge, at least `BAR_MIN`. */
const BAR_LENGTH = 28;
const BAR_SHARE = 0.6;
const BAR_MIN = 12;

/**
 * The hit targets of the four edges of `rect`, each `hit` points across,
 * guaranteed never to overlap one another at any size, down to a zero-size
 * rectangle.
 *
 * On each axis the pair of targets (left and right, or top and bottom) is
 * centred on its edges while the rectangle is at least two targets wide, and the
 * targets across from them take the stretch between. Below that there is no room
 * for both, so the pair moves out to either side of a one-target gap at the
 * rectangle's centre, which the other pair's targets take instead. The target
 * therefore stays on its own side of a small rectangle (a drag outward from
 * that side always finds it) and the visible bar may stay on the edge. With
 * `minLeft`, no target starts left of it.
 */
export function edgeHitRects(
  rect: EdgeRect,
  hit: number,
  minLeft: number = Number.NEGATIVE_INFINITY
) {
  const half = hit / 2;
  const width = Math.max(0, rect.width);
  const height = Math.max(0, rect.height);
  const right = rect.left + width;
  const bottom = rect.top + height;
  const cx = rect.left + width / 2;
  const cy = rect.top + height / 2;

  // Along x: the two bands for left and right, and the gap between them.
  const roomy = width >= 2 * hit;
  const leftBand = roomy ? rect.left - half : cx - half - hit;
  const rightBand = roomy ? right - half : cx + half;
  const spanX = roomy
    ? { from: rect.left + half, length: width - hit }
    : { from: cx - half, length: hit };

  // Along y.
  const tall = height >= 2 * hit;
  const topBand = tall ? rect.top - half : cy - half - hit;
  const bottomBand = tall ? bottom - half : cy + half;
  const spanY = tall
    ? { from: rect.top + half, length: height - hit }
    : { from: cy - half, length: hit };

  // No target starts left of `minLeft`: the part that would is cut off (the
  // target only shrinks, so none can come to overlap another).
  const clipped = (r: EdgeRect): EdgeRect => {
    const left = Math.max(r.left, minLeft);
    return { ...r, left, width: Math.max(0, r.left + r.width - left) };
  };

  return {
    left: clipped({
      left: leftBand,
      top: spanY.from,
      width: hit,
      height: spanY.length,
    }),
    right: clipped({
      left: rightBand,
      top: spanY.from,
      width: hit,
      height: spanY.length,
    }),
    top: clipped({
      left: spanX.from,
      top: topBand,
      width: spanX.length,
      height: hit,
    }),
    bottom: clipped({
      left: spanX.from,
      top: bottomBand,
      width: spanX.length,
      height: hit,
    }),
  };
}

/** The visible bar of an edge: on the edge line itself, whatever its hit target. */
export function edgeBarRect(
  edge: Edge,
  rect: EdgeRect,
  thickness: number
): EdgeRect {
  const horizontal = edge === 'left' || edge === 'right';
  const edgeLength = horizontal ? rect.height : rect.width;
  const length = Math.min(
    BAR_LENGTH,
    Math.max(BAR_MIN, Math.max(0, edgeLength) * BAR_SHARE)
  );
  const cx = rect.left + Math.max(0, rect.width) / 2;
  const cy = rect.top + Math.max(0, rect.height) / 2;
  switch (edge) {
    case 'left':
      return {
        left: rect.left - thickness / 2,
        top: cy - length / 2,
        width: thickness,
        height: length,
      };
    case 'right':
      return {
        left: rect.left + Math.max(0, rect.width) - thickness / 2,
        top: cy - length / 2,
        width: thickness,
        height: length,
      };
    case 'top':
      return {
        left: cx - length / 2,
        top: rect.top - thickness / 2,
        width: length,
        height: thickness,
      };
    case 'bottom':
      return {
        left: cx - length / 2,
        top: rect.top + Math.max(0, rect.height) - thickness / 2,
        width: length,
        height: thickness,
      };
  }
}
