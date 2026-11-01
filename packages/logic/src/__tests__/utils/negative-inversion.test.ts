import { describe, expect, it } from 'vitest';
import {
  analyzeNegative,
  AUTO_BASE_MIN_CONFIDENCE,
  AUTO_BASE_SAMPLE_TARGET,
  byteToLinear,
  clampRect,
  DEFAULT_SATURATION,
  deriveCoefficients,
  detectFilmBase,
  type InversionCoefficients,
  invertImage,
  invertPixel,
  linearToSrgb,
  type NegativeFilmType,
  neutralOffset,
  PRINT_DMAX,
  PRINT_DMIN,
  printCurve,
  type Rgb,
  type RgbaImage,
  samplePatch,
  srgbToLinear,
  STATS_SAMPLE_TARGET,
} from '../../utils/negative-inversion';

/**
 * A synthetic negative photographed on a light table.
 *
 * The scene is a horizontal step wedge of neutral greys (scene luminance
 * 0.02..0.9). Each channel of the negative transmits
 * `base_c * 10^-(gamma_c * log10(scene / 0.02))`, i.e. density above base
 * rises with log exposure at a per-layer gamma, the way real film does. The
 * left `rebate` columns are unexposed film base, and an optional bright
 * surround (the bare light table) wraps the whole frame.
 */
const ORANGE_MASK: Rgb = [0.75, 0.42, 0.2];
const C41_GAMMA: Rgb = [0.55, 0.62, 0.7];
const BW_BASE: Rgb = [0.8, 0.8, 0.8];
const BW_GAMMA: Rgb = [0.6, 0.6, 0.6];
const SCENE = [0.02, 0.05, 0.1, 0.18, 0.3, 0.5, 0.9];

interface Negative extends RgbaImage {
  data: Uint8ClampedArray;
  /** Frame rectangle, excluding the surround. */
  frame: { x: number; y: number; width: number; height: number };
  /** Centre x of each scene step. */
  stepCentres: number[];
  rowCentre: number;
}

/**
 * `holes` punches sprocket holes (bare light-table light) into the rebate,
 * inside the frame, the way a crop around a whole 35mm strip includes them.
 */
function makeNegative(
  base: Rgb,
  gamma: Rgb,
  surround = 0,
  holes = false
): Negative {
  const stepWidth = 10;
  const rebate = 12;
  const frameWidth = rebate + SCENE.length * stepWidth;
  const frameHeight = 20;
  const width = frameWidth + surround * 2;
  const height = frameHeight + surround * 2;
  const data = new Uint8ClampedArray(width * height * 4);
  const toByte = (linear: number) =>
    Math.round(linearToSrgb(Math.min(1, linear)) * 255);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const fx = x - surround;
      const fy = y - surround;
      let linear: Rgb;
      if (fx < 0 || fy < 0 || fx >= frameWidth || fy >= frameHeight) {
        linear = [1, 1, 1];
      } else if (holes && fx < 3 && fy % 6 < 3) {
        linear = [1, 1, 1];
      } else if (fx < rebate) {
        linear = base;
      } else {
        const scene = SCENE[Math.floor((fx - rebate) / stepWidth)];
        const logE = Math.log10(scene / 0.02);
        const channel = (c: 0 | 1 | 2) => base[c] * 10 ** -(gamma[c] * logE);
        linear = [channel(0), channel(1), channel(2)];
      }
      data[i] = toByte(linear[0]);
      data[i + 1] = toByte(linear[1]);
      data[i + 2] = toByte(linear[2]);
      data[i + 3] = 255;
    }
  }
  return {
    data,
    width,
    height,
    frame: { x: surround, y: surround, width: frameWidth, height: frameHeight },
    stepCentres: SCENE.map(
      (_, s) => surround + rebate + s * stepWidth + stepWidth / 2
    ),
    rowCentre: surround + frameHeight / 2,
  };
}

function pixelAt(image: RgbaImage, x: number, y: number): Rgb {
  const i = (y * image.width + x) * 4;
  return [
    byteToLinear(image.data[i]),
    byteToLinear(image.data[i + 1]),
    byteToLinear(image.data[i + 2]),
  ];
}

function convert(
  negative: Negative,
  filmType: NegativeFilmType,
  adjustments?: Parameters<typeof deriveCoefficients>[0]['adjustments']
) {
  const base = samplePatch(
    negative,
    negative.frame.x + 5,
    negative.rowCentre,
    9
  );
  if (!base) throw new Error('base sample missing');
  const statistics = analyzeNegative({
    image: negative,
    filmType,
    base,
    region: negative.frame,
  });
  return {
    base,
    statistics,
    coeffs: deriveCoefficients({ statistics, adjustments }),
  };
}

function stepOutputs(negative: Negative, coeffs: InversionCoefficients) {
  return negative.stepCentres.map((x) =>
    invertPixel(pixelAt(negative, x, negative.rowCentre), coeffs)
  );
}

const spread = (v: Rgb) => Math.max(...v) - Math.min(...v);
const lightness = (v: Rgb) => (v[0] + v[1] + v[2]) / 3;

/**
 * Colour negatives as real C-41 behaves: each dye layer has its own
 * characteristic curve with a toe and a shoulder (logistic in log exposure),
 * under the orange mask. Pixels are scrambled over a 2D frame so the
 * statistics' edge inset trims every part of the scene alike.
 */
type Film = (c: 0 | 1 | 2, logE: number) => number;

function logisticFilm(
  layers: readonly { dmax: number; mid: number; slope: number }[]
): Film {
  return (c, logE) => {
    const { dmax, mid, slope } = layers[c];
    const f = (x: number) => dmax / (1 + Math.exp(-slope * (x - mid)));
    return f(logE) - f(0);
  };
}

const C41_FILM = logisticFilm([
  { dmax: 1.05, mid: 0.85, slope: 3.4 },
  { dmax: 1.15, mid: 0.8, slope: 3.6 },
  { dmax: 1.3, mid: 0.76, slope: 3.8 },
]);

const toByte = (linear: number) =>
  Math.round(linearToSrgb(Math.min(1, linear)) * 255);

function filmPixel(film: Film, e: Rgb, base: Rgb = ORANGE_MASK): Rgb {
  return [
    byteToLinear(toByte(base[0] * 10 ** -film(0, e[0]))),
    byteToLinear(toByte(base[1] * 10 ** -film(1, e[1]))),
    byteToLinear(toByte(base[2] * 10 ** -film(2, e[2]))),
  ];
}

function filmFrame(film: Film, scene: Rgb[], width = 200): RgbaImage {
  const height = Math.ceil(scene.length / width);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let k = 0; k < width * height; k++) {
    const linear = filmPixel(film, scene[(k * 7919) % scene.length]);
    data.set(
      [toByte(linear[0]), toByte(linear[1]), toByte(linear[2]), 255],
      k * 4
    );
  }
  return { data, width, height };
}

const ramp = (n: number, from: number, to: number, colour: Rgb = [0, 0, 0]) =>
  Array.from({ length: n }, (_, k): Rgb => {
    const e = from + ((to - from) * (k % 100)) / 99;
    return [e + colour[0], e + colour[1], e + colour[2]];
  });

/** A neutral grey scale from the base to the brightest highlight. */
const GREYS = Array.from({ length: 3000 }, (_, k): Rgb => {
  const e = (1.65 * k) / 2999;
  return [e, e, e];
});
const REBATE = Array.from({ length: 300 }, (): Rgb => [0, 0, 0]);
/** Green leaves, blue sky, and a bright tungsten-lit (warm) wall. */
const FOLIAGE = Array.from({ length: 60 }, () =>
  ramp(100, 0.4, 1.0, [0, 0.25, -0.05])
).flat();
const SKY = Array.from({ length: 60 }, () =>
  ramp(100, 0.6, 1.1, [-0.15, 0, 0.2])
).flat();
const WARM_WALL = Array.from({ length: 40 }, () =>
  ramp(100, 1.2, 1.55, [0.2, 0, -0.3])
).flat();

function c41Coefficients(image: RgbaImage) {
  return deriveCoefficients({
    statistics: analyzeNegative({ image, filmType: 'c41', base: ORANGE_MASK }),
  });
}

/** Worst channel spread of neutral greys through shadows to highlights. */
function greyCast(film: Film, coeffs: InversionCoefficients): number {
  return Math.max(
    ...[0.3, 0.6, 0.9, 1.2, 1.5].map((e) =>
      spread(invertPixel(filmPixel(film, [e, e, e]), coeffs))
    )
  );
}

describe('sRGB transfer', () => {
  it('round-trips', () => {
    for (const v of [0, 0.002, 0.04, 0.2, 0.5, 1]) {
      expect(linearToSrgb(srgbToLinear(v))).toBeCloseTo(v, 10);
    }
  });

  it('maps bytes to linear light', () => {
    expect(byteToLinear(0)).toBe(0);
    expect(byteToLinear(255)).toBeCloseTo(1, 10);
    expect(byteToLinear(128)).toBeCloseTo(0.2158, 3);
  });
});

describe('clampRect', () => {
  it('clips to the image and rounds outward', () => {
    expect(
      clampRect({ x: -5, y: 2.5, width: 20, height: 3.2 }, 10, 10)
    ).toEqual({
      x: 0,
      y: 2,
      width: 10,
      height: 4,
    });
  });

  it('collapses a rectangle outside the image to zero size', () => {
    expect(
      clampRect({ x: 20, y: 20, width: 5, height: 5 }, 10, 10)
    ).toMatchObject({
      width: 0,
      height: 0,
    });
  });
});

describe('samplePatch', () => {
  it('returns the median, ignoring a dust speck', () => {
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA);
    const x = negative.frame.x + 5;
    const y = negative.rowCentre;
    const i = (y * negative.width + x) * 4;
    const { data } = negative;
    data[i] = data[i + 1] = data[i + 2] = 0;

    const base = samplePatch(negative, x, y, 5);
    expect(base?.[0]).toBeCloseTo(ORANGE_MASK[0], 2);
    expect(base?.[1]).toBeCloseTo(ORANGE_MASK[1], 2);
    expect(base?.[2]).toBeCloseTo(ORANGE_MASK[2], 2);
  });

  it('returns null outside the image', () => {
    const negative = makeNegative(BW_BASE, BW_GAMMA);
    expect(samplePatch(negative, -100, -100, 9)).toBeNull();
  });
});

describe('print curve', () => {
  it('rises from paper white to maximum black and stays finite', () => {
    let previous = printCurve(-1e6);
    // The soft toe's tail reaches a hair under paper white's density.
    expect(previous).toBeCloseTo(PRINT_DMIN, 2);
    for (let v = -3; v <= 4; v += 0.05) {
      const d = printCurve(v);
      expect(d).toBeGreaterThan(previous);
      previous = d;
    }
    expect(printCurve(1e6)).toBeCloseTo(PRINT_DMAX, 6);
    expect(Number.isFinite(printCurve(1e308))).toBe(true);
  });

  it('is close to linear through the midtones', () => {
    expect(printCurve(0.75)).toBeCloseTo(0.75, 1);
    expect(printCurve(1.2)).toBeCloseTo(1.2, 1);
  });
});

describe('black and white conversion', () => {
  it('turns the step wedge into a rising positive with clean ends', () => {
    const negative = makeNegative(BW_BASE, BW_GAMMA);
    const outputs = stepOutputs(negative, convert(negative, 'bw').coeffs);
    for (let s = 1; s < outputs.length; s++) {
      expect(outputs[s][1]).toBeGreaterThan(outputs[s - 1][1]);
    }
    for (const [r, g, b] of outputs) {
      expect(r).toBe(g);
      expect(b).toBe(g);
    }
    // The soft toe keeps a little separation above maximum black.
    expect(outputs[0][1]).toBeLessThan(0.16);
    expect(outputs.at(-1)?.[1]).toBeGreaterThan(0.85);
  });

  it('prints the film base near maximum black', () => {
    const negative = makeNegative(BW_BASE, BW_GAMMA);
    const { base, coeffs } = convert(negative, 'bw');
    for (const v of invertPixel(base, coeffs)) expect(v).toBeLessThan(0.16);
  });

  it('is monotonic across the whole density range', () => {
    const negative = makeNegative(BW_BASE, BW_GAMMA);
    const { base, coeffs } = convert(negative, 'bw');
    let previous = -1;
    for (let d = -0.2; d <= 2; d += 0.01) {
      const [v] = invertPixel(
        [base[0] * 10 ** -d, base[1] * 10 ** -d, base[2] * 10 ** -d],
        coeffs
      );
      expect(v).toBeGreaterThanOrEqual(previous);
      previous = v;
    }
  });

  it('ignores the light-table surround when the crop excludes it', () => {
    const plain = makeNegative(BW_BASE, BW_GAMMA);
    const surrounded = makeNegative(BW_BASE, BW_GAMMA, 6);
    const a = convert(plain, 'bw').coeffs;
    const b = convert(surrounded, 'bw').coeffs;
    expect(b.densityLow[1]).toBeCloseTo(a.densityLow[1], 2);
    expect(b.densityHigh[1]).toBeCloseTo(a.densityHigh[1], 2);
  });

  it('brightens with exposure and steepens with contrast', () => {
    const negative = makeNegative(BW_BASE, BW_GAMMA);
    const mid = pixelAt(negative, negative.stepCentres[3], negative.rowCentre);
    const at = (adjustments: { exposure?: number; contrast?: number }) =>
      invertPixel(mid, convert(negative, 'bw', adjustments).coeffs)[1];
    expect(at({ exposure: 1 })).toBeGreaterThan(at({}));
    expect(at({ exposure: -1 })).toBeLessThan(at({}));
    const low = pixelAt(negative, negative.stepCentres[1], negative.rowCentre);
    const high = pixelAt(negative, negative.stepCentres[5], negative.rowCentre);
    const range = (contrast: number) => {
      const { coeffs } = convert(negative, 'bw', { contrast });
      return invertPixel(high, coeffs)[1] - invertPixel(low, coeffs)[1];
    };
    expect(range(1.5)).toBeGreaterThan(range(1));
  });

  it('ignores warmth, tint, saturation and the neutral picker', () => {
    const negative = makeNegative(BW_BASE, BW_GAMMA);
    const plain = convert(negative, 'bw').coeffs;
    const tinted = convert(negative, 'bw', {
      warmth: 1,
      tint: -1,
      saturation: 2,
    }).coeffs;
    expect(tinted).toEqual(plain);
    expect(neutralOffset([0.3, 0.2, 0.1], plain)).toEqual([0, 0, 0]);
  });
});

describe('C-41 conversion', () => {
  it('removes the orange mask on straight-line film', () => {
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA);
    const outputs = stepOutputs(negative, convert(negative, 'c41').coeffs);
    for (const rgb of outputs.slice(1, -1)) {
      expect(spread(rgb)).toBeLessThan(0.03);
    }
    for (let s = 1; s < outputs.length; s++) {
      expect(outputs[s][1]).toBeGreaterThan(outputs[s - 1][1]);
    }
  });

  it('keeps the rebate black and neutral with sprocket holes in the crop', () => {
    // Holes are bare light; counted as film they would drag each channel's
    // black end by a different amount.
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA, 0, true);
    const { base, coeffs } = convert(negative, 'c41');
    const rebate = invertPixel(base, coeffs);
    for (const v of rebate) expect(v).toBeLessThan(0.16);
    expect(spread(rebate)).toBeLessThan(0.02);
  });

  it('ignores channels clipped to black by the camera', () => {
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA);
    const clean = convert(negative, 'c41').coeffs;
    const x0 = (negative.stepCentres.at(-1) ?? 0) - 5;
    for (let y = 0; y < negative.height / 2; y++) {
      for (let x = x0; x < x0 + 10; x++) {
        negative.data[(y * negative.width + x) * 4 + 2] = 0;
      }
    }
    const clipped = convert(negative, 'c41').coeffs;
    expect(clipped.densityHigh[2]).toBeCloseTo(clean.densityHigh[2], 1);
  });

  it.each([
    ['foliage', FOLIAGE],
    ['sky', SKY],
  ])('adds no cast to a %s-dominated frame', (_, colour) => {
    const image = filmFrame(C41_FILM, [...GREYS, ...REBATE, ...colour]);
    const greysOnly = filmFrame(C41_FILM, [...GREYS, ...REBATE]);
    expect(greyCast(C41_FILM, c41Coefficients(image))).toBeLessThanOrEqual(
      greyCast(C41_FILM, c41Coefficients(greysOnly)) + 0.01
    );
  });

  it('keeps a tungsten-lit wall warm while the greys stay neutral', () => {
    const image = filmFrame(C41_FILM, [...GREYS, ...REBATE, ...WARM_WALL]);
    const coeffs = c41Coefficients(image);
    const [r, , b] = invertPixel(filmPixel(C41_FILM, [1.6, 1.4, 1.1]), coeffs);
    expect(r - b).toBeGreaterThan(0.1);
    const greysOnly = c41Coefficients(
      filmFrame(C41_FILM, [...GREYS, ...REBATE])
    );
    expect(greyCast(C41_FILM, coeffs)).toBeLessThan(
      greyCast(C41_FILM, greysOnly) + 0.02
    );
  });

  it('prints the metered midtone as a mid-grey', () => {
    const image = filmFrame(C41_FILM, [...GREYS, ...REBATE]);
    const coeffs = c41Coefficients(image);
    const [, g] = invertPixel(filmPixel(C41_FILM, [0.8, 0.8, 0.8]), coeffs);
    expect(g).toBeGreaterThan(0.4);
    expect(g).toBeLessThan(0.65);
  });

  it('applies warmth and tint as filtration, leaving white and black clean', () => {
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA);
    const plain = convert(negative, 'c41').coeffs;
    const mid = pixelAt(negative, negative.stepCentres[3], negative.rowCentre);
    const p = invertPixel(mid, plain);
    const warm = invertPixel(
      mid,
      convert(negative, 'c41', { warmth: 1 }).coeffs
    );
    expect(warm[0]).toBeGreaterThan(p[0]);
    expect(warm[2]).toBeLessThan(p[2]);
    const green = invertPixel(
      mid,
      convert(negative, 'c41', { tint: 1 }).coeffs
    );
    expect(green[1]).toBeGreaterThan(p[1]);
    // Filtration moves exposure, not the paper: past either end of its
    // range everything converges on paper white or maximum black.
    const tinted = convert(negative, 'c41', { warmth: 1, tint: -1 }).coeffs;
    const veryThin: Rgb = [
      ORANGE_MASK[0] * 10,
      ORANGE_MASK[1] * 10,
      ORANGE_MASK[2] * 10,
    ];
    const veryDense: Rgb = [
      ORANGE_MASK[0] * 1e-3,
      ORANGE_MASK[1] * 1e-3,
      ORANGE_MASK[2] * 1e-3,
    ];
    expect(spread(invertPixel(veryThin, tinted))).toBeLessThan(0.02);
    expect(spread(invertPixel(veryDense, tinted))).toBeLessThan(0.02);
  });

  it('scales saturation in print density and leaves greys grey', () => {
    const image = filmFrame(C41_FILM, [...GREYS, ...REBATE]);
    const statistics = analyzeNegative({
      image,
      filmType: 'c41',
      base: ORANGE_MASK,
    });
    const at = (saturation: number, e: Rgb) =>
      invertPixel(
        filmPixel(C41_FILM, e),
        deriveCoefficients({ statistics, adjustments: { saturation } })
      );
    const leaf: Rgb = [0.6, 0.9, 0.55];
    expect(spread(at(1.5, leaf))).toBeGreaterThan(spread(at(1, leaf)));
    expect(spread(at(0, leaf))).toBeLessThan(0.005);
    expect(DEFAULT_SATURATION).toBe(1);
  });

  it('neutral picker makes the picked colour an exact grey', () => {
    const image = filmFrame(C41_FILM, [...GREYS, ...REBATE]);
    const statistics = analyzeNegative({
      image,
      filmType: 'c41',
      base: ORANGE_MASK,
    });
    const picked = filmPixel(C41_FILM, [0.9, 0.75, 1.0]);
    for (const adjustments of [{}, { exposure: 0.5, contrast: 1.4 }]) {
      const plain = deriveCoefficients({ statistics, adjustments });
      const neutral = neutralOffset(picked, plain);
      const fixed = deriveCoefficients({ statistics, adjustments, neutral });
      const [r, g, b] = invertPixel(picked, fixed);
      expect(r).toBeCloseTo(g, 9);
      expect(b).toBeCloseTo(g, 9);
      // Picking again from the plain coefficients gives the same answer:
      // the correction replaces, never compounds.
      expect(neutralOffset(picked, plain)).toEqual(neutral);
    }
  });

  it('beats a naive RGB invert, which leaves a strong cast', () => {
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA);
    const x = negative.stepCentres[3];
    const i = (negative.rowCentre * negative.width + x) * 4;
    const naive = [0, 1, 2].map((c) => 1 - negative.data[i + c] / 255);
    expect(naive[2] - naive[0]).toBeGreaterThan(0.2);
  });
});

describe('phone captures', () => {
  /**
   * The same straight-line C-41 frame photographed at a given camera
   * exposure: under a bright light table the phone underexposes the film,
   * and blue, the darkest channel under the orange mask, is crushed to 0
   * over the dense (bright-scene) half of the frame.
   */
  const WALL = 1.45;
  // As on real Portra photographed this way (rebate 191/107/67, a lamp-lit
  // wall 91/28/3): blue far below green, under a denser mask and layer.
  const MASK: Rgb = [0.75, 0.42, 0.12];
  const GAMMA: Rgb = [0.55, 0.62, 0.9];
  function captured(exposure: number, extra: Rgb[] = []): RgbaImage {
    const scene: Rgb[] = [
      ...GREYS,
      ...REBATE,
      ...Array.from({ length: 1500 }, (): Rgb => [WALL, WALL, WALL]),
      ...extra,
    ];
    const width = 200;
    const height = Math.ceil(scene.length / width);
    const data = new Uint8ClampedArray(width * height * 4);
    for (let k = 0; k < width * height; k++) {
      const e = scene[(k * 7919) % scene.length];
      const linear = [0, 1, 2].map(
        (c) => exposure * MASK[c] * 10 ** -(GAMMA[c] * e[c])
      );
      data.set([...linear.map(toByte), 255], k * 4);
    }
    return { data, width, height };
  }
  const printOf = (image: RgbaImage, exposure: number, e: Rgb) => {
    const base: Rgb = [
      MASK[0] * exposure,
      MASK[1] * exposure,
      MASK[2] * exposure,
    ];
    const coeffs = deriveCoefficients({
      statistics: analyzeNegative({ image, filmType: 'c41', base }),
    });
    const linear: Rgb = [
      byteToLinear(toByte(base[0] * 10 ** -(GAMMA[0] * e[0]))),
      byteToLinear(toByte(base[1] * 10 ** -(GAMMA[1] * e[1]))),
      byteToLinear(toByte(base[2] * 10 ** -(GAMMA[2] * e[2]))),
    ];
    return invertPixel(linear, coeffs);
  };

  it('keeps a bright wall neutral when blue is crushed to black', () => {
    const exposure = 0.08;
    const image = captured(exposure);
    // The crush is real: a large share of the frame's blue reads 0..2.
    let crushed = 0;
    for (let i = 2; i < image.data.length; i += 4) {
      if (image.data[i] <= 2) crushed++;
    }
    expect(crushed / (image.data.length / 4)).toBeGreaterThan(0.3);
    const wall = printOf(image, exposure, [WALL, WALL, WALL]);
    const clean = printOf(captured(1), 1, [WALL, WALL, WALL]);
    // Without the clipped blocks' help the wall printed strongly blue.
    expect(spread(wall)).toBeLessThan(0.06);
    expect(Math.abs(lightness(wall) - lightness(clean))).toBeLessThan(0.08);
  });

  it('keeps greys neutral beside a big sky whose blue the capture crushed', () => {
    // The sky's crushed blue is estimated for the statistics (from green,
    // never below its clip level). The shipped model casts these greys by
    // 0.12, and an earlier version with a cast fit that took the estimated
    // sky for a grey by 0.10.
    const scene: Rgb[] = [
      ...Array.from({ length: 3000 }, (_, k): Rgb => {
        const e = (1.6 * k) / 2999;
        return [e, e, e];
      }),
      ...REBATE,
      ...Array.from({ length: 4000 }, (_, k): Rgb => {
        const lift = 0.05 * (k % 5);
        return [1 + lift, 1.2 + lift, 1.55 + lift];
      }),
    ];
    const exposure = 0.1;
    const width = 200;
    const height = Math.ceil(scene.length / width);
    const data = new Uint8ClampedArray(width * height * 4);
    for (let k = 0; k < width * height; k++) {
      const e = scene[(k * 7919) % scene.length];
      const linear = [0, 1, 2].map(
        (c) => exposure * MASK[c] * 10 ** -(GAMMA[c] * e[c])
      );
      data.set([...linear.map(toByte), 255], k * 4);
    }
    const image = { data, width, height };
    let crushed = 0;
    for (let i = 2; i < data.length; i += 4) if (data[i] <= 2) crushed++;
    expect(crushed / (width * height)).toBeGreaterThan(0.5);
    for (const e of [0.3, 0.6, 0.9, 1.2]) {
      expect(spread(printOf(image, exposure, [e, e, e]))).toBeLessThan(0.06);
    }
  });

  it('keeps a large uniform sky blue instead of making it the white point', () => {
    const sky: Rgb = [1.1, 1.25, 1.5];
    const image = captured(
      1,
      Array.from({ length: 4000 }, (): Rgb => sky)
    );
    const [r, , b] = printOf(image, 1, sky);
    expect(b - r).toBeGreaterThan(0.08);
  });
});

describe('degenerate input', () => {
  const finite = (coeffs: InversionCoefficients) => {
    const numbers = [
      ...coeffs.base,
      ...coeffs.densityLow,
      ...coeffs.densityHigh,
      ...coeffs.offset,
      coeffs.grade,
      coeffs.pivot,
      coeffs.saturation,
    ];
    for (const v of numbers) expect(Number.isFinite(v)).toBe(true);
    for (const v of invertPixel([0.3, 0.2, 0.1], coeffs)) {
      expect(Number.isFinite(v)).toBe(true);
    }
  };

  it.each(['bw', 'c41'] as const)(
    'survives a flat, all-base crop (%s)',
    (filmType) => {
      const flat: RgbaImage = {
        data: new Uint8ClampedArray(40 * 40 * 4).fill(180),
        width: 40,
        height: 40,
      };
      const base = samplePatch(flat, 20, 20) ?? [0.5, 0.5, 0.5];
      finite(
        deriveCoefficients({
          statistics: analyzeNegative({ image: flat, filmType, base }),
        })
      );
    }
  );

  it.each(['bw', 'c41'] as const)(
    'survives an empty crop and a black base (%s)',
    (filmType) => {
      const negative = makeNegative(ORANGE_MASK, C41_GAMMA);
      finite(
        deriveCoefficients({
          statistics: analyzeNegative({
            image: negative,
            filmType,
            base: [0, 0, 0],
            region: { x: 0, y: 0, width: 0, height: 0 },
          }),
        })
      );
    }
  );

  it('survives a single-pixel crop and an all-clipped image', () => {
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA);
    finite(
      deriveCoefficients({
        statistics: analyzeNegative({
          image: negative,
          filmType: 'c41',
          base: ORANGE_MASK,
          region: { x: 20, y: 5, width: 1, height: 1 },
        }),
      })
    );
    const black: RgbaImage = {
      data: new Uint8ClampedArray(16 * 16 * 4),
      width: 16,
      height: 16,
    };
    finite(
      deriveCoefficients({
        statistics: analyzeNegative({
          image: black,
          filmType: 'c41',
          base: ORANGE_MASK,
        }),
      })
    );
  });
});

describe('invertImage', () => {
  it('produces an opaque RGBA buffer matching invertPixel', () => {
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA);
    const { coeffs } = convert(negative, 'c41');
    const out = invertImage(negative, coeffs);
    expect(out).toHaveLength(negative.width * negative.height * 4);
    const x = negative.stepCentres[2];
    const y = negative.rowCentre;
    const i = (y * negative.width + x) * 4;
    const expected = invertPixel(pixelAt(negative, x, y), coeffs);
    expect(out[i]).toBe(Math.round(expected[0] * 255));
    expect(out[i + 1]).toBe(Math.round(expected[1] * 255));
    expect(out[i + 2]).toBe(Math.round(expected[2] * 255));
    expect(out[i + 3]).toBe(255);
  });
});

describe('detectFilmBase', () => {
  /** Density of the detected base relative to the true one, per channel. */
  function baseError(detected: Rgb, truth: Rgb): number {
    return Math.max(
      ...[0, 1, 2].map((c) => Math.abs(Math.log10(detected[c] / truth[c])))
    );
  }

  it('finds the orange mask with light-table surround and sprocket holes', () => {
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA, 6, true);
    const detected = detectFilmBase(negative, 'c41');
    expect(detected).not.toBeNull();
    expect(baseError(detected?.rgb ?? [1, 1, 1], ORANGE_MASK)).toBeLessThan(
      0.02
    );
    expect(detected?.confidence).toBeGreaterThanOrEqual(
      AUTO_BASE_MIN_CONFIDENCE
    );
  });

  it('points at a pixel of the rebate', () => {
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA, 6, true);
    const point = detectFilmBase(negative, 'c41')?.point;
    expect(point).toBeDefined();
    // Rebate columns sit just inside the surround.
    expect(point?.x).toBeGreaterThanOrEqual(6);
    expect(point?.x).toBeLessThan(6 + 12);
  });

  it('finds a B&W base inside a clipped light-table surround', () => {
    const negative = makeNegative(BW_BASE, BW_GAMMA, 6, true);
    const detected = detectFilmBase(negative, 'bw');
    expect(baseError(detected?.rgb ?? [1, 1, 1], BW_BASE)).toBeLessThan(0.02);
  });

  it('skips unclipped light-table light for B&W', () => {
    const base: Rgb = [0.45, 0.45, 0.45];
    const negative = makeNegative(base, BW_GAMMA, 6);
    // Re-expose the surround so the light table reads 0.85, not clipped.
    const light = Math.round(linearToSrgb(0.85) * 255);
    for (let y = 0; y < negative.height; y++) {
      for (let x = 0; x < negative.width; x++) {
        const inside =
          x >= negative.frame.x &&
          x < negative.frame.x + negative.frame.width &&
          y >= negative.frame.y &&
          y < negative.frame.y + negative.frame.height;
        if (inside) continue;
        const i = (y * negative.width + x) * 4;
        negative.data[i] = light;
        negative.data[i + 1] = light;
        negative.data[i + 2] = light;
      }
    }
    const detected = detectFilmBase(negative, 'bw');
    expect(baseError(detected?.rgb ?? [1, 1, 1], base)).toBeLessThan(0.02);
  });

  it('converts as well as a hand-picked base', () => {
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA, 6, true);
    const detected = detectFilmBase(negative, 'c41');
    if (!detected) throw new Error('no base detected');
    const coeffs = deriveCoefficients({
      statistics: analyzeNegative({
        image: negative,
        filmType: 'c41',
        base: detected.rgb,
        region: negative.frame,
      }),
    });
    for (const rgb of stepOutputs(negative, coeffs).slice(1, -1)) {
      expect(spread(rgb)).toBeLessThan(0.03);
    }
  });

  it('respects the region', () => {
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA, 6);
    // A crop from the second step on, so no rebate and no unexposed step:
    // the thinnest image area, which is denser than the base.
    const region = {
      x: negative.stepCentres[1] - 5,
      y: negative.frame.y,
      width: 60,
      height: negative.frame.height,
    };
    const detected = detectFilmBase(negative, 'c41', region);
    expect(detected).not.toBeNull();
    expect(detected?.rgb[0]).toBeLessThan(ORANGE_MASK[0] * 0.9);
    expect(detected?.point.x).toBeGreaterThanOrEqual(region.x);
  });

  /**
   * A frame of film on a light table, photographed with the light unclipped:
   * a rebate band of bare base round a denser image, the light all round,
   * an optional soft film edge and lens vignetting over everything.
   */
  function lightTable(
    base: Rgb,
    light: Rgb,
    { blur = 0, vignette = 0 } = {}
  ): RgbaImage {
    const W = 400;
    const H = 300;
    const data = new Uint8ClampedArray(W * H * 4);
    const fx0 = W * 0.15;
    const fx1 = W - fx0;
    const fy0 = H * 0.15;
    const fy1 = H * 0.85;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = Math.min(x - fx0, fx1 - x, y - fy0, fy1 - y);
        const t =
          blur > 0 ? Math.max(0, Math.min(1, 0.5 + d / blur)) : d >= 0 ? 1 : 0;
        const r2 = ((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2;
        const v = 1 - (vignette * r2) / 2;
        const inner =
          Math.abs(x - W / 2) < (fx1 - fx0) / 2 - 8 &&
          Math.abs(y - H / 2) < (fy1 - fy0) / 2 - 6;
        const i = (y * W + x) * 4;
        for (let c = 0; c < 3; c++) {
          const film = inner
            ? base[c] * 10 ** -(0.3 + (0.8 * ((x + y * 3) % 97)) / 97)
            : base[c];
          data[i + c] = Math.round(
            linearToSrgb((t * film + (1 - t) * light[c]) * v) * 255
          );
        }
        data[i + 3] = 255;
      }
    }
    return { data, width: W, height: H };
  }

  it('skips unclipped B&W light that vignetting spreads over a wide range', () => {
    const base: Rgb = [0.45, 0.45, 0.45];
    for (const blur of [0, 3]) {
      const detected = detectFilmBase(
        lightTable(base, [0.85, 0.85, 0.85], { blur, vignette: 0.4 }),
        'bw'
      );
      // Vignetting darkens the rebate by up to about 0.05 density too.
      expect(baseError(detected?.rgb ?? [1, 1, 1], base)).toBeLessThan(0.06);
    }
  });

  it('skips a warm, unclipped light table for C-41', () => {
    // Warm enough to pass as orange film on colour alone.
    const detected = detectFilmBase(
      lightTable(ORANGE_MASK, [1, 0.85, 0.7]),
      'c41'
    );
    expect(baseError(detected?.rgb ?? [1, 1, 1], ORANGE_MASK)).toBeLessThan(
      0.02
    );
    // Skipped as light, and confidently: it is far less orange than a mask.
    expect(detected?.confidence).toBeGreaterThanOrEqual(
      AUTO_BASE_MIN_CONFIDENCE
    );
  });

  it('is not confident when it may have skipped the base as light', () => {
    // A rebate beside a frame with nothing near base density, its thinnest
    // film a sea (blue and green scene, so the film is even more orange than
    // the rebate). The rebate is taken for light and the sea for base; the
    // population taken for light was as orange as a mask, so the detection
    // says it is unsure.
    const width = 240;
    const height = 120;
    const data = new Uint8ClampedArray(width * height * 4);
    const sea: Rgb = [0.1, 0.25, 0.35];
    const film = [0, 1, 2].map(
      (c) =>
        ORANGE_MASK[c] *
        10 ** -(C41_GAMMA[c] * Math.log10((sea[c] * 1.2) / 0.02))
    );
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const linear = x < 20 ? ORANGE_MASK : film;
        data.set([...linear.map(toByte), 255], (y * width + x) * 4);
      }
    }
    const detected = detectFilmBase({ data, width, height }, 'c41');
    expect(detected).not.toBeNull();
    expect(detected?.confidence).toBeLessThan(AUTO_BASE_MIN_CONFIDENCE);
  });

  it('keeps a bright C-41 rebate that sits apart from a dense image', () => {
    // No light in frame, and a gap between the rebate and the image: the
    // rebate is as orange as the image, so it is film, not light.
    const image = lightTable(ORANGE_MASK, ORANGE_MASK);
    const detected = detectFilmBase(image, 'c41');
    expect(baseError(detected?.rgb ?? [1, 1, 1], ORANGE_MASK)).toBeLessThan(
      0.02
    );
  });

  it('returns null when nothing is film', () => {
    const blank: RgbaImage = {
      data: new Uint8ClampedArray(32 * 32 * 4).fill(255),
      width: 32,
      height: 32,
    };
    expect(detectFilmBase(blank, 'c41')).toBeNull();
    expect(detectFilmBase(blank, 'bw')).toBeNull();
    expect(
      detectFilmBase(blank, 'bw', { x: 0, y: 0, width: 0, height: 0 })
    ).toBeNull();
  });
});

describe('analyzeNegative sampleTarget', () => {
  const negative = makeNegative(ORANGE_MASK, [0.6, 0.7, 0.85]);
  const base = samplePatch(
    negative,
    negative.frame.x + 5,
    negative.rowCentre,
    9
  );
  if (!base) throw new Error('base sample missing');
  const input = {
    image: negative,
    filmType: 'c41' as const,
    base,
    region: negative.frame,
  };

  it('defaults to STATS_SAMPLE_TARGET, so conversions are unchanged', () => {
    expect(analyzeNegative(input)).toEqual(
      analyzeNegative({ ...input, sampleTarget: STATS_SAMPLE_TARGET })
    );
  });

  it('measures about the same from far fewer blocks', () => {
    const full = analyzeNegative(input);
    const few = analyzeNegative({ ...input, sampleTarget: 250 });
    for (let c = 0; c < 3; c++) {
      expect(Math.abs(few.densityHigh[c] - full.densityHigh[c])).toBeLessThan(
        0.05
      );
    }
    expect(Math.abs(few.midtone - full.midtone)).toBeLessThan(0.05);
  });
});

describe('detectFilmBase sampleTarget', () => {
  const negative = makeNegative(ORANGE_MASK, [0.6, 0.7, 0.85], 6);

  it('defaults to AUTO_BASE_SAMPLE_TARGET', () => {
    expect(detectFilmBase(negative, 'c41')).toEqual(
      detectFilmBase(negative, 'c41', undefined, AUTO_BASE_SAMPLE_TARGET)
    );
  });

  it('finds the same base on a sparser stride', () => {
    const full = detectFilmBase(negative, 'c41');
    const sparse = detectFilmBase(negative, 'c41', undefined, 800);
    if (!full || !sparse) throw new Error('no base found');
    for (let c = 0; c < 3; c++) {
      expect(sparse.rgb[c]).toBeCloseTo(full.rgb[c], 2);
    }
  });
});

// Golden values for the defaults. Any change to what analyzeNegative or
// detectFilmBase compute with default options (a sort, a sample target, a
// constant) shows up here bit for bit; update the snapshot only on purpose.
describe('default-option golden values', () => {
  const negative = makeNegative(ORANGE_MASK, [0.6, 0.7, 0.85], 6, true);
  const base = samplePatch(
    negative,
    negative.frame.x + 5,
    negative.rowCentre,
    9
  );
  if (!base) throw new Error('base sample missing');

  it('detectFilmBase', () => {
    expect({
      c41: detectFilmBase(negative, 'c41'),
      bw: detectFilmBase(negative, 'bw'),
    }).toMatchSnapshot();
  });

  it('analyzeNegative', () => {
    expect({
      c41: analyzeNegative({
        image: negative,
        filmType: 'c41',
        base,
        region: negative.frame,
      }),
      bw: analyzeNegative({
        image: negative,
        filmType: 'bw',
        base,
        region: negative.frame,
      }),
    }).toMatchSnapshot();
  });
});
