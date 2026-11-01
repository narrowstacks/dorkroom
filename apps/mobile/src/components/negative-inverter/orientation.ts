import type { PixelPoint, PixelRect, PixelSize } from '@dorkroom/logic';

/**
 * How the photo is turned for viewing and export: mirrored left to right
 * first (a negative shot emulsion side up), then turned clockwise by quarter
 * turns. Crop, base and neutral stay in source (proxy) pixels; this is only a
 * view and output transform, so it never invalidates a pick.
 *
 * Coordinates are continuous: a pixel's area runs from x to x + 1, so a size
 * maps to a size and a rectangle's edges map to edges.
 */
export interface Orientation {
  /** Clockwise quarter turns, 0 to 3. */
  quarterTurns: 0 | 1 | 2 | 3;
  /** Mirrored left to right before turning. */
  mirrored: boolean;
}

export const IDENTITY_ORIENTATION: Orientation = {
  quarterTurns: 0,
  mirrored: false,
};

/** An orientation step, as the editor's buttons offer them. Flips act on
 *  the photo as it is shown, not as it was shot. */
export type OrientationStep =
  'rotate-left' | 'rotate-right' | 'flip-horizontal' | 'flip-vertical';

function turns(n: number): Orientation['quarterTurns'] {
  const r = ((n % 4) + 4) % 4;
  return r === 1 ? 1 : r === 2 ? 2 : r === 3 ? 3 : 0;
}

/**
 * The orientation after one more step. A view-space mirror H after k turns
 * equals mirroring first and turning back the other way (H R^k = R^-k H),
 * and a vertical flip is a horizontal one turned half way (V = R^2 H).
 */
export function orient(o: Orientation, step: OrientationStep): Orientation {
  switch (step) {
    case 'rotate-right':
      return { ...o, quarterTurns: turns(o.quarterTurns + 1) };
    case 'rotate-left':
      return { ...o, quarterTurns: turns(o.quarterTurns + 3) };
    case 'flip-horizontal':
      return { quarterTurns: turns(-o.quarterTurns), mirrored: !o.mirrored };
    case 'flip-vertical':
      return {
        quarterTurns: turns(2 - o.quarterTurns),
        mirrored: !o.mirrored,
      };
  }
}

export function isIdentity(o: Orientation): boolean {
  return o.quarterTurns === 0 && !o.mirrored;
}

/** The size of the photo as shown: width and height swap on odd turns. */
export function orientedSize(size: PixelSize, o: Orientation): PixelSize {
  return o.quarterTurns % 2 === 1
    ? { width: size.height, height: size.width }
    : size;
}

/** A source point, in the oriented photo. */
export function orientPoint(
  p: PixelPoint,
  size: PixelSize,
  o: Orientation
): PixelPoint {
  let x = o.mirrored ? size.width - p.x : p.x;
  let y = p.y;
  let h = size.height;
  let w = size.width;
  for (let i = 0; i < o.quarterTurns; i++) {
    // Clockwise in a w x h frame: (x, y) -> (h - y, x), now h x w.
    [x, y] = [h - y, x];
    [w, h] = [h, w];
  }
  return { x, y };
}

/** A point in the oriented photo, back in source pixels (for a touch). */
export function unorientPoint(
  p: PixelPoint,
  size: PixelSize,
  o: Orientation
): PixelPoint {
  let { x, y } = p;
  let { width: w } = orientedSize(size, o);
  let h = w === size.width ? size.height : size.width;
  for (let i = 0; i < o.quarterTurns; i++) {
    // Counter-clockwise in a w x h frame: (x, y) -> (y, w - x), now h x w.
    [x, y] = [y, w - x];
    [w, h] = [h, w];
  }
  return { x: o.mirrored ? size.width - x : x, y };
}

function boundsOf(a: PixelPoint, b: PixelPoint): PixelRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

const farCorner = (r: PixelRect) => ({ x: r.x + r.width, y: r.y + r.height });

/** A source rectangle, in the oriented photo. */
export function orientRect(
  r: PixelRect,
  size: PixelSize,
  o: Orientation
): PixelRect {
  return boundsOf(orientPoint(r, size, o), orientPoint(farCorner(r), size, o));
}

/** A rectangle in the oriented photo, back in source pixels. */
export function unorientRect(
  r: PixelRect,
  size: PixelSize,
  o: Orientation
): PixelRect {
  return boundsOf(
    unorientPoint(r, size, o),
    unorientPoint(farCorner(r), size, o)
  );
}

/**
 * The orientation as a 3 x 3 affine matrix, row major as Skia takes it
 * ([scaleX, skewX, transX, skewY, scaleY, transY, 0, 0, 1]), taking source
 * pixels of `size` to oriented pixels.
 */
export function orientationMatrix(size: PixelSize, o: Orientation): number[] {
  const origin = orientPoint({ x: 0, y: 0 }, size, o);
  const ex = orientPoint({ x: 1, y: 0 }, size, o);
  const ey = orientPoint({ x: 0, y: 1 }, size, o);
  return [
    ex.x - origin.x,
    ey.x - origin.x,
    origin.x,
    ex.y - origin.y,
    ey.y - origin.y,
    origin.y,
    0,
    0,
    1,
  ];
}

/** Spoken description of an orientation, for VoiceOver. */
export function describeOrientation(o: Orientation): string {
  const turn =
    o.quarterTurns === 0 ? '' : `turned ${o.quarterTurns * 90} degrees right`;
  if (o.mirrored) return turn ? `Mirrored and ${turn}` : 'Mirrored';
  return turn ? `T${turn.slice(1)}` : 'Upright';
}

/**
 * What the stage or the export shows: a region of the source (the crop, or
 * the whole frame), then oriented. Everything the user picks stays in source
 * pixels; these map it to and from the view.
 */
export interface ViewFrame {
  /** Source region shown, in source pixels. */
  region: PixelRect;
  orientation: Orientation;
}

const regionSize = (f: ViewFrame): PixelSize => ({
  width: f.region.width,
  height: f.region.height,
});

/** The frame's size as shown: the region, oriented. */
export function frameSize(f: ViewFrame): PixelSize {
  return orientedSize(regionSize(f), f.orientation);
}

/** A source point, in the frame. */
export function toFrame(p: PixelPoint, f: ViewFrame): PixelPoint {
  return orientPoint(
    { x: p.x - f.region.x, y: p.y - f.region.y },
    regionSize(f),
    f.orientation
  );
}

/** A point in the frame (a touch), back in source pixels. */
export function fromFrame(p: PixelPoint, f: ViewFrame): PixelPoint {
  const q = unorientPoint(p, regionSize(f), f.orientation);
  return { x: q.x + f.region.x, y: q.y + f.region.y };
}

/** A source rectangle, in the frame. */
export function rectToFrame(r: PixelRect, f: ViewFrame): PixelRect {
  return boundsOf(toFrame(r, f), toFrame(farCorner(r), f));
}

/** A rectangle in the frame, back in source pixels. */
export function rectFromFrame(r: PixelRect, f: ViewFrame): PixelRect {
  return boundsOf(fromFrame(r, f), fromFrame(farCorner(r), f));
}

/** True when a source point falls inside the frame's region. */
export function inFrame(p: PixelPoint, f: ViewFrame): boolean {
  const { x, y, width, height } = f.region;
  return p.x >= x && p.x <= x + width && p.y >= y && p.y <= y + height;
}

/** The frame as a Skia matrix (see `orientationMatrix`), from source pixels
 *  to frame pixels: the region's origin moved to 0, then oriented. */
export function frameMatrix(f: ViewFrame): number[] {
  const [a, c, tx, b, d, ty] = orientationMatrix(regionSize(f), f.orientation);
  const { x, y } = f.region;
  return [a, c, tx - a * x - c * y, b, d, ty - b * x - d * y, 0, 0, 1];
}

/** Apply a Skia-order matrix to a point (for tests and checks). */
export function applyMatrix(m: readonly number[], p: PixelPoint): PixelPoint {
  return {
    x: m[0] * p.x + m[1] * p.y + m[2],
    y: m[3] * p.x + m[4] * p.y + m[5],
  };
}

/** The frame drawn into `box` on screen: `frameMatrix`, scaled to the box
 *  and moved to its corner. Box sides are in proportion to the frame. */
export function frameToScreenMatrix(
  f: ViewFrame,
  box: { left: number; top: number; width: number }
): number[] {
  const k = box.width / frameSize(f).width;
  const [a, c, tx, b, d, ty] = frameMatrix(f);
  return [
    k * a,
    k * c,
    k * tx + box.left,
    k * b,
    k * d,
    k * ty + box.top,
    0,
    0,
    1,
  ];
}
