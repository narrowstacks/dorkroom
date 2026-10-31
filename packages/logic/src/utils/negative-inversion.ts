/**
 * Negative inversion math (issue #527), shared by the web and iOS apps.
 *
 * Split of responsibilities:
 * - This module derives a small {@link InversionCoefficients} object from a
 *   downscaled proxy of the photographed negative: the film base, per-channel
 *   density black/white points, and the user's adjustments. It runs over a
 *   histogram, so it is not a hot path and stays in plain TypeScript.
 * - The per-pixel pass runs as a shader on each platform (WebGL on web, a
 *   Skia RuntimeEffect on iOS). Both consume the same coefficients.
 *   {@link invertPixel} is the reference implementation of that pass: the
 *   shaders mirror it line for line, and tests and golden images use it.
 *
 * Model. Each channel is normalized by the film base and turned into density,
 * `D = -log10(pixel / base)`, in linear light. The low and high percentiles of
 * D inside the crop become output black and white. Density is a log measure,
 * so mapping it linearly to an sRGB-encoded output already gives a print-like
 * tone curve. For C-41 every channel is stretched independently, which is what
 * removes the orange mask and balances the three dye layers. Colour balance is
 * an additive per-channel density offset, the same thing dichroic filtration
 * does on a colour enlarger.
 *
 * Pixels are 8-bit RGBA in row-major order, the layout of both a canvas
 * `ImageData` and Skia's `readPixels`.
 */

export type NegativeFilmType = 'bw' | 'c41';

/** Red, green, blue. */
export type Rgb = readonly [number, number, number];

/** A rectangle in pixel coordinates of the image it refers to. */
export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** An 8-bit RGBA bitmap. */
export interface RgbaImage {
  data: ArrayLike<number>;
  width: number;
  height: number;
}

/** User adjustments applied on top of the automatic levels. */
export interface InversionAdjustments {
  /** Exposure in stops. Positive brightens. */
  exposure: number;
  /** Contrast multiplier about mid-grey. 1 leaves the auto levels alone. */
  contrast: number;
  /** C-41 only: positive warms (more red, less blue). Range roughly -1..1. */
  warmth: number;
  /** C-41 only: positive adds green, negative adds magenta. Range roughly -1..1. */
  tint: number;
}

export const DEFAULT_INVERSION_ADJUSTMENTS: InversionAdjustments = {
  exposure: 0,
  contrast: 1,
  warmth: 0,
  tint: 0,
};

/** Percentiles of density mapped to output black and white. */
export const DEFAULT_CLIP_PERCENTILES = { low: 0.001, high: 0.999 } as const;

/**
 * Density histogram range. Below zero is light brighter than the base (glare,
 * light-table surround left inside the crop); four is far denser than any
 * real negative photographed on a light table.
 */
export const DENSITY_HISTOGRAM_MIN = -1;
export const DENSITY_HISTOGRAM_MAX = 4;
export const DENSITY_HISTOGRAM_BINS = 2048;

/** Smallest transmittance used, so a black pixel has a finite density. */
const MIN_TRANSMITTANCE = 1e-4;

/** Smallest density window, so a flat crop cannot divide by zero. */
const MIN_DENSITY_RANGE = 0.05;

/** How far one unit of warmth or tint moves a channel, in output units. */
const COLOUR_SHIFT_SCALE = 0.15;

/** Rec. 709 luminance weights, applied in linear light. */
const LUMA: Rgb = [0.2126, 0.7152, 0.0722];

/** Everything the per-pixel pass needs. Plain numbers, safe to serialize. */
export interface InversionCoefficients {
  filmType: NegativeFilmType;
  /** Film base in linear light, per channel (equal channels for B&W). */
  base: Rgb;
  /** Density mapped to output black, per channel, exposure applied. */
  densityLow: Rgb;
  /** Density mapped to output white, per channel, exposure applied. */
  densityHigh: Rgb;
  /** Contrast multiplier about mid-grey. */
  contrast: number;
  /** Additive per-channel offset in output units (colour balance). */
  offset: Rgb;
}

// sRGB transfer functions ----------------------------------------------------

export function srgbToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(value: number): number {
  return value <= 0.0031308
    ? value * 12.92
    : 1.055 * value ** (1 / 2.4) - 0.055;
}

const SRGB_TO_LINEAR_LUT: Float64Array = (() => {
  const lut = new Float64Array(256);
  for (let i = 0; i < 256; i++) lut[i] = srgbToLinear(i / 255);
  return lut;
})();

/** Linear-light value of an 8-bit sRGB code value. */
export function byteToLinear(byte: number): number {
  return SRGB_TO_LINEAR_LUT[Math.max(0, Math.min(255, Math.round(byte)))];
}

// Geometry -------------------------------------------------------------------

/** Clamp a rectangle to an image, rounding to whole pixels. */
export function clampRect(
  rect: PixelRect,
  width: number,
  height: number
): PixelRect {
  const x0 = Math.max(0, Math.min(width, Math.floor(rect.x)));
  const y0 = Math.max(0, Math.min(height, Math.floor(rect.y)));
  const x1 = Math.max(x0, Math.min(width, Math.ceil(rect.x + rect.width)));
  const y1 = Math.max(y0, Math.min(height, Math.ceil(rect.y + rect.height)));
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

function median(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Sampling -------------------------------------------------------------------

/**
 * Median colour of a square patch centred on (x, y), in linear light.
 * A median rather than a mean, so dust or a scratch in the patch is ignored.
 * Returns null if the patch falls entirely outside the image.
 */
export function samplePatch(
  image: RgbaImage,
  x: number,
  y: number,
  size = 15
): Rgb | null {
  const half = Math.floor(size / 2);
  const rect = clampRect(
    {
      x: Math.round(x) - half,
      y: Math.round(y) - half,
      width: size,
      height: size,
    },
    image.width,
    image.height
  );
  if (rect.width === 0 || rect.height === 0) return null;

  const channels: [number[], number[], number[]] = [[], [], []];
  for (let row = rect.y; row < rect.y + rect.height; row++) {
    for (let col = rect.x; col < rect.x + rect.width; col++) {
      const i = (row * image.width + col) * 4;
      channels[0].push(byteToLinear(image.data[i]));
      channels[1].push(byteToLinear(image.data[i + 1]));
      channels[2].push(byteToLinear(image.data[i + 2]));
    }
  }
  return [median(channels[0]), median(channels[1]), median(channels[2])];
}

/**
 * The film base as the per-pixel pass uses it. B&W collapses to luminance so
 * a slightly tinted base or light table cannot tint the positive.
 */
export function normalizeBase(base: Rgb, filmType: NegativeFilmType): Rgb {
  const floor = (v: number) => Math.max(v, MIN_TRANSMITTANCE);
  if (filmType === 'bw') {
    const y = floor(luminance(base));
    return [y, y, y];
  }
  return [floor(base[0]), floor(base[1]), floor(base[2])];
}

function luminance([r, g, b]: Rgb): number {
  return LUMA[0] * r + LUMA[1] * g + LUMA[2] * b;
}

// Density --------------------------------------------------------------------

/** Per-channel density of a linear-light colour relative to the base. */
export function densityOf(
  linear: Rgb,
  base: Rgb,
  filmType: NegativeFilmType
): Rgb {
  const d = (v: number, b: number) =>
    -Math.log10(Math.max(v / b, MIN_TRANSMITTANCE));
  if (filmType === 'bw') {
    const value = d(luminance(linear), base[1]);
    return [value, value, value];
  }
  return [d(linear[0], base[0]), d(linear[1], base[1]), d(linear[2], base[2])];
}

/** One histogram per channel. B&W fills all three identically. */
export type DensityHistograms = readonly [
  Uint32Array,
  Uint32Array,
  Uint32Array,
];

function binOf(density: number): number {
  const t =
    (density - DENSITY_HISTOGRAM_MIN) /
    (DENSITY_HISTOGRAM_MAX - DENSITY_HISTOGRAM_MIN);
  return Math.max(
    0,
    Math.min(DENSITY_HISTOGRAM_BINS - 1, Math.floor(t * DENSITY_HISTOGRAM_BINS))
  );
}

function densityOfBin(bin: number): number {
  return (
    DENSITY_HISTOGRAM_MIN +
    ((bin + 0.5) / DENSITY_HISTOGRAM_BINS) *
      (DENSITY_HISTOGRAM_MAX - DENSITY_HISTOGRAM_MIN)
  );
}

/**
 * Density histograms over a region of the image. Pass the crop as `region`
 * so light-table surround never reaches the statistics. `step` samples every
 * nth pixel in each direction, for large proxies.
 */
export function buildDensityHistograms(
  image: RgbaImage,
  base: Rgb,
  filmType: NegativeFilmType,
  region?: PixelRect,
  step = 1
): DensityHistograms {
  const histograms: DensityHistograms = [
    new Uint32Array(DENSITY_HISTOGRAM_BINS),
    new Uint32Array(DENSITY_HISTOGRAM_BINS),
    new Uint32Array(DENSITY_HISTOGRAM_BINS),
  ];
  const rect = clampRect(
    region ?? { x: 0, y: 0, width: image.width, height: image.height },
    image.width,
    image.height
  );
  const stride = Math.max(1, Math.floor(step));
  const normalized = normalizeBase(base, filmType);

  for (let row = rect.y; row < rect.y + rect.height; row += stride) {
    for (let col = rect.x; col < rect.x + rect.width; col += stride) {
      const i = (row * image.width + col) * 4;
      const linear: Rgb = [
        byteToLinear(image.data[i]),
        byteToLinear(image.data[i + 1]),
        byteToLinear(image.data[i + 2]),
      ];
      const d = densityOf(linear, normalized, filmType);
      histograms[0][binOf(d[0])]++;
      histograms[1][binOf(d[1])]++;
      histograms[2][binOf(d[2])]++;
    }
  }
  return histograms;
}

/**
 * Density at a percentile (0..1) of a histogram. Returns NaN for an empty
 * histogram.
 */
export function densityPercentile(
  histogram: Uint32Array,
  percentile: number
): number {
  let total = 0;
  for (const count of histogram) total += count;
  if (total === 0) return Number.NaN;

  const target = Math.max(0, Math.min(1, percentile)) * (total - 1);
  let seen = 0;
  for (let bin = 0; bin < histogram.length; bin++) {
    seen += histogram[bin];
    if (seen > target) return densityOfBin(bin);
  }
  return densityOfBin(histogram.length - 1);
}

// Coefficients ---------------------------------------------------------------

export interface DeriveCoefficientsInput {
  filmType: NegativeFilmType;
  /** Sampled film base, linear light. */
  base: Rgb;
  histograms: DensityHistograms;
  adjustments?: Partial<InversionAdjustments>;
  /** Output offset from the neutral picker, see {@link neutralOffset}. */
  neutral?: Rgb;
  clip?: { low: number; high: number };
}

export function deriveCoefficients({
  filmType,
  base,
  histograms,
  adjustments,
  neutral = [0, 0, 0],
  clip = DEFAULT_CLIP_PERCENTILES,
}: DeriveCoefficientsInput): InversionCoefficients {
  const adj = { ...DEFAULT_INVERSION_ADJUSTMENTS, ...adjustments };

  const levels = histograms.map((histogram) => {
    let low = densityPercentile(histogram, clip.low);
    let high = densityPercentile(histogram, clip.high);
    if (!Number.isFinite(low) || !Number.isFinite(high)) {
      low = 0;
      high = 1;
    }
    if (high - low < MIN_DENSITY_RANGE) {
      const mid = (low + high) / 2;
      low = mid - MIN_DENSITY_RANGE / 2;
      high = mid + MIN_DENSITY_RANGE / 2;
    }
    // One stop more exposure means less density is needed to reach a given
    // output, which is the window sliding down by log10(2) per stop.
    const shift = adj.exposure * Math.LOG10E * Math.LN2;
    return [low - shift, high - shift] as const;
  });

  const colour: Rgb =
    filmType === 'c41'
      ? [
          COLOUR_SHIFT_SCALE * (adj.warmth - adj.tint / 2),
          COLOUR_SHIFT_SCALE * adj.tint,
          COLOUR_SHIFT_SCALE * (-adj.warmth - adj.tint / 2),
        ]
      : [0, 0, 0];

  return {
    filmType,
    base: normalizeBase(base, filmType),
    densityLow: [levels[0][0], levels[1][0], levels[2][0]],
    densityHigh: [levels[0][1], levels[1][1], levels[2][1]],
    contrast: Math.max(0.05, adj.contrast),
    offset:
      filmType === 'c41'
        ? [
            colour[0] + neutral[0],
            colour[1] + neutral[1],
            colour[2] + neutral[2],
          ]
        : [0, 0, 0],
  };
}

/** Per-channel output before contrast and offset, unclamped. */
function stretch(density: Rgb, coeffs: InversionCoefficients): Rgb {
  const s = (c: 0 | 1 | 2) =>
    (density[c] - coeffs.densityLow[c]) /
    (coeffs.densityHigh[c] - coeffs.densityLow[c]);
  return [s(0), s(1), s(2)];
}

/**
 * Output offset that makes a picked colour neutral grey. Feed the result to
 * {@link deriveCoefficients} as `neutral`. Derive it from coefficients built
 * without a neutral offset, so picking twice does not compound.
 */
export function neutralOffset(sample: Rgb, coeffs: InversionCoefficients): Rgb {
  if (coeffs.filmType === 'bw') return [0, 0, 0];
  const v = stretch(densityOf(sample, coeffs.base, 'c41'), coeffs);
  const mean = (v[0] + v[1] + v[2]) / 3;
  return [mean - v[0], mean - v[1], mean - v[2]];
}

// Reference pixel pass -------------------------------------------------------

/**
 * Invert one linear-light pixel. Returns sRGB-encoded output in 0..1.
 * The WebGL and Skia shaders mirror this exactly.
 */
export function invertPixel(linear: Rgb, coeffs: InversionCoefficients): Rgb {
  const v = stretch(densityOf(linear, coeffs.base, coeffs.filmType), coeffs);
  const out = (c: 0 | 1 | 2) =>
    Math.max(
      0,
      Math.min(1, (v[c] - 0.5) * coeffs.contrast + 0.5 + coeffs.offset[c])
    );
  return [out(0), out(1), out(2)];
}

/**
 * Invert a whole RGBA image on the CPU with the reference pass. For tests,
 * golden images, and small previews; the apps use the shaders.
 */
export function invertImage(
  image: RgbaImage,
  coeffs: InversionCoefficients
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(image.width * image.height * 4);
  for (let i = 0; i < out.length; i += 4) {
    const [r, g, b] = invertPixel(
      [
        byteToLinear(image.data[i]),
        byteToLinear(image.data[i + 1]),
        byteToLinear(image.data[i + 2]),
      ],
      coeffs
    );
    out[i] = Math.round(r * 255);
    out[i + 1] = Math.round(g * 255);
    out[i + 2] = Math.round(b * 255);
    out[i + 3] = 255;
  }
  return out;
}
