export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Scale the original and target print rectangles by a single shared factor so
 * they fit within a `box`×`box` area and stay visually comparable, each
 * centered. Returns zero rects when any dimension is non-positive.
 */
export function computePreviewRects(
  origW: number,
  origL: number,
  newW: number,
  newL: number,
  box: number
): { orig: Rect; target: Rect } {
  const zero: Rect = { x: 0, y: 0, w: 0, h: 0 };
  const maxDim = Math.max(origW, origL, newW, newL);
  if (!Number.isFinite(maxDim) || maxDim <= 0)
    return { orig: zero, target: zero };

  const scale = box / maxDim;
  const place = (w: number, l: number): Rect => {
    const rw = w * scale;
    const rh = l * scale;
    return { x: (box - rw) / 2, y: (box - rh) / 2, w: rw, h: rh };
  };
  return { orig: place(origW, origL), target: place(newW, newL) };
}
