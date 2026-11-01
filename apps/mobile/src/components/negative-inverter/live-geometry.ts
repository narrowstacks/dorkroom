import { type PixelPoint, type PixelSize } from '@dorkroom/logic';
import { fitContain, imagePointToScreen } from './stage-geometry';

/**
 * Coordinate math for the live camera inverter. Three images of the same
 * negative are in play:
 *
 * - the camera **buffer**, in the sensor's own orientation (landscape for the
 *   back camera), which the frame worklet reads;
 * - the **live** image: the buffer turned upright and scaled down, which the
 *   stage shows and which a picked base point is stored in;
 * - the **photo**, captured upright at full resolution (its proxy for the
 *   editor), onto which a picked base point carries over.
 *
 * Statistics snapshots are the live image at a smaller size, so they map with
 * `scalePoint` from `@dorkroom/logic`.
 *
 * The functions the frame worklet calls are worklets; the rest run in React.
 */

/** How the buffer's pixels are turned relative to upright (vision-camera's
 *  `Frame.orientation`): `'right'` means they are rotated 90° clockwise. */
export type BufferOrientation = 'up' | 'right' | 'down' | 'left';

/** Long edge of the live image, in pixels: sharp on a phone-width stage,
 *  small enough to copy to the CPU every frame. */
export const LIVE_LONG_EDGE = 1024;

/** Long edge of a statistics snapshot, in pixels. The statistics run on the
 *  JS thread (Hermes, no JIT); at 160 x 120 a pass is a quarter of the cost
 *  at 320 x 240 (most of it sorting pixels), and the captured photo is
 *  measured afresh at full proxy size anyway. */
export const LIVE_STATS_LONG_EDGE = 160;

/** Size of the buffer once turned upright. */
export function uprightSize(
  buffer: PixelSize,
  orientation: BufferOrientation
): PixelSize {
  'worklet';
  return orientation === 'left' || orientation === 'right'
    ? { width: buffer.height, height: buffer.width }
    : { width: buffer.width, height: buffer.height };
}

/**
 * `size` scaled down so its long edge is at most `longEdge`, never up. The
 * same as `fitLongEdge` in `@dorkroom/logic`, as a worklet.
 */
export function fitWithin(size: PixelSize, longEdge: number): PixelSize {
  'worklet';
  const long = Math.max(size.width, size.height);
  if (long <= longEdge) return { width: size.width, height: size.height };
  const scale = longEdge / long;
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

/**
 * The sizes to step through to shrink `from` to fit `longEdge`: halvings
 * while at least twice the target, then the target. Each linear step averages
 * about 2x2 pixels, so the result is not aliased the way one big linear jump
 * is (it would skip most pixels), which matters for percentile statistics.
 */
export function downscaleSteps(from: PixelSize, longEdge: number): PixelSize[] {
  'worklet';
  const target = fitWithin(from, longEdge);
  const steps: PixelSize[] = [];
  let { width, height } = from;
  while (width >= target.width * 2 && height >= target.height * 2) {
    width = Math.ceil(width / 2);
    height = Math.ceil(height / 2);
    steps.push({ width, height });
  }
  if (width !== target.width || height !== target.height) steps.push(target);
  return steps;
}

/**
 * The affine map from buffer pixels to `output` pixels, as the nine values of
 * a row-major 3x3 matrix (Skia's `Matrix` order): undo the buffer's rotation,
 * mirror if the buffer is mirrored, then scale to `output`. Mirroring comes
 * after the rotation, as vision-camera defines it.
 */
export function bufferToOutputMatrix(
  buffer: PixelSize,
  orientation: BufferOrientation,
  mirrored: boolean,
  output: PixelSize
): number[] {
  'worklet';
  const { width: w, height: h } = buffer;
  // Rows of the rotation: x' = a*x + b*y + c, y' = d*x + e*y + f.
  let a = 1;
  let b = 0;
  let c = 0;
  let d = 0;
  let e = 1;
  let f = 0;
  if (orientation === 'right') {
    // Turn 90° anticlockwise: the buffer's right edge becomes the top.
    a = 0;
    b = 1;
    d = -1;
    e = 0;
    f = w;
  } else if (orientation === 'left') {
    // Turn 90° clockwise.
    a = 0;
    b = -1;
    c = h;
    d = 1;
    e = 0;
  } else if (orientation === 'down') {
    a = -1;
    c = w;
    e = -1;
    f = h;
  }
  const upright = uprightSize(buffer, orientation);
  if (mirrored) {
    a = -a;
    b = -b;
    c = upright.width - c;
  }
  const sx = output.width / upright.width;
  const sy = output.height / upright.height;
  return [a * sx, b * sx, c * sx, d * sy, e * sy, f * sy, 0, 0, 1];
}

/**
 * Where the live image lies in the photo, in photo pixels. Both are upright
 * views of the same sensor through the same lens; when their aspect ratios
 * differ, the narrower one is the centred crop (as iOS crops a 16:9 stream
 * from a 4:3 sensor), so the live image is fitted inside the photo.
 */
function liveInPhoto(live: PixelSize, photo: PixelSize) {
  return fitContain(live, photo);
}

/** A live-image point in photo pixels, clamped to the photo. */
export function livePointToPhoto(
  point: PixelPoint,
  live: PixelSize,
  photo: PixelSize
): PixelPoint {
  const p = imagePointToScreen(point, liveInPhoto(live, photo), live);
  return {
    x: Math.max(0, Math.min(photo.width - 1, p.x)),
    y: Math.max(0, Math.min(photo.height - 1, p.y)),
  };
}
