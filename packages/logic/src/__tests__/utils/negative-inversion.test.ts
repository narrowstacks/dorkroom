import { describe, expect, it } from 'vitest';
import {
  buildDensityHistograms,
  byteToLinear,
  clampRect,
  DENSITY_HISTOGRAM_BINS,
  densityPercentile,
  deriveCoefficients,
  invertImage,
  invertPixel,
  linearToSrgb,
  type NegativeFilmType,
  neutralOffset,
  type Rgb,
  type RgbaImage,
  samplePatch,
  srgbToLinear,
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

function makeNegative(base: Rgb, gamma: Rgb, surround = 0): Negative {
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

function convert(negative: Negative, filmType: NegativeFilmType) {
  const base = samplePatch(
    negative,
    negative.frame.x + 5,
    negative.rowCentre,
    9
  );
  if (!base) throw new Error('base sample missing');
  const histograms = buildDensityHistograms(
    negative,
    base,
    filmType,
    negative.frame
  );
  return {
    base,
    histograms,
    coeffs: deriveCoefficients({ filmType, base, histograms }),
  };
}

function stepOutputs(
  negative: Negative,
  coeffs: ReturnType<typeof convert>['coeffs']
) {
  return negative.stepCentres.map((x) =>
    invertPixel(pixelAt(negative, x, negative.rowCentre), coeffs)
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

describe('densityPercentile', () => {
  it('returns NaN for an empty histogram', () => {
    expect(
      densityPercentile(new Uint32Array(DENSITY_HISTOGRAM_BINS), 0.5)
    ).toBeNaN();
  });

  it('finds the extremes and the median', () => {
    const negative = makeNegative(BW_BASE, BW_GAMMA);
    const { histograms } = convert(negative, 'bw');
    const low = densityPercentile(histograms[1], 0);
    const high = densityPercentile(histograms[1], 1);
    // The rebate is base, density 0; the densest step is 0.6 * log10(45).
    expect(low).toBeCloseTo(0, 1);
    expect(high).toBeCloseTo(0.6 * Math.log10(0.9 / 0.02), 1);
    expect(densityPercentile(histograms[1], 0.5)).toBeGreaterThan(low);
  });
});

describe('black and white conversion', () => {
  it('turns the step wedge into a rising positive wedge', () => {
    const negative = makeNegative(BW_BASE, BW_GAMMA);
    const outputs = stepOutputs(negative, convert(negative, 'bw').coeffs);
    for (let s = 1; s < outputs.length; s++) {
      expect(outputs[s][1]).toBeGreaterThan(outputs[s - 1][1]);
    }
    // The brightest scene step lands at white.
    expect(outputs.at(-1)?.[1]).toBeCloseTo(1, 1);
    // Every output is grey.
    for (const [r, g, b] of outputs) {
      expect(r).toBeCloseTo(g, 6);
      expect(b).toBeCloseTo(g, 6);
    }
  });

  it('maps the film base to black', () => {
    const negative = makeNegative(BW_BASE, BW_GAMMA);
    const { base, coeffs } = convert(negative, 'bw');
    expect(invertPixel(base, coeffs)[1]).toBeLessThan(0.02);
  });

  it('ignores the light-table surround when the crop excludes it', () => {
    const plain = makeNegative(BW_BASE, BW_GAMMA);
    const surrounded = makeNegative(BW_BASE, BW_GAMMA, 15);
    const a = convert(plain, 'bw').coeffs;
    const b = convert(surrounded, 'bw').coeffs;
    expect(b.densityLow[1]).toBeCloseTo(a.densityLow[1], 2);
    expect(b.densityHigh[1]).toBeCloseTo(a.densityHigh[1], 2);
  });

  it('lets the surround wreck the levels without a crop', () => {
    const surrounded = makeNegative(BW_BASE, BW_GAMMA, 15);
    const base = samplePatch(
      surrounded,
      surrounded.frame.x + 5,
      surrounded.rowCentre,
      9
    );
    if (!base) throw new Error('base sample missing');
    const uncropped = deriveCoefficients({
      filmType: 'bw',
      base,
      histograms: buildDensityHistograms(surrounded, base, 'bw'),
    });
    // The bare light table is brighter than the base: negative density.
    expect(uncropped.densityLow[1]).toBeLessThan(-0.05);
  });

  it('brightens with exposure and steepens with contrast', () => {
    const negative = makeNegative(BW_BASE, BW_GAMMA);
    const { base, histograms } = convert(negative, 'bw');
    const mid = pixelAt(negative, negative.stepCentres[3], negative.rowCentre);
    const at = (
      adjustments: Parameters<typeof deriveCoefficients>[0]['adjustments']
    ) =>
      invertPixel(
        mid,
        deriveCoefficients({ filmType: 'bw', base, histograms, adjustments })
      )[1];

    expect(at({ exposure: 1 })).toBeGreaterThan(at({}));
    expect(at({ exposure: -1 })).toBeLessThan(at({}));

    const shadow = pixelAt(
      negative,
      negative.stepCentres[1],
      negative.rowCentre
    );
    const shadowAt = (contrast: number) =>
      invertPixel(
        shadow,
        deriveCoefficients({
          filmType: 'bw',
          base,
          histograms,
          adjustments: { contrast },
        })
      )[1];
    expect(shadowAt(1.5)).toBeLessThan(shadowAt(1));
  });

  it('ignores warmth and tint', () => {
    const negative = makeNegative(BW_BASE, BW_GAMMA);
    const { base, histograms } = convert(negative, 'bw');
    const coeffs = deriveCoefficients({
      filmType: 'bw',
      base,
      histograms,
      adjustments: { warmth: 1, tint: -1 },
    });
    expect(coeffs.offset).toEqual([0, 0, 0]);
  });
});

describe('C-41 conversion', () => {
  it('removes the orange mask: neutral scene greys come out neutral', () => {
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA);
    const outputs = stepOutputs(negative, convert(negative, 'c41').coeffs);
    for (const [r, g, b] of outputs.slice(1, -1)) {
      expect(Math.abs(r - g)).toBeLessThan(0.03);
      expect(Math.abs(b - g)).toBeLessThan(0.03);
    }
    for (let s = 1; s < outputs.length; s++) {
      expect(outputs[s][1]).toBeGreaterThan(outputs[s - 1][1]);
    }
  });

  it('beats a naive RGB invert, which leaves a strong cast', () => {
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA);
    const x = negative.stepCentres[3];
    const i = (negative.rowCentre * negative.width + x) * 4;
    const naive = [0, 1, 2].map((c) => 1 - negative.data[i + c] / 255);
    expect(naive[2] - naive[0]).toBeGreaterThan(0.2);
  });

  it('applies warmth and tint as channel offsets', () => {
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA);
    const { base, histograms } = convert(negative, 'c41');
    const mid = pixelAt(negative, negative.stepCentres[3], negative.rowCentre);
    const warm = invertPixel(
      mid,
      deriveCoefficients({
        filmType: 'c41',
        base,
        histograms,
        adjustments: { warmth: 1 },
      })
    );
    expect(warm[0]).toBeGreaterThan(warm[2] + 0.2);
    const green = invertPixel(
      mid,
      deriveCoefficients({
        filmType: 'c41',
        base,
        histograms,
        adjustments: { tint: 1 },
      })
    );
    expect(green[1]).toBeGreaterThan(green[0]);
    expect(green[1]).toBeGreaterThan(green[2]);
  });

  it('neutral picker makes a picked patch grey', () => {
    // Different layer gammas than the base sample implies leave a cast in
    // the mid-tones that the neutral picker should remove.
    const negative = makeNegative(ORANGE_MASK, [0.5, 0.62, 0.8]);
    const { base, histograms, coeffs } = convert(negative, 'c41');
    const sample = samplePatch(
      negative,
      negative.stepCentres[3],
      negative.rowCentre,
      5
    );
    if (!sample) throw new Error('sample missing');

    const neutral = neutralOffset(sample, coeffs);
    const balanced = deriveCoefficients({
      filmType: 'c41',
      base,
      histograms,
      neutral,
    });
    const [r, g, b] = invertPixel(sample, balanced);
    expect(r).toBeCloseTo(g, 2);
    expect(b).toBeCloseTo(g, 2);
  });

  it('neutral picker is a no-op for B&W', () => {
    const negative = makeNegative(BW_BASE, BW_GAMMA);
    const { coeffs } = convert(negative, 'bw');
    expect(neutralOffset([0.3, 0.2, 0.1], coeffs)).toEqual([0, 0, 0]);
  });
});

describe('degenerate input', () => {
  it('survives a flat, all-base crop without NaN', () => {
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA);
    const base = samplePatch(
      negative,
      negative.frame.x + 5,
      negative.rowCentre,
      9
    );
    if (!base) throw new Error('base sample missing');
    const histograms = buildDensityHistograms(negative, base, 'c41', {
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    });
    const coeffs = deriveCoefficients({ filmType: 'c41', base, histograms });
    for (const v of [...coeffs.densityLow, ...coeffs.densityHigh]) {
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(invertPixel(base, coeffs).every(Number.isFinite)).toBe(true);
  });

  it('survives a black base sample', () => {
    const negative = makeNegative(BW_BASE, BW_GAMMA);
    const histograms = buildDensityHistograms(negative, [0, 0, 0], 'bw');
    const coeffs = deriveCoefficients({
      filmType: 'bw',
      base: [0, 0, 0],
      histograms,
    });
    expect(invertPixel([0.5, 0.5, 0.5], coeffs).every(Number.isFinite)).toBe(
      true
    );
  });
});

describe('invertImage', () => {
  it('produces an opaque RGBA buffer matching invertPixel', () => {
    const negative = makeNegative(ORANGE_MASK, C41_GAMMA);
    const { coeffs } = convert(negative, 'c41');
    const out = invertImage(negative, coeffs);
    expect(out.length).toBe(negative.width * negative.height * 4);
    const x = negative.stepCentres[2];
    const i = (negative.rowCentre * negative.width + x) * 4;
    const expected = invertPixel(
      pixelAt(negative, x, negative.rowCentre),
      coeffs
    );
    expect(out[i]).toBe(Math.round(expected[0] * 255));
    expect(out[i + 3]).toBe(255);
  });
});
