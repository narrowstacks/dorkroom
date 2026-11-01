/**
 * Negative inversion math (issue #527), shared by the web and iOS apps.
 *
 * Split of responsibilities:
 * - {@link analyzeNegative} measures a downscaled proxy of the photographed
 *   negative once per base and crop: density end points and the metered
 *   midtone. {@link deriveCoefficients} turns that and the
 *   user's adjustments into a small {@link InversionCoefficients} object.
 *   Both run over samples, not the full image, and stay in plain TypeScript.
 * - The per-pixel pass runs as a shader on each platform (WebGL on web, a
 *   Skia RuntimeEffect on iOS). Both consume the same coefficients.
 *   {@link invertPixel} is the reference implementation of that pass: the
 *   shaders mirror it line for line, and tests and golden images use it.
 *
 * Model, after a darkroom print. Each channel is normalized by the film base
 * and turned into density, `d = -log10(pixel / base)`, in linear light, then
 * stretched per channel to `s` (0 at the thin, shadow end, 1 at the scene's
 * neutral highlight), which removes the orange mask. Colour balance is a
 * per-channel offset on
 * `s`, as enlarger filtration is. The result is exposed onto a virtual paper:
 * print density `grade * (pivot - s)` passes through a characteristic curve
 * with a soft shoulder (paper white) and toe (maximum black), saturation is
 * scaled in print density, and the reflectance is sRGB-encoded.
 *
 * Credit: the neutral-gated highlight point, the print curve and
 * density-domain saturation follow techniques described by NegPy
 * (https://github.com/marcinz606/NegPy, GPL-3.0), reimplemented here from
 * their published formulas; no NegPy code is used.
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
  /** Print exposure in stops. Positive brightens. */
  exposure: number;
  /** Paper grade multiplier. 1 is the default grade; higher is harder. */
  contrast: number;
  /** C-41 only: positive warms (more red, less blue). Range roughly -1..1. */
  warmth: number;
  /** C-41 only: positive adds green, negative adds magenta. Range roughly -1..1. */
  tint: number;
  /** C-41 only: colour saturation, scaled in print density. 1 is unchanged. */
  saturation: number;
}

/** Default saturation: the film's own. The iOS slider can raise it. */
export const DEFAULT_SATURATION = 1;

export const DEFAULT_INVERSION_ADJUSTMENTS: InversionAdjustments = {
  exposure: 0,
  contrast: 1,
  warmth: 0,
  tint: 0,
  saturation: DEFAULT_SATURATION,
};

/** Smallest transmittance used, so a black pixel has a finite density. */
const MIN_TRANSMITTANCE = 1e-4;

/** Smallest density window, so a flat crop cannot divide by zero. */
const MIN_DENSITY_RANGE = 0.05;

/**
 * How far below the base a pixel's density may fall in any channel and still
 * count as film. Anything brighter is light that never passed through the
 * negative (sprocket holes, gaps between frames, light-table surround), and
 * phone JPEG noise on the rebate stays well inside this margin.
 */
const BRIGHTER_THAN_BASE = 0.05;

/**
 * Code values at or below this are clipped to black, so their density is
 * unknown rather than high. Phone cameras crush the dense end of the blue
 * (and, after a Display P3 to sRGB conversion, green) layer of an orange
 * negative to 0, which would otherwise read as density 4.
 */
const CLIPPED_BYTE = 2;

// Print ------------------------------------------------------------------

/** Paper white and maximum black, in print density. */
export const PRINT_DMIN = 0.06;
export const PRINT_DMAX = 1.7;

/**
 * Softness of the paper's shoulder (towards white) and toe (towards black):
 * the larger, the sharper the knee. Softplus knees, as in NegPy; the toe is
 * softer than NegPy's 6 so shadow detail separates from maximum black.
 */
export const PRINT_SHOULDER = 3;
export const PRINT_TOE = 6;

/**
 * Print density per unit of stretched negative at the default grade. With
 * the soft toe this matches the shipped linear model's midtone contrast and
 * keeps the darkest tones off pure black; contrast 1.3 gives NegPy's 2.9.
 */
export const PRINT_GRADE = 2.2;

/** Print density the reference tone lands on: a mid-grey on paper. */
export const PRINT_MIDTONE_DENSITY = 0.75;

/** Stretched value printed as a mid-grey before metering. */
export const PRINT_REFERENCE = 0.5;

/**
 * Auto density, as NegPy does it: the pivot moves only this share of the way
 * from the reference toward the frame's metered tone, at most
 * {@link METERING_LIMIT}, and only to brighten. A frame dominated by
 * something bright (a lamp-lit wall, snow) is meant to print bright, so it
 * is never darkened toward grey.
 */
const METERING_WEIGHT = 0.1;
const METERING_LIMIT = 0.05;

/** Negative density one unit of warmth or tint adds, as filtration. */
const FILTRATION_PER_UNIT = 0.2;

// Statistics -------------------------------------------------------------

/** Share of the crop trimmed from each edge before measuring. */
const STATS_INSET = 0.05;

/** Blocks the crop is median-downsampled into for the statistics. */
export const STATS_SAMPLE_TARGET = 40_000;

/** Provisional highlight percentile, refined by the neutral gate. */
const PROVISIONAL_HIGHLIGHT = 0.995;

/** The brightest 1% to 5% of the frame, by luma rank, set the highlight. */
const HIGHLIGHT_BAND = { low: 0.95, high: 0.99 } as const;

/**
 * Share of the film blocks a channel must be clipped to black in before its
 * clipped values are estimated rather than dropped, and that a reference
 * channel (green, else red) must stay under to stand in for them (see
 * {@link completeClipped}).
 */
const CLIPPED_CHANNEL_SHARE = 0.05;

/** Code value from which a channel's density is measured, not guessed. */
const RELIABLE_BYTE = 12;

/** Fewest reliable samples a channel ratio is measured from. */
const MIN_RATIO_SAMPLES = 40;

/** Least reference-channel density a ratio sample must have. */
const RATIO_MIN_DENSITY = 0.12;

/**
 * Share of the film that may sit at the neutral-gated highlight's colour
 * before the gate is doubted, and the share from which it is not trusted at
 * all. A small white object is a white point; a large uniform bright area (a
 * sky, a wall) is a colour of the scene that per-channel highlights keep
 * better than forcing it to white.
 */
const HIGHLIGHT_TRUSTED_SHARE = 0.06;
const HIGHLIGHT_REJECTED_SHARE = 0.2;

/** Per-channel percentile the shipped model took as white; the fallback. */
const SHIPPED_HIGHLIGHT = 0.999;

/**
 * Evidence the neutral-gated white point needs before it is trusted, each a
 * ramp from no trust to full trust:
 * - its mean density as a share of the per-channel highlights' (a gate that
 *   settled on a dim wall, in a frame whose only bright things are coloured
 *   lamps, sits far below them);
 * - how far its channels' ratios to those highlights disagree (the gate took
 *   a coloured area for white: a beige facade when the only white, a road
 *   marking, is too small to reach the band);
 * - the share of the band that is near-neutral at all.
 */
const GATE_BRIGHTNESS = { none: 0.7, full: 0.9 } as const;
const GATE_HUE_DISAGREEMENT = { none: 0.15, full: 0.05 } as const;
const GATE_NEUTRAL_SHARE = { none: 0.1, full: 0.3 } as const;

/** Chroma (stretched units) under which a band pixel counts as near-neutral. */
const GATE_NEUTRAL_CHROMA = 0.05;

/** Colour distance (stretched units) from the white point that shares its hue. */
const HIGHLIGHT_NEAR = 0.06;

/** Stretched luma from which a pixel counts as part of the bright area. */
const HIGHLIGHT_BRIGHT = 0.7;

/**
 * Smallest density span used to scale the exposure and filtration sliders,
 * so a flat crop (a frame of fog) does not make them hypersensitive.
 */
const MIN_SLIDER_SPAN = 0.3;

/** Share of a band, lowest chroma first, taken as its neutral pixels. */
const NEUTRAL_SHARE = 0.3;

/** Rec. 709 luminance weights, applied in linear light. */
const LUMA: Rgb = [0.2126, 0.7152, 0.0722];

/** Everything the per-pixel pass needs. Plain numbers, safe to serialize. */
export interface InversionCoefficients {
  filmType: NegativeFilmType;
  /** Film base in linear light, per channel (equal channels for B&W). */
  base: Rgb;
  /** Density at stretched 0 (black end), per channel. */
  densityLow: Rgb;
  /** Density at stretched 1 (neutral highlight), per channel. */
  densityHigh: Rgb;
  /** Filtration and neutral pick, added to the stretched value. */
  offset: Rgb;
  /** Print density per unit of stretched value (paper grade). */
  grade: number;
  /** Stretched value printed at zero print density, before the curve. */
  pivot: number;
  /** Saturation in print density; 1 for B&W. */
  saturation: number;
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

// Auto base -----------------------------------------------------------------

/** A proposed film base: its linear colour and a representative pixel. */
export interface DetectedBase {
  rgb: Rgb;
  point: { x: number; y: number };
  /**
   * 0..1: how strongly the image supports this base. Below
   * {@link AUTO_BASE_MIN_CONFIDENCE} treat it as a suggestion and ask the
   * user to pick the base.
   */
  confidence: number;
}

/**
 * Least {@link DetectedBase.confidence} at which a detected base is used
 * without asking. Below it, show the result but prompt for a pick.
 */
export const AUTO_BASE_MIN_CONFIDENCE = 0.5;

/** Pixels sampled for base detection, whatever the region size. */
export const AUTO_BASE_SAMPLE_TARGET = 200_000;

/**
 * Code value at or above which a channel counts as clipped light. Bare
 * light-table light and sprocket holes usually clip; the film base, which
 * always absorbs some light, does not clip in every channel.
 */
const CLIPPED_LIGHT_BYTE = 250;

/**
 * Least red-to-blue ratio, in linear light, of a C-41 film pixel. The orange
 * mask transmits two to four times more red than blue everywhere on the film;
 * anything closer to neutral is light that never passed through it.
 */
const C41_MIN_RED_BLUE = 1.3;

/**
 * Percentile of the kept pixels' luminance that marks the base population,
 * well under the brightest so sprocket-hole edges, dust holes and glints (a
 * percent or two of a crop) do not set it.
 */
const AUTO_BASE_TOP = 0.97;

/**
 * Confidence ramps for a detected base (see {@link detectFilmBase}): how
 * orange the population skipped as light is (a warm light table is about red
 * to blue 1.4 and red to green 1.2; an orange mask about 4 and 1.8), the
 * base population's share of the film, and its spread in density (clear
 * rebate is uniform; uneven light spreads it about 0.05 to 0.1 D).
 */
const AUTO_BASE_LIGHT_RED_BLUE = { none: 3, full: 2 } as const;
const AUTO_BASE_LIGHT_RED_GREEN = { none: 1.6, full: 1.35 } as const;
const AUTO_BASE_POPULATION = { none: 0.002, full: 0.01 } as const;
const AUTO_BASE_SPREAD = { none: 0.15, full: 0.08 } as const;

/**
 * For C-41, how much less orange (red to blue) than the population's median
 * a pixel may be and still count as base. Blends of light-table light and
 * base at hole edges are bright but far less orange.
 */
const AUTO_BASE_MIN_ORANGE = 0.7;

/**
 * Width, in density, of the base population around that level. Uneven
 * light-table illumination spreads clear rebate over about 0.1 to 0.15 D in a
 * phone photo; the median of the population sits in the middle of that
 * spread rather than at its brightest corner.
 */
const AUTO_BASE_DEPTH = 0.08;

/**
 * Width of the empty stretch of log luminance (density) that must separate
 * a bright population from the rest for it to count as light rather than
 * film. The light itself may span far more than this (vignetting, uneven
 * light tables); only the gap below it matters.
 */
const LIGHT_GAP_DENSITY = 0.05;

/** Bin width of the log-luminance histogram the gap is searched in. */
const LIGHT_GAP_BIN = 0.01;

/** How far below the brightest pixel the gap is searched for. */
const LIGHT_SEARCH_DEPTH = 0.8;

/**
 * A bin with fewer than this share of the sampled pixels counts as empty, so
 * the few pixels a soft edge blends between light and film do not close the
 * gap.
 */
const LIGHT_GAP_TOLERANCE = 0.001;

/**
 * For C-41, how much more orange (red to green and red to blue, linear) the
 * film must be than the population above the gap for that population to be
 * light. Film is the
 * light seen through the orange mask, so it is always redder than the light;
 * a bright population that is as orange as what lies below is film.
 */
const C41_MASK_RATIO = 1.3;

/**
 * Least linear luminance of that population. A light table photographed so
 * the negative is exposed well sits near white; a B&W rebate separated from
 * the image by a frame line is film, and is darker than this.
 */
const LIGHT_MIN_LUMINANCE = 0.5;

/** Smallest share of the sampled pixels that forms a population. */
const MIN_POPULATION = 0.002;

/** Fewer kept pixels than this and there is nothing to propose. */
const MIN_AUTO_BASE_PIXELS = 64;

/**
 * Propose a film base from the image, so a conversion can appear before the
 * user picks one. The base is the least dense film there is, so this takes the
 * brightest film pixels in `region` (the crop), after excluding what is not
 * film:
 *
 * - pixels clipped to black in any channel, or clipped to white in every
 *   channel (bare light-table light, sprocket holes);
 * - for C-41, near-neutral pixels, since the orange mask colours every pixel
 *   of the film;
 * - when no light clipped, a bright population separated from the rest by a
 *   clear gap in density (and, for C-41, clearly less orange than the film
 *   below it), which is unclipped light-table light.
 *
 * The result is the per-channel median of the base population (kept pixels
 * within {@link AUTO_BASE_DEPTH} around the {@link AUTO_BASE_TOP} brightness,
 * and for C-41 about as orange as the rest), and the pixel in it closest to
 * that median (for a marker). Returns null when too few pixels survive. If
 * the crop holds no unexposed film, the result is the thinnest part of the
 * image, a little denser than the true base; picking the base by hand remains
 * the precise route.
 *
 * `sampleTarget` bounds how many pixels are sampled (on a stride), and so the
 * cost; a live preview passes fewer than the default.
 */
export function detectFilmBase(
  image: RgbaImage,
  filmType: NegativeFilmType,
  region?: PixelRect,
  sampleTarget = AUTO_BASE_SAMPLE_TARGET
): DetectedBase | null {
  const rect = clampRect(
    region ?? { x: 0, y: 0, width: image.width, height: image.height },
    image.width,
    image.height
  );
  const area = rect.width * rect.height;
  if (area === 0) return null;
  const stride = Math.max(
    1,
    Math.floor(Math.sqrt(area / Math.max(1, sampleTarget)))
  );

  const kept: number[] = [];
  let sampled = 0;
  let clippedLight = 0;
  for (let row = rect.y; row < rect.y + rect.height; row += stride) {
    for (let col = rect.x; col < rect.x + rect.width; col += stride) {
      sampled++;
      const i = (row * image.width + col) * 4;
      const r = image.data[i];
      const g = image.data[i + 1];
      const b = image.data[i + 2];
      if (r <= CLIPPED_BYTE || g <= CLIPPED_BYTE || b <= CLIPPED_BYTE) {
        continue;
      }
      if (
        r >= CLIPPED_LIGHT_BYTE &&
        g >= CLIPPED_LIGHT_BYTE &&
        b >= CLIPPED_LIGHT_BYTE
      ) {
        clippedLight++;
        continue;
      }
      if (
        filmType === 'c41' &&
        byteToLinear(r) < C41_MIN_RED_BLUE * byteToLinear(b)
      ) {
        continue;
      }
      kept.push(i);
    }
  }
  if (kept.length < MIN_AUTO_BASE_PIXELS) return null;

  const lum = (i: number) =>
    luminance([
      byteToLinear(image.data[i]),
      byteToLinear(image.data[i + 1]),
      byteToLinear(image.data[i + 2]),
    ]);
  // Brightest first.
  const order = kept.map((i) => ({ i, y: lum(i) })).sort((a, b) => b.y - a.y);

  // One photo has one exposure of the light table: when it clipped, it has
  // already been excluded, and a bright population left over is film.
  const lightClipped = clippedLight >= MIN_POPULATION * sampled;
  const { start, lightOrange } = lightClipped
    ? { start: 0, lightOrange: { redBlue: 1, redGreen: 1 } }
    : lightPopulationEnd(order, sampled, filmType, image);
  const candidates = order.slice(start);
  if (candidates.length < MIN_AUTO_BASE_PIXELS) return null;

  const top = candidates[Math.floor((1 - AUTO_BASE_TOP) * candidates.length)].y;
  const near = candidates.filter(
    ({ y }) =>
      Math.abs(Math.log10(top / Math.max(y, 1e-6))) <= AUTO_BASE_DEPTH / 2
  );
  const redBlue = ({ i }: { i: number }) =>
    byteToLinear(image.data[i]) /
    Math.max(byteToLinear(image.data[i + 2]), 1e-6);
  const typical = median(near.map(redBlue));
  const band =
    filmType === 'c41'
      ? near.filter((p) => redBlue(p) >= AUTO_BASE_MIN_ORANGE * typical)
      : near;
  if (band.length === 0) return null;
  const channels: [number[], number[], number[]] = [[], [], []];
  for (const { i } of band) {
    channels[0].push(byteToLinear(image.data[i]));
    channels[1].push(byteToLinear(image.data[i + 1]));
    channels[2].push(byteToLinear(image.data[i + 2]));
  }
  const rgb: Rgb = [
    median(channels[0]),
    median(channels[1]),
    median(channels[2]),
  ];

  let best = band[0].i;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const { i } of band) {
    const distance =
      (byteToLinear(image.data[i]) - rgb[0]) ** 2 +
      (byteToLinear(image.data[i + 1]) - rgb[1]) ** 2 +
      (byteToLinear(image.data[i + 2]) - rgb[2]) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  const pixel = best / 4;
  // Evidence for the base, each a ramp from none to full:
  // - a population skipped as light that is as orange as a film base was
  //   probably the base (a frame with nothing near base density, whose blue
  //   sea or sky makes the denser film look even more orange); a light
  //   table, even a warm one, is far closer to neutral;
  // - a base population this small is a sliver, possibly not rebate at all;
  // - real rebate is uniform, so a spread-out population is scene, not base.
  const bandLuminance = Float64Array.from(band, ({ y }) => y).sort();
  const spread = Math.log10(
    quantile(bandLuminance, 0.9) / Math.max(quantile(bandLuminance, 0.1), 1e-6)
  );
  const confidence =
    ramp(lightOrange.redBlue, AUTO_BASE_LIGHT_RED_BLUE) *
    ramp(lightOrange.redGreen, AUTO_BASE_LIGHT_RED_GREEN) *
    ramp(band.length / candidates.length, AUTO_BASE_POPULATION) *
    ramp(spread, AUTO_BASE_SPREAD);
  return {
    rgb,
    point: { x: pixel % image.width, y: Math.floor(pixel / image.width) },
    confidence,
  };
}

/**
 * Index into `order` (brightest first) just past a bright population that is
 * light rather than film, or 0 when there is none.
 *
 * The search runs over a histogram of log luminance below the brightest
 * pixel: the first stretch of {@link LIGHT_GAP_DENSITY} with (almost) no
 * pixels, after at least {@link MIN_POPULATION} of them, separates light from
 * film. Everything above the end of the gap is light, including the few
 * blended pixels of a soft film edge inside it. For B&W the population must
 * also be bright ({@link LIGHT_MIN_LUMINANCE}); for C-41 it must be clearly
 * less orange than what lies below ({@link C41_MASK_RATIO}).
 */
/** Where the light ends in `order`, and how clearly it was told from film. */
interface LightSplit {
  /** Index just past the light; 0 when there is none. */
  start: number;
  /**
   * For a C-41 split, how orange the population taken for light is, as its
   * median red to blue and red to green; 1 (neutral) when nothing was split
   * or the film is B&W.
   */
  lightOrange: { redBlue: number; redGreen: number };
}

function lightPopulationEnd(
  order: readonly { i: number; y: number }[],
  sampled: number,
  filmType: NegativeFilmType,
  image: RgbaImage
): LightSplit {
  const neutral = { redBlue: 1, redGreen: 1 };
  const none: LightSplit = { start: 0, lightOrange: neutral };
  const top = order[0].y;
  if (filmType === 'bw' && top < LIGHT_MIN_LUMINANCE) return none;
  const depth = (y: number) => Math.log10(top / Math.max(y, 1e-6));

  const bins = Math.ceil(LIGHT_SEARCH_DEPTH / LIGHT_GAP_BIN);
  const counts = new Uint32Array(bins);
  for (const { y } of order) {
    const d = depth(y);
    if (d >= LIGHT_SEARCH_DEPTH) break;
    counts[Math.floor(d / LIGHT_GAP_BIN)]++;
  }

  const empty = Math.max(1, Math.ceil(LIGHT_GAP_TOLERANCE * sampled));
  const minPopulation = Math.max(1, Math.ceil(MIN_POPULATION * sampled));
  const gapBins = Math.round(LIGHT_GAP_DENSITY / LIGHT_GAP_BIN);
  let above = 0;
  let run = 0;
  let gapEnd = -1;
  for (let b = 0; b < bins; b++) {
    if (counts[b] < empty) {
      run++;
      continue;
    }
    if (run >= gapBins && above >= minPopulation) {
      gapEnd = b;
      break;
    }
    // Pixels in a run too short to be a gap belong to the population.
    for (let k = b - run; k <= b; k++) above += counts[k];
    run = 0;
  }
  if (gapEnd < 0) return none;

  const split = order.findIndex(({ y }) => depth(y) >= gapEnd * LIGHT_GAP_BIN);
  if (split <= 0) return none;

  if (filmType === 'c41') {
    // Film is the light seen through the orange mask, which raises both red
    // to green and red to blue, so light must be less orange in both. One
    // ratio alone is fooled by scene colour in the denser film (green fields
    // raise red to green) or by a crushed channel (a phone exposing for the
    // light table pins the film's blue to its floor, raising red to blue).
    const below = order.slice(
      split,
      split + Math.max(MIN_AUTO_BASE_PIXELS, Math.ceil(0.05 * order.length))
    );
    const light = order.slice(0, split);
    const ratios = (channel: 1 | 2) => {
      const ratio = ({ i }: { i: number }) =>
        byteToLinear(image.data[i]) /
        Math.max(byteToLinear(image.data[i + channel]), 1e-6);
      return {
        film: median(below.map(ratio)),
        light: median(light.map(ratio)),
      };
    };
    const green = ratios(1);
    const blue = ratios(2);
    if (!(
      green.film >= C41_MASK_RATIO * green.light &&
      blue.film >= C41_MASK_RATIO * blue.light
    )) {
      return none;
    }
    return {
      start: split,
      lightOrange: { redBlue: blue.light, redGreen: green.light },
    };
  }
  return { start: split, lightOrange: neutral };
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

// Analysis -------------------------------------------------------------------

/** What {@link analyzeNegative} measures, before any user adjustment. */
export interface NegativeStatistics {
  filmType: NegativeFilmType;
  /** Normalized film base, linear light. */
  base: Rgb;
  densityLow: Rgb;
  densityHigh: Rgb;
  /** Median stretched luma of the film (the metered tone). */
  midtone: number;
}

export interface AnalyzeNegativeInput {
  image: RgbaImage;
  filmType: NegativeFilmType;
  /** Sampled film base, linear light. */
  base: Rgb;
  /** The crop. Statistics come from inside it only. */
  region?: PixelRect;
  /**
   * About how many median blocks to measure (default
   * {@link STATS_SAMPLE_TARGET}). The cost of the analysis follows this
   * count, not the image size. A live preview that re-measures twice a
   * second passes fewer; a conversion keeps the default.
   */
  sampleTarget?: number;
}

/** Value at a quantile (0..1) of an ascending array. */
function quantile(sorted: ArrayLike<number>, q: number): number {
  if (sorted.length === 0) return Number.NaN;
  const at = Math.max(0, Math.min(1, q)) * (sorted.length - 1);
  const lo = Math.floor(at);
  const hi = Math.min(sorted.length - 1, lo + 1);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}

/**
 * Film densities of a block-median downsample of the region, inset from its
 * edges: each block's per-channel median, so dust, scratches and specular
 * glints do not reach the statistics. Blocks clipped to black, or brighter
 * than the base (light-table light, sprocket holes), are dropped.
 */
/** Film samples of a crop, and how many blocks each channel lost to clipping. */
interface DensitySamples {
  /** Blocks measured in every channel. */
  samples: Rgb[];
  /**
   * Blocks with some (not all) channels clipped to black: density of the
   * clipped channels is NaN, the rest measured.
   */
  partial: Rgb[];
  /** Blocks with that channel clipped to black. */
  clipped: Rgb;
}

function sampleDensities(
  image: RgbaImage,
  base: Rgb,
  filmType: NegativeFilmType,
  region: PixelRect | undefined,
  sampleTarget: number
): DensitySamples {
  const full = clampRect(
    region ?? { x: 0, y: 0, width: image.width, height: image.height },
    image.width,
    image.height
  );
  const insetX = Math.floor(full.width * STATS_INSET);
  const insetY = Math.floor(full.height * STATS_INSET);
  const rect =
    full.width - 2 * insetX > 0 && full.height - 2 * insetY > 0
      ? {
          x: full.x + insetX,
          y: full.y + insetY,
          width: full.width - 2 * insetX,
          height: full.height - 2 * insetY,
        }
      : full;
  const block = Math.max(
    1,
    Math.ceil(Math.sqrt((rect.width * rect.height) / Math.max(1, sampleTarget)))
  );
  const normalized = normalizeBase(base, filmType);
  const channels = [
    new Uint8Array(block * block),
    new Uint8Array(block * block),
    new Uint8Array(block * block),
  ];
  const samples: Rgb[] = [];
  const partial: Rgb[] = [];
  const clipped = [0, 0, 0];

  for (let by = rect.y; by < rect.y + rect.height; by += block) {
    for (let bx = rect.x; bx < rect.x + rect.width; bx += block) {
      const h = Math.min(block, rect.y + rect.height - by);
      const w = Math.min(block, rect.x + rect.width - bx);
      let n = 0;
      for (let row = by; row < by + h; row++) {
        for (let col = bx; col < bx + w; col++) {
          const i = (row * image.width + col) * 4;
          channels[0][n] = image.data[i];
          channels[1][n] = image.data[i + 1];
          channels[2][n] = image.data[i + 2];
          n++;
        }
      }
      const medianByte = (c: number) => {
        const sorted = channels[c].subarray(0, n).sort();
        return sorted[n >> 1];
      };
      const bytes = [medianByte(0), medianByte(1), medianByte(2)];
      const isClipped = bytes.map((b) => b <= CLIPPED_BYTE);
      if (isClipped.every(Boolean)) continue;
      const d = densityOf(
        [
          byteToLinear(bytes[0]),
          byteToLinear(bytes[1]),
          byteToLinear(bytes[2]),
        ],
        normalized,
        filmType
      );
      if (d.some((v, c) => !isClipped[c] && v < -BRIGHTER_THAN_BASE)) continue;
      if (isClipped.some(Boolean)) {
        isClipped.forEach((x, c) => {
          if (x) clipped[c]++;
        });
        // B&W has one measurement for all three; it cannot be partial.
        if (filmType === 'c41') {
          partial.push([
            isClipped[0] ? Number.NaN : d[0],
            isClipped[1] ? Number.NaN : d[1],
            isClipped[2] ? Number.NaN : d[2],
          ]);
        }
        continue;
      }
      samples.push(d);
    }
  }
  return {
    samples,
    partial,
    clipped: [clipped[0], clipped[1], clipped[2]],
  };
}

function stretchOf(d: Rgb, low: Rgb, high: Rgb): Rgb {
  return [
    (d[0] - low[0]) / (high[0] - low[0]),
    (d[1] - low[1]) / (high[1] - low[1]),
    (d[2] - low[2]) / (high[2] - low[2]),
  ];
}

const meanOf = (v: Rgb) => (v[0] + v[1] + v[2]) / 3;
const chromaOf = (v: Rgb) =>
  Math.max(v[0], v[1], v[2]) - Math.min(v[0], v[1], v[2]);

/** Largest difference in colour (each channel less its mean) of two pixels. */
function deviation(s: Rgb, reference: Rgb): number {
  const ds = meanOf(s);
  const dr = meanOf(reference);
  return Math.max(
    Math.abs(s[0] - ds - (reference[0] - dr)),
    Math.abs(s[1] - ds - (reference[1] - dr)),
    Math.abs(s[2] - ds - (reference[2] - dr))
  );
}

/** The lowest-chroma {@link NEUTRAL_SHARE} of some stretched samples. */
function neutralSubset<T extends { s: Rgb }>(items: T[]): T[] {
  // Keys computed once, not per comparison: the same order, far cheaper.
  const sorted = items
    .map((item) => ({ item, chroma: chromaOf(item.s) }))
    .sort((p, q) => p.chroma - q.chroma)
    .map(({ item }) => item);
  return sorted.slice(0, Math.max(1, Math.ceil(NEUTRAL_SHARE * sorted.length)));
}

/**
 * The density of the scene's highlight, per channel: the per-channel median
 * of the most neutral pixels among the brightest 1% to 5% of the frame. A
 * neutral highlight (a cloud, a white wall) sets white, so a warm sunset or a
 * tungsten-lit wall elsewhere in the frame keeps its colour, where per-channel
 * percentiles would make the brightest of each channel white.
 */
function neutralHighlight(samples: Rgb[], low: Rgb, high: Rgb): Rgb {
  const ranked = samples
    .map((d) => {
      const s = stretchOf(d, low, high);
      return { d, s, mean: meanOf(s) };
    })
    .sort((p, q) => p.mean - q.mean);
  const from = Math.floor(HIGHLIGHT_BAND.low * ranked.length);
  const to = Math.max(from + 1, Math.ceil(HIGHLIGHT_BAND.high * ranked.length));
  const neutral = neutralSubset(ranked.slice(from, to));
  const channel = (c: 0 | 1 | 2) => median(neutral.map(({ d }) => d[c]));
  return [channel(0), channel(1), channel(2)];
}

const ramp = (value: number, { none, full }: { none: number; full: number }) =>
  Math.max(0, Math.min(1, (value - none) / (full - none)));

/**
 * How far to trust the neutral-gated white point `gated`, 1 to 0, from the
 * evidence the gate has (see {@link GATE_BRIGHTNESS}), against the shipped
 * model's per-channel highlights `shipped`.
 */
function gateConfidence(
  samples: Rgb[],
  low: Rgb,
  gated: Rgb,
  shipped: Rgb
): number {
  const brightness = meanOf(gated) / meanOf(shipped);
  const ratios: Rgb = [
    gated[0] / shipped[0],
    gated[1] / shipped[1],
    gated[2] / shipped[2],
  ];
  const typical = meanOf(ratios);
  const disagreement = Math.max(
    ...ratios.map((r) => Math.abs(r / typical - 1))
  );
  const ranked = samples
    .map((d) => {
      const s = stretchOf(d, low, gated);
      return { s, mean: meanOf(s) };
    })
    .sort((p, q) => p.mean - q.mean)
    .map(({ s }) => s);
  const from = Math.floor(HIGHLIGHT_BAND.low * ranked.length);
  const to = Math.max(from + 1, Math.ceil(HIGHLIGHT_BAND.high * ranked.length));
  const band = ranked.slice(from, to);
  const neutralShare =
    band.filter((s) => chromaOf(s) <= GATE_NEUTRAL_CHROMA).length / band.length;
  return (
    ramp(brightness, GATE_BRIGHTNESS) *
    ramp(disagreement, GATE_HUE_DISAGREEMENT) *
    ramp(neutralShare, GATE_NEUTRAL_SHARE)
  );
}

/**
 * How far to trust the neutral-gated highlight, 1 to 0, from the share of
 * the film that shares its colour and brightness (see
 * {@link HIGHLIGHT_TRUSTED_SHARE}).
 */
function highlightTrust(samples: Rgb[], low: Rgb, high: Rgb): number {
  let near = 0;
  for (const d of samples) {
    const s = stretchOf(d, low, high);
    // Bright, and the same hue as the white point: part of one bright area
    // (a sky graded from horizon to zenith counts as one).
    if (
      meanOf(s) >= HIGHLIGHT_BRIGHT &&
      deviation(s, [1, 1, 1]) <= HIGHLIGHT_NEAR
    ) {
      near++;
    }
  }
  const share = near / samples.length;
  return Math.max(
    0,
    Math.min(
      1,
      (HIGHLIGHT_REJECTED_SHARE - share) /
        (HIGHLIGHT_REJECTED_SHARE - HIGHLIGHT_TRUSTED_SHARE)
    )
  );
}

/**
 * Film blocks whose clipped channels are estimated, so they can join the
 * statistics. A phone exposing for a bright light table crushes the dense
 * end of a channel (blue, under the orange mask) to black; dropping those
 * blocks drops exactly the brightest parts of the scene (a lamp-lit wall, a
 * sky), and every highlight is then taken from what is left, too thin, so
 * those parts print past white or with too much of the clipped channel.
 * Instead, a clipped channel's density is estimated from green (red if
 * green is clipped too) through that channel's median density ratio to it,
 * measured where both have at least {@link RELIABLE_BYTE} code values, and
 * never less than the clip level's own density. Only
 * the statistics use the estimate; the pixel pass still sees the clipped
 * value, so a deep blue sky stays blue.
 */
function completeClipped(
  samples: Rgb[],
  partial: Rgb[],
  clipped: Rgb,
  base: Rgb
): Rgb[] {
  const total = samples.length + partial.length;
  if (partial.length === 0 || total === 0) return [];
  const share = clipped.map((n) => n / total);
  const reference = share[1] <= CLIPPED_CHANNEL_SHARE ? 1 : 0;
  if (share[reference] > CLIPPED_CHANNEL_SHARE) return [];
  const ratio = [0, 1, 2].map((c) => {
    if (c === reference) return 1;
    // A few clipped specks are dropped, as any channel's would be; only a
    // channel crushed over a real share of the film is estimated.
    if (share[c] <= CLIPPED_CHANNEL_SHARE) return Number.NaN;
    // Density at which channel c still has RELIABLE_BYTE code values.
    const reliable = -Math.log10(byteToLinear(RELIABLE_BYTE) / base[c]);
    const ratios = samples
      .filter((d) => d[c] <= reliable && d[reference] > RATIO_MIN_DENSITY)
      .map((d) => d[c] / d[reference]);
    return ratios.length >= MIN_RATIO_SAMPLES ? median(ratios) : Number.NaN;
  });
  const clipDensity = [0, 1, 2].map(
    (c) => -Math.log10(byteToLinear(CLIPPED_BYTE) / base[c])
  );
  // The reference must itself be measured, not near its own floor.
  const referenceReliable = -Math.log10(
    byteToLinear(RELIABLE_BYTE) / base[reference]
  );
  const completed: Rgb[] = [];
  for (const d of partial) {
    if (!(d[reference] <= referenceReliable)) continue;
    // A clipped channel is at least as dense as its clip level: the ratio
    // estimate (measured on reliable, mostly neutral pixels) must not pull a
    // deep blue sky back toward grey.
    const fill = (c: 0 | 1 | 2) =>
      Number.isNaN(d[c])
        ? Math.max(ratio[c] * d[reference], clipDensity[c])
        : d[c];
    const full: Rgb = [fill(0), fill(1), fill(2)];
    if (full.every(Number.isFinite)) completed.push(full);
  }
  return completed;
}

/**
 * Measure a negative for conversion: per-channel black and highlight
 * density and the metered midtone. Run once per base, crop and
 * film type; sliders only need {@link deriveCoefficients}.
 *
 * Statistics come from a block-median downsample of the crop, inset by
 * {@link STATS_INSET}. The thin end is the base (density 0 in every
 * channel); the highlight is neutral-gated (see {@link neutralHighlight}).
 * Degenerate crops (empty, flat, all clipped) give finite, usable numbers.
 */
export function analyzeNegative({
  image,
  filmType,
  base,
  region,
  sampleTarget = STATS_SAMPLE_TARGET,
}: AnalyzeNegativeInput): NegativeStatistics {
  const normalized = normalizeBase(base, filmType);
  const measured = sampleDensities(image, base, filmType, region, sampleTarget);
  const samples = [
    ...measured.samples,
    ...completeClipped(
      measured.samples,
      measured.partial,
      measured.clipped,
      normalized
    ),
  ];
  if (samples.length === 0) {
    return {
      filmType,
      base: normalized,
      densityLow: [0, 0, 0],
      densityHigh: [1, 1, 1],
      midtone: 0.5,
    };
  }

  const sortedChannel = (c: number) => {
    const values = new Float64Array(samples.length);
    for (let i = 0; i < samples.length; i++) values[i] = samples[i][c];
    return values.sort();
  };
  const sorted = [sortedChannel(0), sortedChannel(1), sortedChannel(2)];
  // The thin end is the film base itself, density 0 in every channel: it is
  // the one colour known to be neutral (unexposed film prints black), and
  // stretching from it keeps a neutral neutral whatever each layer's gamma.
  // Per-channel thin-end percentiles would instead neutralize the darkest
  // colour in the crop (a lamp-lit floor, dark foliage). How black the
  // shadows print is the paper's business: grade, pivot and toe.
  const low: Rgb = [0, 0, 0];
  let high: [number, number, number] = [
    quantile(sorted[0], PROVISIONAL_HIGHLIGHT),
    quantile(sorted[1], PROVISIONAL_HIGHLIGHT),
    quantile(sorted[2], PROVISIONAL_HIGHLIGHT),
  ];
  const widen = (h: Rgb): [number, number, number] => [
    Math.max(h[0], low[0] + MIN_DENSITY_RANGE),
    Math.max(h[1], low[1] + MIN_DENSITY_RANGE),
    Math.max(h[2], low[2] + MIN_DENSITY_RANGE),
  ];
  high = widen(high);
  // Twice: the first pass ranks by the provisional, independent highlights.
  for (let pass = 0; pass < 2; pass++) {
    high = widen(neutralHighlight(samples, low, high));
  }
  // Where the gate has no good evidence (no neutral among the brightest
  // pixels, a white point far below the frame's highlights, or a large
  // uniform area such as a sky), behave like the shipped model: per-channel
  // highlight percentiles.
  const shipped = widen([
    quantile(sorted[0], SHIPPED_HIGHLIGHT),
    quantile(sorted[1], SHIPPED_HIGHLIGHT),
    quantile(sorted[2], SHIPPED_HIGHLIGHT),
  ]);
  const trust =
    gateConfidence(samples, low, high, shipped) *
    highlightTrust(samples, low, high);
  high = widen([
    trust * high[0] + (1 - trust) * shipped[0],
    trust * high[1] + (1 - trust) * shipped[1],
    trust * high[2] + (1 - trust) * shipped[2],
  ]);

  const stretchedSamples = samples.map((d) => stretchOf(d, low, high));
  const lumaMedian = (values: Rgb[]) => median(values.map(meanOf));

  return {
    filmType,
    base: normalized,
    densityLow: low,
    densityHigh: high,
    midtone: lumaMedian(stretchedSamples),
  };
}

// Print curve ----------------------------------------------------------------

/** `log(1 + e^x)` without overflow for large `x`. The shaders spell it alike. */
function softplus(x: number): number {
  return Math.max(x, 0) + Math.log(1 + Math.exp(-Math.abs(x)));
}

/**
 * Print density from exposure density on the virtual paper: a soft shoulder
 * that never goes lighter than paper white ({@link PRINT_DMIN}) and a soft toe
 * that never goes darker than maximum black ({@link PRINT_DMAX}).
 */
export function printCurve(v: number): number {
  const shouldered =
    PRINT_DMIN + softplus(PRINT_SHOULDER * (v - PRINT_DMIN)) / PRINT_SHOULDER;
  return (
    PRINT_DMAX - softplus(PRINT_TOE * (PRINT_DMAX - shouldered)) / PRINT_TOE
  );
}

/** Exposure density that prints at `density` (inverse of {@link printCurve}). */
function exposureFor(density: number): number {
  let lo = -10;
  let hi = 10;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (printCurve(mid) < density) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const MIDTONE_EXPOSURE = exposureFor(PRINT_MIDTONE_DENSITY);

/**
 * Reflectance of a print density, scaled so paper white is 1 and maximum
 * black 0. (NegPy scales by `1 - 10^-Dmax`, which leaves paper white at about
 * 0.87; scaling by paper white instead lets highlights reach white on screen.)
 */
function reflectance(density: number): number {
  const white = 10 ** -PRINT_DMIN;
  const black = 10 ** -PRINT_DMAX;
  return (10 ** -density - black) / (white - black);
}

// Coefficients ---------------------------------------------------------------

export interface DeriveCoefficientsInput {
  statistics: NegativeStatistics;
  adjustments?: Partial<InversionAdjustments>;
  /** Stretched-value offset from the neutral picker, see {@link neutralOffset}. */
  neutral?: Rgb;
}

export function deriveCoefficients({
  statistics,
  adjustments,
  neutral = [0, 0, 0],
}: DeriveCoefficientsInput): InversionCoefficients {
  const adj = { ...DEFAULT_INVERSION_ADJUSTMENTS, ...adjustments };
  const { filmType, densityLow: low, densityHigh: high } = statistics;
  const c41 = filmType === 'c41';
  const { midtone } = statistics;

  const span: Rgb = [
    Math.max(MIN_SLIDER_SPAN, high[0] - low[0]),
    Math.max(MIN_SLIDER_SPAN, high[1] - low[1]),
    Math.max(MIN_SLIDER_SPAN, high[2] - low[2]),
  ];
  const meanSpan = meanOf(span);
  const grade = PRINT_GRADE * Math.max(0.05, adj.contrast);
  // A fixed reference prints at PRINT_MIDTONE_DENSITY, nudged a little
  // toward the metered tone (see METERING_WEIGHT). A stop more print exposure
  // is log10(2) of negative density less to print through.
  const metered = Math.max(
    -METERING_LIMIT,
    Math.min(0, METERING_WEIGHT * (midtone - PRINT_REFERENCE))
  );
  const pivot =
    PRINT_REFERENCE +
    metered +
    MIDTONE_EXPOSURE / grade -
    (adj.exposure * Math.LOG10E * Math.LN2) / meanSpan;

  // Warmth and tint as enlarger filtration: a density per channel, on the
  // negative side of the paper, so paper white and maximum black stay clean.
  const filter: Rgb = c41
    ? [adj.warmth - adj.tint / 2, adj.tint, -adj.warmth - adj.tint / 2]
    : [0, 0, 0];
  const offset = (c: 0 | 1 | 2) =>
    c41 ? (FILTRATION_PER_UNIT * filter[c]) / span[c] + neutral[c] : 0;

  return {
    filmType,
    base: statistics.base,
    densityLow: low,
    densityHigh: high,
    offset: [offset(0), offset(1), offset(2)],
    grade,
    pivot,
    saturation: c41 ? Math.max(0, adj.saturation) : 1,
  };
}

/** Stretched value of one channel, before offsets. */
function stretched(
  d: number,
  coeffs: InversionCoefficients,
  c: 0 | 1 | 2
): number {
  return (
    (d - coeffs.densityLow[c]) / (coeffs.densityHigh[c] - coeffs.densityLow[c])
  );
}

/**
 * Stretched-value offset that makes a picked colour neutral before the print
 * curve, so it prints as an exact grey. Feed the result to
 * {@link deriveCoefficients} as `neutral`. Derive it from coefficients built
 * without a neutral offset, so picking twice replaces rather than compounds.
 */
export function neutralOffset(sample: Rgb, coeffs: InversionCoefficients): Rgb {
  if (coeffs.filmType === 'bw') return [0, 0, 0];
  const d = densityOf(sample, coeffs.base, 'c41');
  const v: Rgb = [
    stretched(d[0], coeffs, 0),
    stretched(d[1], coeffs, 1),
    stretched(d[2], coeffs, 2),
  ];
  const mean = meanOf(v);
  return [mean - v[0], mean - v[1], mean - v[2]];
}

// Reference pixel pass -------------------------------------------------------

/**
 * Invert one linear-light pixel. Returns sRGB-encoded output in 0..1, before
 * dither. The WebGL and Skia shaders mirror this step for step.
 */
export function invertPixel(linear: Rgb, coeffs: InversionCoefficients): Rgb {
  const d = densityOf(linear, coeffs.base, coeffs.filmType);
  const print = (c: 0 | 1 | 2) =>
    printCurve(
      coeffs.grade *
        (coeffs.pivot - (stretched(d[c], coeffs, c) + coeffs.offset[c]))
    );
  const density: Rgb = [print(0), print(1), print(2)];
  // Saturation about the pixel's mean print density above paper white.
  const mean = meanOf(density) - PRINT_DMIN;
  const out = (c: 0 | 1 | 2) => {
    const saturated =
      PRINT_DMIN + mean + coeffs.saturation * (density[c] - PRINT_DMIN - mean);
    return linearToSrgb(Math.max(0, Math.min(1, reflectance(saturated))));
  };
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
