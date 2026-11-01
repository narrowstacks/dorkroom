import {
  type InversionCoefficients,
  PRINT_DMAX,
  PRINT_DMIN,
  PRINT_SHOULDER,
  PRINT_TOE,
  type Rgb,
} from '@dorkroom/logic';

/**
 * The Skia pixel pass for the negative inverter. `INVERSION_SKSL` mirrors
 * `invertPixel` from `@dorkroom/logic` step for step, and the web app's GLSL
 * fragment shader (`inversion-shader.ts`) line for line, ordered dither
 * included, so the iOS preview and export match the web and the reference.
 *
 * Kept free of Skia imports so the source and uniform mapping are testable.
 */

/** Dither amplitude: just under half a code value either way. Same as web. */
export const DITHER_AMOUNT = 1 / 255;

/** Mean of the sixteen 4x4 Bayer thresholds, so the dither averages to zero. */
export const BAYER_MEAN = 0.46875;

/** A number as an SkSL float literal (always with a decimal point). */
function skslFloat(n: number): string {
  const text = String(n);
  return /[.e]/.test(text) ? text : `${text}.0`;
}

/**
 * `image` is the negative, sRGB-encoded, drawn so that `xy` is in output
 * pixels for an export (the dither then lands on whole pixels, like the web
 * shader's `gl_FragCoord`). On screen `xy` is in points; the dither there is
 * below a code value either way.
 */
export const INVERSION_SKSL = `
uniform shader image;

// InversionCoefficients, field for field.
uniform float3 u_base;
uniform float3 u_densityLow;
uniform float3 u_densityHigh;
uniform float3 u_offset;
uniform float u_grade;
uniform float u_pivot;
uniform float u_saturation;
uniform float u_bw;

// Ordered dither before the 8-bit write.
uniform float u_ditherAmount;

const float MIN_TRANSMITTANCE = 1e-4;
const float3 LUMA = float3(0.2126, 0.7152, 0.0722);
const float INV_LN10 = 0.43429448190325176;
const float LN10 = 2.302585092994046;

// The print curve, from @dorkroom/logic.
const float PRINT_DMIN = ${skslFloat(PRINT_DMIN)};
const float PRINT_DMAX = ${skslFloat(PRINT_DMAX)};
const float PRINT_SHOULDER = ${skslFloat(PRINT_SHOULDER)};
const float PRINT_TOE = ${skslFloat(PRINT_TOE)};
const float PAPER_WHITE = ${skslFloat(10 ** -PRINT_DMIN)};
const float PAPER_BLACK = ${skslFloat(10 ** -PRINT_DMAX)};

float3 srgbToLinear(float3 c) {
  float3 lo = c / 12.92;
  float3 hi = pow((c + 0.055) / 1.055, float3(2.4));
  return mix(hi, lo, step(c, float3(0.04045)));
}

float3 linearToSrgb(float3 c) {
  float3 lo = c * 12.92;
  float3 hi = 1.055 * pow(c, float3(1.0 / 2.4)) - 0.055;
  return mix(hi, lo, step(c, float3(0.0031308)));
}

float density(float value, float base) {
  return -log(max(value / base, MIN_TRANSMITTANCE)) * INV_LN10;
}

// log(1 + e^x) that cannot overflow.
float softplus(float x) {
  return max(x, 0.0) + log(1.0 + exp(-abs(x)));
}

float printCurve(float v) {
  float shouldered =
    PRINT_DMIN + softplus(PRINT_SHOULDER * (v - PRINT_DMIN)) / PRINT_SHOULDER;
  return PRINT_DMAX - softplus(PRINT_TOE * (PRINT_DMAX - shouldered)) / PRINT_TOE;
}

float bayer2(float2 a) {
  return fract(dot(a, float2(0.5, a.y * 0.75)));
}

// 4x4 Bayer threshold in [0, 1), from the pixel's column and row.
float bayer4(float2 pixel) {
  float2 p = mod(pixel, 4.0);
  return bayer2(floor(p * 0.5)) * 0.25 + bayer2(mod(p, 2.0));
}

half4 main(float2 xy) {
  float3 lin = srgbToLinear(float3(image.eval(xy).rgb));

  float3 d;
  if (u_bw > 0.5) {
    d = float3(density(dot(lin, LUMA), u_base.g));
  } else {
    d = float3(
      density(lin.r, u_base.r),
      density(lin.g, u_base.g),
      density(lin.b, u_base.b)
    );
  }

  float3 s = (d - u_densityLow) / (u_densityHigh - u_densityLow);
  float3 v = u_grade * (u_pivot - (s + u_offset));
  float3 printed = float3(printCurve(v.r), printCurve(v.g), printCurve(v.b));
  float mean = (printed.r + printed.g + printed.b) / 3.0 - PRINT_DMIN;
  float3 saturated =
    PRINT_DMIN + mean + u_saturation * (printed - PRINT_DMIN - mean);
  float3 reflectance =
    (exp(-saturated * LN10) - PAPER_BLACK) / (PAPER_WHITE - PAPER_BLACK);
  float3 outColor = linearToSrgb(clamp(reflectance, 0.0, 1.0));

  // Column and row from the top-left, matching the web shader.
  float2 pixel = floor(xy);
  float dither = (bayer4(pixel) - ${BAYER_MEAN}) * u_ditherAmount;

  return half4(half3(clamp(outColor + dither, 0.0, 1.0)), 1.0);
}
`;

// A type alias, not an interface, so it is assignable to Skia's `Uniforms`
// record (interfaces carry no index signature).
export type InversionUniforms = {
  u_base: Rgb;
  u_densityLow: Rgb;
  u_densityHigh: Rgb;
  u_offset: Rgb;
  u_grade: number;
  u_pivot: number;
  u_saturation: number;
  u_bw: number;
  u_ditherAmount: number;
};

/** Neutral uniforms for before the first base: never drawn as a positive. */
export const IDLE_UNIFORMS: InversionUniforms = {
  u_base: [1, 1, 1],
  u_densityLow: [0, 0, 0],
  u_densityHigh: [1, 1, 1],
  u_offset: [0, 0, 0],
  u_grade: 1,
  u_pivot: 0,
  u_saturation: 1,
  u_bw: 0,
  u_ditherAmount: 0,
};

/**
 * Uniforms part way from `from` to `to` (t from 0 to 1), for easing the live
 * view to new coefficients instead of jumping. Every continuous uniform is
 * blended; the B&W switch and the dither amount are not, and take `to`'s.
 * A worklet: it runs on the UI thread every frame of the ease.
 */
export function mixUniforms(
  from: InversionUniforms,
  to: InversionUniforms,
  t: number
): InversionUniforms {
  'worklet';
  if (t >= 1 || from.u_bw !== to.u_bw) return to;
  const k = Math.max(0, t);
  const num = (a: number, b: number) => a + (b - a) * k;
  const rgb = (a: Rgb, b: Rgb): Rgb => [
    num(a[0], b[0]),
    num(a[1], b[1]),
    num(a[2], b[2]),
  ];
  return {
    u_base: rgb(from.u_base, to.u_base),
    u_densityLow: rgb(from.u_densityLow, to.u_densityLow),
    u_densityHigh: rgb(from.u_densityHigh, to.u_densityHigh),
    u_offset: rgb(from.u_offset, to.u_offset),
    u_grade: num(from.u_grade, to.u_grade),
    u_pivot: num(from.u_pivot, to.u_pivot),
    u_saturation: num(from.u_saturation, to.u_saturation),
    u_bw: to.u_bw,
    u_ditherAmount: to.u_ditherAmount,
  };
}

/** The uniforms in the order the SkSL declares them. */
export const UNIFORM_ORDER: readonly (keyof InversionUniforms)[] = [
  'u_base',
  'u_densityLow',
  'u_densityHigh',
  'u_offset',
  'u_grade',
  'u_pivot',
  'u_saturation',
  'u_bw',
  'u_ditherAmount',
];

/** The shader uniforms for a set of coefficients. */
export function inversionUniforms(
  coeffs: InversionCoefficients,
  ditherAmount = DITHER_AMOUNT
): InversionUniforms {
  return {
    u_base: coeffs.base,
    u_densityLow: coeffs.densityLow,
    u_densityHigh: coeffs.densityHigh,
    u_offset: coeffs.offset,
    u_grade: coeffs.grade,
    u_pivot: coeffs.pivot,
    u_saturation: coeffs.saturation,
    u_bw: coeffs.filmType === 'bw' ? 1 : 0,
    u_ditherAmount: ditherAmount,
  };
}

/**
 * Uniforms flattened into the float array `RuntimeEffect.makeShader` takes,
 * in declaration order.
 */
export function flattenUniforms(uniforms: InversionUniforms): number[] {
  return UNIFORM_ORDER.flatMap((name) => {
    const value = uniforms[name];
    return Array.isArray(value) ? [...value] : [value];
  });
}

/**
 * Linear Display P3 to linear sRGB (D65 both), row-major. The rows sum to 1,
 * so white stays white.
 */
export const P3_TO_SRGB: readonly (readonly [number, number, number])[] = [
  [1.2249401, -0.2249404, 0],
  [-0.0420569, 1.0420571, 0],
  [-0.0196376, -0.0786361, 1.0982735],
];

const p3Row = (r: number) =>
  `float3(${P3_TO_SRGB[r].map(skslFloat).join(', ')})`;

/**
 * Re-encodes Display P3 code values as sRGB code values: decode, convert the
 * primaries in linear light, clip to the sRGB gamut, encode. Browsers do the
 * same when they decode an iPhone photo into an sRGB canvas, so the iOS proxy
 * and export start from the numbers the web page starts from.
 *
 * Skia 2.6.2 can tag an offscreen surface Display P3 but not sRGB (untagged
 * surfaces are not colour-managed at all), so the app first draws every
 * photo into a P3 surface, which Skia converts whatever the photo's own
 * profile, then runs this pass into an untagged surface.
 */
export const P3_TO_SRGB_SKSL = `
uniform shader image;

float3 toLinear(float3 c) {
  float3 lo = c / 12.92;
  float3 hi = pow((c + 0.055) / 1.055, float3(2.4));
  return mix(hi, lo, step(c, float3(0.04045)));
}

float3 toSrgb(float3 c) {
  float3 lo = c * 12.92;
  float3 hi = 1.055 * pow(c, float3(1.0 / 2.4)) - 0.055;
  return mix(hi, lo, step(c, float3(0.0031308)));
}

half4 main(float2 xy) {
  float3 p3 = toLinear(float3(image.eval(xy).rgb));
  float3 lin = float3(
    dot(${p3Row(0)}, p3),
    dot(${p3Row(1)}, p3),
    dot(${p3Row(2)}, p3)
  );
  return half4(half3(toSrgb(clamp(lin, 0.0, 1.0))), 1.0);
}
`;
