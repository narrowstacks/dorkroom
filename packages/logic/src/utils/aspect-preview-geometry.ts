export interface AspectPreviewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Computes two centered, uniformly-scaled rectangles for the print resize
 * aspect-ratio preview: the original print and the target print. Both are
 * scaled by a single shared factor (`box / maxDim`) so their proportions stay
 * directly comparable, and each is centered within the `box`-sized square.
 * Returns zero rects when any dimension is non-positive or non-finite.
 *
 * Pure geometry shared by the web (`@dorkroom/ui`) and mobile renderers.
 */
export function computePreviewRects(
  origW: number,
  origL: number,
  newW: number,
  newL: number,
  box: number
): { orig: AspectPreviewRect; target: AspectPreviewRect } {
  const zero: AspectPreviewRect = { x: 0, y: 0, w: 0, h: 0 };
  const maxDim = Math.max(origW, origL, newW, newL);
  if (!Number.isFinite(maxDim) || maxDim <= 0)
    return { orig: zero, target: zero };

  const scale = box / maxDim;
  const place = (w: number, l: number): AspectPreviewRect => {
    const rw = w * scale;
    const rh = l * scale;
    return { x: (box - rw) / 2, y: (box - rh) / 2, w: rw, h: rh };
  };
  return { orig: place(origW, origL), target: place(newW, newL) };
}
