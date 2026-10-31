import type { InversionCoefficients, Rgb } from '@dorkroom/logic';

/**
 * The WebGL pixel pass for the negative inverter. The fragment shader mirrors
 * `invertPixel` from `@dorkroom/logic` step for step, so the GPU preview and
 * export match the reference implementation the tests and the iOS shader use.
 *
 * Written in GLSL ES 1.00, which both WebGL 1 and WebGL 2 accept, so one
 * source serves both contexts.
 */

/** Dither amplitude: just under half a code value either way. */
export const DITHER_AMOUNT = 1 / 255;

/** Mean of the sixteen 4x4 Bayer thresholds, so the dither averages to zero. */
export const BAYER_MEAN = 0.46875;

/** Full-screen triangle strip; image row 0 lands at the top of the canvas. */
export const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_position.x * 0.5 + 0.5, 0.5 - a_position.y * 0.5);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = `
precision highp float;

varying vec2 v_uv;
uniform sampler2D u_image;

// InversionCoefficients, field for field.
uniform vec3 u_base;
uniform vec3 u_densityLow;
uniform vec3 u_densityHigh;
uniform float u_contrast;
uniform vec3 u_offset;
uniform float u_bw;

// Ordered dither before the 8-bit framebuffer write.
uniform float u_ditherAmount;
uniform float u_height;

const float MIN_TRANSMITTANCE = 1e-4;
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const float INV_LN10 = 0.43429448190325176;

vec3 srgbToLinear(vec3 c) {
  vec3 lo = c / 12.92;
  vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
  return mix(hi, lo, step(c, vec3(0.04045)));
}

float density(float value, float base) {
  return -log(max(value / base, MIN_TRANSMITTANCE)) * INV_LN10;
}

float bayer2(vec2 a) {
  return fract(dot(a, vec2(0.5, a.y * 0.75)));
}

// 4x4 Bayer threshold in [0, 1), from the pixel's column and row.
float bayer4(vec2 pixel) {
  vec2 p = mod(pixel, 4.0);
  return bayer2(floor(p * 0.5)) * 0.25 + bayer2(mod(p, 2.0));
}

void main() {
  vec3 lin = srgbToLinear(texture2D(u_image, v_uv).rgb);

  vec3 d;
  if (u_bw > 0.5) {
    d = vec3(density(dot(lin, LUMA), u_base.g));
  } else {
    d = vec3(
      density(lin.r, u_base.r),
      density(lin.g, u_base.g),
      density(lin.b, u_base.b)
    );
  }

  vec3 stretched = (d - u_densityLow) / (u_densityHigh - u_densityLow);
  vec3 outColor = (stretched - 0.5) * u_contrast + 0.5 + u_offset;

  // Column and row from the top-left, matching the CPU fallback.
  vec2 pixel = floor(vec2(gl_FragCoord.x, u_height - gl_FragCoord.y));
  float dither = (bayer4(pixel) - ${BAYER_MEAN}) * u_ditherAmount;

  gl_FragColor = vec4(clamp(outColor + dither, 0.0, 1.0), 1.0);
}
`;

function bayer2(x: number, y: number): number {
  const v = 0.5 * x + 0.75 * y * y;
  return v - Math.floor(v);
}

/**
 * The shader's ordered dither for a pixel at (column, row), before scaling by
 * the amount: a 4x4 Bayer threshold centred on zero. The CPU fallback uses it
 * so both paths quantize the same way.
 */
export function orderedDither(column: number, row: number): number {
  const px = column % 4;
  const py = row % 4;
  const threshold =
    bayer2(Math.floor(px / 2), Math.floor(py / 2)) * 0.25 +
    bayer2(px % 2, py % 2);
  return threshold - BAYER_MEAN;
}

export interface InversionUniforms {
  u_base: Rgb;
  u_densityLow: Rgb;
  u_densityHigh: Rgb;
  u_contrast: number;
  u_offset: Rgb;
  u_bw: number;
}

/** The shader uniforms for a set of coefficients. */
export function inversionUniforms(
  coeffs: InversionCoefficients
): InversionUniforms {
  return {
    u_base: coeffs.base,
    u_densityLow: coeffs.densityLow,
    u_densityHigh: coeffs.densityHigh,
    u_contrast: coeffs.contrast,
    u_offset: coeffs.offset,
    u_bw: coeffs.filmType === 'bw' ? 1 : 0,
  };
}
