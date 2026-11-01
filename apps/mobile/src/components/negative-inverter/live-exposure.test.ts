import { byteToLinear, type Rgb, type RgbaImage } from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import {
  BASE_CLIP_STEP,
  BIAS_LIMIT,
  DENSE_BLUE_TARGET,
  exposureCorrection,
  type FilmExposure,
  isBlueClipping,
  MAX_EXPOSURE_STEP,
  measureFilmExposure,
  nextExposureBias,
} from './live-exposure';

/** An image whose pixels come from `pixel(col, row)`. */
function image(
  width: number,
  height: number,
  pixel: (col: number, row: number) => [number, number, number]
): RgbaImage {
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const [r, g, b] = pixel(col, row);
      data.set([r, g, b, 255], (row * width + col) * 4);
    }
  }
  return { data, width, height };
}

const full = (img: RgbaImage) => ({
  x: 0,
  y: 0,
  width: img.width,
  height: img.height,
});

/** Linear colour of an sRGB byte triple. */
const linear = (r: number, g: number, b: number): Rgb => [
  byteToLinear(r),
  byteToLinear(g),
  byteToLinear(b),
];

describe('measureFilmExposure', () => {
  it('skips the light table and finds the densest blue', () => {
    // Left half bare light table (clipped white); right half orange film
    // whose blue runs 0..99 down the rows.
    const img = image(20, 100, (col, row) =>
      col < 10 ? [255, 255, 255] : [200, 120, row]
    );
    const m = measureFilmExposure(img, full(img), 'c41');
    expect(m?.pixels).toBe(1000);
    // Rows 0, 1 and 2 are at the noise floor: 3% of the film.
    expect(m?.blueClipped).toBeCloseTo(0.03, 6);
    // The 1st percentile of 0..99, ten pixels per value.
    expect(m?.denseBlue).toBe(0);
    expect(m?.brightFilm).toBe(200);
    expect(m?.clippedFilm).toBe(0);
  });

  it('reads only inside the region', () => {
    const img = image(20, 10, (col) => (col < 10 ? [90, 60, 0] : [90, 60, 40]));
    const m = measureFilmExposure(
      img,
      { x: 10, y: 0, width: 10, height: 10 },
      'c41'
    );
    expect(m).toEqual({
      pixels: 100,
      denseBlue: 40,
      blueClipped: 0,
      brightFilm: 90,
      clippedFilm: 0,
    });
  });

  it('counts a rebate clipped in red as clipped film', () => {
    // A tenth of the film is rebate with red blown out.
    const img = image(10, 100, (_, row) =>
      row < 10 ? [255, 170, 100] : [180, 100, 30]
    );
    const m = measureFilmExposure(img, full(img), 'c41');
    expect(m?.clippedFilm).toBeCloseTo(0.1, 6);
    expect(m?.brightFilm).toBe(255);
  });

  it('does not take unclipped light-table light for C-41 film', () => {
    // Near-white light at 240 beside dim orange film.
    const img = image(20, 20, (col) =>
      col < 10 ? [240, 240, 238] : [150, 90, 40]
    );
    const m = measureFilmExposure(img, full(img), 'c41');
    expect(m?.brightFilm).toBe(150);
  });

  it('leaves out the blend along the light-table edge (C-41)', () => {
    // Clipped light, then two columns where white blends into the orange
    // rebate (red clipped, still orange), then film.
    const img = image(40, 40, (col) =>
      col < 10 ? [255, 255, 255] : col < 12 ? [255, 230, 190] : [180, 100, 30]
    );
    const m = measureFilmExposure(img, full(img), 'c41');
    expect(m?.clippedFilm).toBe(0);
    expect(m?.brightFilm).toBe(180);
    expect(exposureCorrection(m ?? film(0), linear(180, 100, 30))).toBe(0);
  });

  it('does not latch a B&W negative underexposed at the light-table edge', () => {
    // Full frame: clipped light, a one-sided blend at its edge (one channel
    // clipped, one not), dim neutral film whose densest part is crushed.
    const img = image(40, 40, (col, row) =>
      col < 10
        ? [255, 255, 255]
        : col < 12
          ? [252, 248, 244]
          : row < 4
            ? [3, 3, 3]
            : [120, 120, 120]
    );
    const m = measureFilmExposure(img, full(img), 'bw');
    expect(m?.clippedFilm).toBe(0);
    expect(m?.brightFilm).toBe(0);
    // With a well-exposed base it brightens instead of stepping down.
    expect(exposureCorrection(m ?? film(0), linear(130, 130, 130))).toBe(
      MAX_EXPOSURE_STEP
    );
  });

  it('gives up when the region is all light table', () => {
    const img = image(20, 20, () => [255, 254, 252]);
    expect(measureFilmExposure(img, full(img), 'c41')).toBeNull();
  });
});

const film = (denseBlue: number, more: Partial<FilmExposure> = {}) => ({
  pixels: 1000,
  denseBlue,
  blueClipped: denseBlue <= 2 ? 0.2 : 0,
  brightFilm: 150,
  clippedFilm: 0,
  ...more,
});

describe('isBlueClipping', () => {
  it('warns past one percent of the film', () => {
    expect(isBlueClipping(film(0, { blueClipped: 0.35 }))).toBe(true);
    expect(isBlueClipping(film(0, { blueClipped: 0.005 }))).toBe(false);
    expect(isBlueClipping(null)).toBe(false);
  });
});

describe('exposureCorrection', () => {
  // A typical orange mask, exposed with plenty of headroom.
  const dimBase = linear(150, 90, 50);

  it('brightens crushed blue, a stop at a time', () => {
    expect(exposureCorrection(film(0), dimBase)).toBe(MAX_EXPOSURE_STEP);
  });

  it('brightens blue just under the threshold by the full step', () => {
    // From 7 to the target of 16 is more than a stop in linear light.
    expect(exposureCorrection(film(7), dimBase)).toBe(MAX_EXPOSURE_STEP);
    expect(
      Math.log2(byteToLinear(DENSE_BLUE_TARGET) / byteToLinear(7))
    ).toBeGreaterThan(MAX_EXPOSURE_STEP);
  });

  it('stops short of clipping the base', () => {
    // Red at 230 leaves well under a stop before the base reaches 240.
    const step = exposureCorrection(film(0), linear(230, 140, 70));
    expect(step).toBeGreaterThan(0);
    expect(step).toBeLessThan(0.2);
    expect(byteToLinear(230) * 2 ** step).toBeCloseTo(byteToLinear(240), 6);
  });

  it('stops short of clipping the brightest film, if brighter than the base', () => {
    const step = exposureCorrection(film(0, { brightFilm: 230 }), dimBase);
    expect(byteToLinear(230) * 2 ** step).toBeCloseTo(byteToLinear(240), 6);
  });

  it('steps down when the base has clipped', () => {
    expect(exposureCorrection(film(30), linear(255, 160, 80))).toBe(
      -BASE_CLIP_STEP
    );
  });

  it('steps down when the film clipped though the base median did not', () => {
    expect(
      exposureCorrection(film(0, { clippedFilm: 0.05 }), linear(235, 150, 80))
    ).toBe(-BASE_CLIP_STEP);
    expect(exposureCorrection(film(0, { clippedFilm: 0.05 }), null)).toBe(
      -BASE_CLIP_STEP
    );
  });

  it('holds without a base rather than climb blind', () => {
    expect(exposureCorrection(film(0), null)).toBe(0);
  });

  it('holds when the film keeps its blue', () => {
    expect(exposureCorrection(film(20), dimBase)).toBe(0);
  });

  it('holds rather than make a change too small to matter', () => {
    expect(exposureCorrection(film(0), linear(239, 150, 70))).toBe(0);
  });
});

describe('nextExposureBias', () => {
  it('moves by the step inside the device range', () => {
    expect(nextExposureBias(0.5, 1, -8, 8)).toBe(1.5);
  });

  it('keeps to the device range and the app limit', () => {
    expect(nextExposureBias(1.5, 1, -2, 2)).toBe(2);
    expect(nextExposureBias(2.5, 1, -8, 8)).toBe(BIAS_LIMIT);
    expect(nextExposureBias(-2.9, -1, -8, 8)).toBe(-BIAS_LIMIT);
  });

  it('rounds to a hundredth of a stop', () => {
    expect(nextExposureBias(0, 1 / 3, -8, 8)).toBe(0.33);
  });

  it('stays put on a device without exposure bias', () => {
    expect(nextExposureBias(0, 1, 0, 0)).toBe(0);
  });
});
