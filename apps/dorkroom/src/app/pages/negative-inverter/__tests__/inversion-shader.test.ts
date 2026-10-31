import {
  buildDensityHistograms,
  deriveCoefficients,
  type InversionCoefficients,
  invertImage,
  linearToSrgb,
  type NegativeFilmType,
  type Rgb,
  type RgbaImage,
  samplePatch,
} from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import { invertPixelsDithered } from '../cpu-inversion';
import {
  BAYER_MEAN,
  FRAGMENT_SHADER,
  inversionUniforms,
  orderedDither,
  VERTEX_SHADER,
} from '../inversion-shader';

/** The classic 4x4 Bayer matrix, in sixteenths. */
const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** A negative with a clear-base rebate and a 2D density field, so every
 *  channel and many code values are exercised. */
function negative(base: Rgb, width = 96, height = 64): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const density =
        x < 8 ? 0 : 0.1 + 1.2 * ((x - 8) / (width - 8)) + 0.3 * (y / height);
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        // Slightly different gamma per layer, like real C-41.
        const t = 10 ** (-density * (0.9 + 0.1 * c));
        data[i + c] = Math.round(linearToSrgb(base[c] * t) * 255);
      }
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

function coefficientsFor(
  image: RgbaImage,
  filmType: NegativeFilmType
): InversionCoefficients {
  const base = samplePatch(image, 3, image.height / 2, 5);
  if (!base) throw new Error('no base');
  return deriveCoefficients({
    filmType,
    base,
    histograms: buildDensityHistograms(image, base, filmType),
    adjustments: { exposure: 0.3, contrast: 1.2, warmth: 0.2, tint: -0.1 },
  });
}

describe('orderedDither', () => {
  it('is the classic 4x4 Bayer matrix, centred on zero', () => {
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4; column++) {
        expect(orderedDither(column, row)).toBeCloseTo(
          BAYER_4[row][column] / 16 - BAYER_MEAN,
          12
        );
      }
    }
  });

  it('tiles every four pixels and averages to zero', () => {
    let sum = 0;
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4; column++) {
        sum += orderedDither(column, row);
        expect(orderedDither(column + 400, row + 1204)).toBe(
          orderedDither(column, row)
        );
      }
    }
    expect(sum).toBeCloseTo(0, 12);
  });
});

describe('fragment shader source', () => {
  it('is GLSL ES 1.00 so WebGL 1 and 2 both compile it', () => {
    expect(FRAGMENT_SHADER).not.toContain('#version');
    expect(VERTEX_SHADER).not.toContain('#version');
    expect(FRAGMENT_SHADER).toContain('precision highp float;');
    expect(FRAGMENT_SHADER).toContain('gl_FragColor');
  });

  it('declares a uniform for every coefficient it is fed', () => {
    const coeffs = coefficientsFor(negative([0.7, 0.42, 0.2]), 'c41');
    for (const [name, value] of Object.entries(inversionUniforms(coeffs))) {
      const type = Array.isArray(value) ? 'vec3' : 'float';
      expect(FRAGMENT_SHADER).toContain(`uniform ${type} ${name};`);
    }
  });

  it('mirrors the reference constants', () => {
    // MIN_TRANSMITTANCE, Rec. 709 luma and the sRGB breakpoint must match
    // packages/logic/src/utils/negative-inversion.ts.
    expect(FRAGMENT_SHADER).toContain('MIN_TRANSMITTANCE = 1e-4');
    expect(FRAGMENT_SHADER).toContain('vec3(0.2126, 0.7152, 0.0722)');
    expect(FRAGMENT_SHADER).toContain('0.04045');
    expect(FRAGMENT_SHADER).toContain(`${BAYER_MEAN}`);
  });
});

describe('inversionUniforms', () => {
  it('passes the coefficients through and flags B&W', () => {
    const image = negative([0.8, 0.8, 0.8]);
    const bw = coefficientsFor(image, 'bw');
    const u = inversionUniforms(bw);
    expect(u.u_bw).toBe(1);
    expect(u.u_base).toEqual(bw.base);
    expect(u.u_densityLow).toEqual(bw.densityLow);
    expect(u.u_densityHigh).toEqual(bw.densityHigh);
    expect(u.u_contrast).toBe(bw.contrast);
    expect(u.u_offset).toEqual(bw.offset);
    expect(inversionUniforms(coefficientsFor(image, 'c41')).u_bw).toBe(0);
  });
});

describe.each(['bw', 'c41'] as const)('CPU fallback (%s)', (filmType) => {
  const image = negative(
    filmType === 'bw' ? [0.82, 0.8, 0.78] : [0.72, 0.4, 0.18]
  );
  const coeffs = coefficientsFor(image, filmType);
  const reference = invertImage(image, coeffs);

  it('matches invertImage byte for byte without dither', () => {
    const out = new Uint8ClampedArray(reference.length);
    invertPixelsDithered(image, coeffs, out, 0);
    expect(out).toEqual(reference);
  });

  it('stays within one code value of invertImage with dither', () => {
    const out = new Uint8ClampedArray(reference.length);
    invertPixelsDithered(image, coeffs, out);
    let worst = 0;
    let drift = 0;
    for (let i = 0; i < out.length; i++) {
      worst = Math.max(worst, Math.abs(out[i] - reference[i]));
      drift += out[i] - reference[i];
    }
    expect(worst).toBeLessThanOrEqual(1);
    // Ordered dither moves values both ways; it must not shift the image.
    expect(Math.abs(drift / out.length)).toBeLessThan(0.05);
  });

  it('can write over its own source buffer', () => {
    const copy = { ...image, data: Uint8ClampedArray.from(image.data) };
    invertPixelsDithered(copy, coeffs, copy.data, 0);
    expect(copy.data).toEqual(reference);
  });
});
