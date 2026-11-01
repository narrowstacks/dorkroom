import {
  type CropHandle,
  type PixelPoint,
  type PixelRect,
  type PixelSize,
  type ScreenBox,
} from '@dorkroom/logic';

/**
 * Layout math for the inverter stage: where the photo sits in its view, how a
 * touch maps to proxy pixels, which crop handle a touch grabs, and where the
 * loupe goes. Screen values are in points, relative to the stage view.
 */

/** Loupe diameter, in points. */
export const LOUPE_SIZE = 128;

/** Gap between the finger and the loupe's edge, in points. */
export const LOUPE_GAP = 36;

/** Proxy pixels from the loupe centre to its edge. */
export const LOUPE_RADIUS = 22;

/** How far from a crop edge or corner a touch still grabs it, in points. */
export const HANDLE_SLOP = 28;

/** The photo fitted inside the view, letterboxed, centred. */
export function fitContain(image: PixelSize, view: PixelSize): ScreenBox {
  if (image.width <= 0 || image.height <= 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  const scale = Math.min(view.width / image.width, view.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  return {
    left: (view.width - width) / 2,
    top: (view.height - height) / 2,
    width,
    height,
  };
}

/** Height of a view the full width of `width` that shows the photo whole,
 *  capped so a tall photo leaves room for the controls. */
export function stageHeight(
  image: PixelSize,
  width: number,
  maxHeight: number
): number {
  if (image.width <= 0) return 0;
  return Math.min(maxHeight, (width * image.height) / image.width);
}

/** A rectangle in image pixels, on screen. */
export function imageRectToScreen(
  rect: PixelRect,
  box: ScreenBox,
  image: PixelSize
): ScreenBox {
  const sx = box.width / image.width;
  const sy = box.height / image.height;
  return {
    left: box.left + rect.x * sx,
    top: box.top + rect.y * sy,
    width: rect.width * sx,
    height: rect.height * sy,
  };
}

/** A point in image pixels, on screen. */
export function imagePointToScreen(
  point: PixelPoint,
  box: ScreenBox,
  image: PixelSize
): PixelPoint {
  return {
    x: box.left + (point.x * box.width) / image.width,
    y: box.top + (point.y * box.height) / image.height,
  };
}

/** A drag distance on screen, in image pixels. */
export function viewDeltaToImage(
  dx: number,
  dy: number,
  box: ScreenBox,
  image: PixelSize
): PixelPoint {
  return {
    x: box.width > 0 ? (dx * image.width) / box.width : 0,
    y: box.height > 0 ? (dy * image.height) / box.height : 0,
  };
}

/**
 * The crop handle a touch grabs: a corner if near both of its edges, else an
 * edge, else `move` inside the crop, else null. Within `slop` of an edge
 * counts as on it, since a fingertip is far wider than the drawn line.
 */
export function hitCropHandle(
  touch: PixelPoint,
  crop: ScreenBox,
  slop = HANDLE_SLOP
): CropHandle | null {
  const right = crop.left + crop.width;
  const bottom = crop.top + crop.height;
  if (
    touch.x < crop.left - slop ||
    touch.x > right + slop ||
    touch.y < crop.top - slop ||
    touch.y > bottom + slop
  ) {
    return null;
  }
  // On a small crop the slop zones overlap; prefer the nearer edge.
  const dw = Math.abs(touch.x - crop.left);
  const de = Math.abs(touch.x - right);
  const dn = Math.abs(touch.y - crop.top);
  const ds = Math.abs(touch.y - bottom);
  const horizontal =
    Math.min(dw, de) <= slop ? (dw <= de ? 'w' : 'e') : undefined;
  const vertical =
    Math.min(dn, ds) <= slop ? (dn <= ds ? 'n' : 's') : undefined;
  if (vertical && horizontal) return `${vertical}${horizontal}`;
  if (vertical) return vertical;
  if (horizontal) return horizontal;
  return 'move';
}

export interface LoupePlacement {
  /** Loupe centre, in view points. */
  x: number;
  y: number;
  /** True when it sits under the finger for lack of room above. */
  below: boolean;
}

/**
 * Where the loupe sits for a touch: above the finger, which would otherwise
 * cover the spot being sampled, or below it near the top of the view. Kept
 * inside the view horizontally. A worklet, since the stage runs it on the UI
 * thread as the finger moves.
 */
export function placeLoupe(touch: PixelPoint, view: PixelSize): LoupePlacement {
  'worklet';
  const half = LOUPE_SIZE / 2;
  const offset = half + LOUPE_GAP;
  const below = touch.y - offset - half < 0;
  const x = Math.max(half, Math.min(view.width - half, touch.x));
  return { x, y: below ? touch.y + offset : touch.y - offset, below };
}
