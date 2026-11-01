import {
  analyzeNegative,
  deriveCoefficients,
  linearToSrgb,
  PRINT_DMAX,
  PRINT_DMIN,
  type Rgb,
  type RgbaImage,
  samplePatch,
} from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import {
  BAYER_MEAN,
  DITHER_AMOUNT,
  flattenUniforms,
  IDLE_UNIFORMS,
  INVERSION_SKSL,
  inversionUniforms,
  mixUniforms,
  P3_TO_SRGB,
  P3_TO_SRGB_SKSL,
  UNIFORM_ORDER,
} from './inversion-sksl';

function negative(base: Rgb): RgbaImage {
  const width = 64;
  const height = 32;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const density = x < 8 ? 0 : 0.1 + 1.2 * ((x - 8) / (width - 8));
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const t = 10 ** (-density * (0.9 + 0.1 * c));
        data[i + c] = Math.round(linearToSrgb(base[c] * t) * 255);
      }
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

function coefficients(filmType: 'bw' | 'c41') {
  const image = negative([0.72, 0.4, 0.18]);
  const base = samplePatch(image, 3, 16, 5);
  if (!base) throw new Error('no base');
  return deriveCoefficients({
    statistics: analyzeNegative({ image, filmType, base }),
    adjustments: {
      exposure: 0.3,
      contrast: 1.2,
      warmth: 0.2,
      tint: -0.1,
      saturation: 1.3,
    },
  });
}

/** Uniform names in the order the source declares them. */
const declared = [
  ...INVERSION_SKSL.matchAll(/^uniform (float3?|shader) (\w+);$/gm),
].map((m) => ({ type: m[1], name: m[2] }));

describe('INVERSION_SKSL', () => {
  it('declares the image child, then every uniform in UNIFORM_ORDER', () => {
    expect(declared[0]).toEqual({ type: 'shader', name: 'image' });
    expect(declared.slice(1).map((u) => u.name)).toEqual([...UNIFORM_ORDER]);
  });

  it('types each uniform to match the value it is fed', () => {
    const u = inversionUniforms(coefficients('c41'));
    for (const name of UNIFORM_ORDER) {
      const type = declared.find((d) => d.name === name)?.type;
      expect(type, name).toBe(Array.isArray(u[name]) ? 'float3' : 'float');
    }
  });

  it('mirrors invertPixel and the web shader', () => {
    // The same constants and steps as packages/logic negative-inversion.ts
    // and the web GLSL; Skia itself cannot run under vitest.
    for (const line of [
      'MIN_TRANSMITTANCE = 1e-4',
      'float3(0.2126, 0.7152, 0.0722)',
      'INV_LN10 = 0.43429448190325176',
      'step(c, float3(0.04045))',
      'pow((c + 0.055) / 1.055, float3(2.4))',
      'd = float3(density(dot(lin, LUMA), u_base.g));',
      '(d - u_densityLow) / (u_densityHigh - u_densityLow)',
      'float3 v = u_grade * (u_pivot - (s + u_offset));',
      'max(x, 0.0) + log(1.0 + exp(-abs(x)))',
      `PRINT_DMIN = ${PRINT_DMIN}`,
      `PRINT_DMAX = ${PRINT_DMAX}`,
      'PRINT_DMIN + mean + u_saturation * (printed - PRINT_DMIN - mean)',
      'step(c, float3(0.0031308))',
      `(bayer4(pixel) - ${BAYER_MEAN}) * u_ditherAmount`,
      'clamp(outColor + dither, 0.0, 1.0)',
    ]) {
      expect(INVERSION_SKSL).toContain(line);
    }
  });

  it('has no GLSL-only syntax', () => {
    expect(INVERSION_SKSL).not.toMatch(/\bvec[234]\b|texture2D|gl_Frag/);
    expect(INVERSION_SKSL).toContain('half4 main(float2 xy)');
  });
});

describe('inversionUniforms', () => {
  it('passes the coefficients through and flags B&W', () => {
    const bw = coefficients('bw');
    const u = inversionUniforms(bw);
    expect(u.u_bw).toBe(1);
    expect(u.u_base).toEqual(bw.base);
    expect(u.u_densityLow).toEqual(bw.densityLow);
    expect(u.u_densityHigh).toEqual(bw.densityHigh);
    expect(u.u_grade).toBe(bw.grade);
    expect(u.u_saturation).toBe(1);
    expect(u.u_offset).toEqual(bw.offset);
    expect(u.u_ditherAmount).toBe(DITHER_AMOUNT);
    expect(inversionUniforms(coefficients('c41')).u_bw).toBe(0);
    expect(inversionUniforms(bw, 0).u_ditherAmount).toBe(0);
  });

  it('passes the C-41 print settings through', () => {
    const c41 = coefficients('c41');
    const u = inversionUniforms(c41);
    expect(u.u_grade).toBe(c41.grade);
    expect(u.u_pivot).toBe(c41.pivot);
    expect(u.u_saturation).toBe(1.3);
  });
});

describe('flattenUniforms', () => {
  it('lays the values out in declaration order, 17 floats', () => {
    const c41 = coefficients('c41');
    const flat = flattenUniforms(inversionUniforms(c41));
    expect(flat).toHaveLength(4 * 3 + 5);
    expect(flat).toEqual([
      ...c41.base,
      ...c41.densityLow,
      ...c41.densityHigh,
      ...c41.offset,
      c41.grade,
      c41.pivot,
      c41.saturation,
      0,
      DITHER_AMOUNT,
    ]);
  });
});

describe('P3_TO_SRGB', () => {
  it('keeps white white and widens nothing into the sRGB gamut', () => {
    for (const row of P3_TO_SRGB) {
      expect(row[0] + row[1] + row[2]).toBeCloseTo(1, 6);
    }
    // P3 red is outside sRGB: more than full red, negative green and blue.
    expect(P3_TO_SRGB[0][0]).toBeGreaterThan(1);
    expect(P3_TO_SRGB[1][0]).toBeLessThan(0);
  });

  it('is spelled into the SkSL, row by row', () => {
    expect(P3_TO_SRGB_SKSL).toContain('float3(1.2249401, -0.2249404, 0.0), p3');
    expect(P3_TO_SRGB_SKSL).toContain(
      'float3(-0.0196376, -0.0786361, 1.0982735), p3'
    );
    expect(P3_TO_SRGB_SKSL).toContain('clamp(lin, 0.0, 1.0)');
    expect(P3_TO_SRGB_SKSL).toContain('half4 main(float2 xy)');
  });
});

describe('mixUniforms', () => {
  const from = { ...IDLE_UNIFORMS, u_base: [1, 0.5, 0.2] as const, u_grade: 1 };
  const to = { ...IDLE_UNIFORMS, u_base: [0.8, 0.3, 0.1] as const, u_grade: 3 };

  it('starts at from and ends at to', () => {
    expect(mixUniforms(from, to, 0)).toEqual(from);
    expect(mixUniforms(from, to, 1)).toBe(to);
  });

  it('blends every channel half way at t = 0.5', () => {
    const half = mixUniforms(from, to, 0.5);
    expect(half.u_base[0]).toBeCloseTo(0.9, 9);
    expect(half.u_base[2]).toBeCloseTo(0.15, 9);
    expect(half.u_grade).toBeCloseTo(2, 9);
  });

  it('switches film type at once rather than blend it', () => {
    expect(mixUniforms(from, { ...to, u_bw: 1 }, 0.5).u_bw).toBe(1);
    expect(mixUniforms(from, { ...to, u_bw: 1 }, 0.5).u_grade).toBe(3);
  });
});
