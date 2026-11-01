import {
  byteToLinear,
  clampRect,
  linearToSrgb,
  type NegativeFilmType,
  type PixelRect,
  type Rgb,
  type RgbaImage,
} from '@dorkroom/logic';

/**
 * Metering for the film, not the light table, in live mode.
 *
 * Phone auto-exposure averages the frame, and most of the frame is the bright
 * light table, so it underexposes the film. On an orange-masked negative the
 * blue channel is the darkest by far, and in the densest parts of the film it
 * sinks to 0, where the shadows of the print are lost for good (on one Portra
 * capture, 35% of the film's pixels had blue at 2 or below). The camera's
 * exposure bias is pushed up until the densest film keeps some blue, as far as
 * the film base allows without clipping; the bare light table may clip, which
 * costs nothing since it is not film.
 */

/** Blue at or under this code value has hit the noise floor. */
export const BLUE_NOISE_FLOOR = 2;

/** Share of film pixels at the noise floor that counts as clipping. */
export const BLUE_CLIP_WARN = 0.01;

/** A pixel this bright in every channel is light, not film. */
export const LIGHT_BYTE = 250;

/** Percentile of film blue taken as the densest film, ignoring dust. */
export const DENSE_PERCENTILE = 0.01;

/** Below this densest blue, exposure goes up... */
export const DENSE_BLUE_MIN = 8;

/** ...aiming here, so it does not hunt around the threshold. */
export const DENSE_BLUE_TARGET = 16;

/** The film base's brightest channel may go up to this. */
export const BASE_MAX_BYTE = 240;

/** At or over this the base has clipped, and exposure comes down. */
export const BASE_CLIP_BYTE = 250;

/** Step down when the base clipped, in EV. */
export const BASE_CLIP_STEP = 1 / 3;

/** Largest change per adjustment, in EV, so the loop stays stable. */
export const MAX_EXPOSURE_STEP = 1;

/** Changes smaller than this are not worth making, in EV. */
export const MIN_EXPOSURE_STEP = 0.1;

/** The bias never leaves this range, in EV, whatever the device allows. */
export const BIAS_LIMIT = 3;

/** Share of film pixels clipped in some channel that counts as the base or
 *  rebate clipping: a rebate strip is a few percent of a crop, stray glints
 *  well under one. */
export const CLIPPED_FILM_MAX = 0.01;

/** Percentile of the film's brightest channel taken as its brightest
 *  part (the rebate, when in view), ignoring a few hot pixels. */
export const BRIGHT_PERCENTILE = 0.99;

/**
 * Least red-to-blue ratio, in linear light, of C-41 film: the orange mask
 * passes two to four times more red than blue everywhere on the film, so a
 * bright pixel any closer to neutral is light-table light (the same test
 * `detectFilmBase` uses).
 */
export const C41_MIN_RED_BLUE = 1.3;

/** Fewer film pixels than this and there is nothing to meter. */
const MIN_FILM_PIXELS = 64;

export interface FilmExposure {
  /** Film pixels measured (light-table pixels excluded). */
  pixels: number;
  /** Blue code value of the densest film ({@link DENSE_PERCENTILE}). */
  denseBlue: number;
  /** Share of film pixels with blue at the noise floor. */
  blueClipped: number;
  /** Brightest channel of the brightest film ({@link BRIGHT_PERCENTILE});
   *  C-41 only, 0 for B&W. */
  brightFilm: number;
  /** Share of film pixels with some channel clipped; C-41 only. */
  clippedFilm: number;
}

/** Index of the `p` quantile in a histogram of `count` values. */
function percentile(histogram: Uint32Array, count: number, p: number): number {
  const rank = Math.floor(p * (count - 1));
  let seen = 0;
  for (let v = 0; v < histogram.length; v++) {
    seen += histogram[v];
    if (seen > rank) return v;
  }
  return histogram.length - 1;
}

/**
 * Pixels within this many of bare light-table light are left out of the
 * bright-end statistics: edges of the light table, the holder and the film
 * blend film with white, so one channel clips while another does not.
 */
export const LIGHT_EDGE_MARGIN = 2;

/**
 * Which pixels of `rect` are within `margin` (in rows and columns) of a pixel
 * clipped white in every channel, as a row-major mask over `rect`.
 */
function nearLight(image: RgbaImage, rect: PixelRect, margin: number) {
  const { width, height } = rect;
  const light = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = ((rect.y + y) * image.width + rect.x + x) * 4;
      if (
        image.data[i] >= LIGHT_BYTE &&
        image.data[i + 1] >= LIGHT_BYTE &&
        image.data[i + 2] >= LIGHT_BYTE
      ) {
        light[y * width + x] = 1;
      }
    }
  }
  // Dilate: along rows, then along columns.
  const across = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let d = -margin; d <= margin; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < width && light[y * width + xx]) {
          across[y * width + x] = 1;
          break;
        }
      }
    }
  }
  const near = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let d = -margin; d <= margin; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < height && across[yy * width + x]) {
          near[y * width + x] = 1;
          break;
        }
      }
    }
  }
  return { light, near };
}

/**
 * Measure the film inside `region`: its blue (the densest film), and for
 * C-41 its brightest part (the base, which must not clip). Pixels clipped to
 * white in every channel are light-table light, not film, and are skipped.
 *
 * The bright end is C-41 only, and counts only orange pixels clear of the
 * light's edges, so light-table light and film/light blends are not taken
 * for film. B&W has no such tell (its base is as neutral as the light), so
 * there the bright end is left at 0 and clipping is judged from the sampled
 * base alone. Returns null when too little film is in view.
 */
export function measureFilmExposure(
  image: RgbaImage,
  region: PixelRect,
  filmType: NegativeFilmType
): FilmExposure | null {
  const rect = clampRect(region, image.width, image.height);
  const { light, near } = nearLight(image, rect, LIGHT_EDGE_MARGIN);
  const blue = new Uint32Array(256);
  const bright = new Uint32Array(256);
  let pixels = 0;
  let brightPixels = 0;
  let clipped = 0;
  for (let y = 0; y < rect.height; y++) {
    for (let x = 0; x < rect.width; x++) {
      const m = y * rect.width + x;
      if (light[m]) continue;
      const i = ((rect.y + y) * image.width + rect.x + x) * 4;
      const r = image.data[i];
      const g = image.data[i + 1];
      const b = image.data[i + 2];
      blue[b]++;
      pixels++;
      if (
        filmType !== 'c41' ||
        near[m] ||
        byteToLinear(r) < C41_MIN_RED_BLUE * byteToLinear(b)
      ) {
        continue;
      }
      const top = Math.max(r, g, b);
      bright[top]++;
      brightPixels++;
      if (top >= BASE_CLIP_BYTE) clipped++;
    }
  }
  if (pixels < MIN_FILM_PIXELS) return null;
  let crushed = 0;
  for (let v = 0; v <= BLUE_NOISE_FLOOR; v++) crushed += blue[v];
  return {
    pixels,
    denseBlue: percentile(blue, pixels, DENSE_PERCENTILE),
    blueClipped: crushed / pixels,
    brightFilm:
      brightPixels > 0
        ? percentile(bright, brightPixels, BRIGHT_PERCENTILE)
        : 0,
    clippedFilm: clipped / pixels,
  };
}

/** True when enough of the film's blue is lost to warn about it. */
export function isBlueClipping(exposure: FilmExposure | null): boolean {
  return exposure !== null && exposure.blueClipped > BLUE_CLIP_WARN;
}

/** Brightest channel of a linear colour, as an sRGB code value. */
function maxByte(rgb: Rgb): number {
  return Math.max(...rgb.map((c) => linearToSrgb(c) * 255));
}

/** Stops between two code values, in linear light. */
function stops(from: number, to: number): number {
  return Math.log2(byteToLinear(to) / byteToLinear(Math.max(1, from)));
}

/**
 * How far to move the exposure bias, in EV (positive brightens), from the
 * film's measurements and the film base (linear, as measured; null if not
 * found).
 *
 * - Clipping comes first, whether the base reads clipped or the film's
 *   brightest pixels are ({@link CLIPPED_FILM_MAX}): a clipped base loses
 *   the reference every density is measured from, so step down. The film's
 *   own pixels are checked because a detected base is a median and may not
 *   read as clipped when the rebate is.
 * - No base: hold. Without one there is no telling how much headroom is left.
 * - Densest blue under {@link DENSE_BLUE_MIN}: brighten towards
 *   {@link DENSE_BLUE_TARGET}, but no further than keeps both the base and
 *   the film's brightest part at {@link BASE_MAX_BYTE}.
 * - Otherwise hold. More exposure would cost the base its headroom and gain
 *   the film nothing it needs.
 */
export function exposureCorrection(
  exposure: FilmExposure,
  base: Rgb | null
): number {
  const baseByte = base ? maxByte(base) : null;
  if (
    (baseByte !== null && baseByte >= BASE_CLIP_BYTE) ||
    exposure.clippedFilm > CLIPPED_FILM_MAX
  ) {
    return -BASE_CLIP_STEP;
  }
  if (baseByte === null) return 0;
  if (exposure.denseBlue >= DENSE_BLUE_MIN) return 0;
  const want = stops(exposure.denseBlue, DENSE_BLUE_TARGET);
  const room = stops(Math.max(baseByte, exposure.brightFilm), BASE_MAX_BYTE);
  const step = Math.min(want, room, MAX_EXPOSURE_STEP);
  return step >= MIN_EXPOSURE_STEP ? step : 0;
}

/**
 * The next exposure bias: `current` moved by `step`, kept inside the device's
 * range and {@link BIAS_LIMIT}, to a hundredth of a stop.
 */
export function nextExposureBias(
  current: number,
  step: number,
  deviceMin: number,
  deviceMax: number
): number {
  const lo = Math.max(deviceMin, -BIAS_LIMIT);
  const hi = Math.min(deviceMax, BIAS_LIMIT);
  if (lo > hi) return current;
  const next = Math.max(lo, Math.min(hi, current + step));
  return Math.round(next * 100) / 100;
}
