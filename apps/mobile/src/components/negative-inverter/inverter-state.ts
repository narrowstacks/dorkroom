import {
  analyzeNegative,
  AUTO_BASE_MIN_CONFIDENCE,
  DEFAULT_INVERSION_ADJUSTMENTS,
  deriveCoefficients,
  type DetectedBase,
  type InversionAdjustments,
  type InversionCoefficients,
  type NegativeFilmType,
  type NegativeStatistics,
  neutralOffset,
  type PixelPoint,
  type PixelRect,
  type PixelSize,
  type Rgb,
  type RgbaImage,
} from '@dorkroom/logic';
import {
  IDENTITY_ORIENTATION,
  orient,
  type Orientation,
  type OrientationStep,
} from './orientation';

/**
 * The inverter screen's state, as a pure reducer. It follows the web page's
 * reducer (`apps/dorkroom/.../use-negative-inverter.ts`) action for action,
 * plus an automatic film base: on load, and whenever the film type or crop
 * changes while the base is still automatic, the hook proposes one with
 * `detectFilmBase` and passes it in, so the positive shows at once. A tapped
 * base replaces it and stays until the next photo.
 *
 * Generic over the loaded negative so this module needs no Skia types.
 */

/** What a tap or drag on the photo does. */
export type InverterTool = 'crop' | 'base' | 'neutral' | 'rotate';

/** Which version of the photo is on screen. */
export type InverterView = 'negative' | 'positive';

/** A colour sampled from the proxy, in linear light, and where. */
export interface PickedSample {
  point: PixelPoint;
  rgb: Rgb;
}

/** The film base, and whether it was proposed rather than picked. */
export interface BaseSample extends PickedSample {
  auto: boolean;
  /** 0..1: how sure the detection was (`DetectedBase.confidence`); 1 for a
   *  picked base. */
  confidence: number;
}

/** A base from `detectFilmBase`. */
export function detectedSample(detected: DetectedBase): BaseSample {
  return {
    point: detected.point,
    rgb: detected.rgb,
    auto: true,
    confidence: detected.confidence,
  };
}

/** A base the user picked. */
export function pickedSample(sample: PickedSample): BaseSample {
  return { point: sample.point, rgb: sample.rgb, auto: false, confidence: 1 };
}

/**
 * True for an automatic base too doubtful to trust without a look: the
 * positive still shows, but the user is asked to pick the base.
 */
export function isUnsureBase(base: BaseSample | null): boolean {
  return (
    base !== null && base.auto && base.confidence < AUTO_BASE_MIN_CONFIDENCE
  );
}

/** The base brought over from live mode to a captured photo. The photo
 *  opens uncropped. */
export interface CarriedFraming {
  base: BaseSample | null;
}

/** A stored session, reapplied to its photo once that is loaded again. */
export interface RestoredSession {
  filmType: NegativeFilmType;
  crop: PixelRect;
  base: BaseSample | null;
  neutral: PickedSample | null;
  adjustments: InversionAdjustments;
  orientation: Orientation;
}

/** Patch sizes in proxy pixels, as on web. */
export const BASE_PATCH_SIZE = 15;
export const NEUTRAL_PATCH_SIZE = 9;

export interface InverterState<N> {
  /** Bumped on every load and unload, to reset per-photo UI state. */
  generation: number;
  loading: boolean;
  error: string | null;
  negative: N | null;
  filmType: NegativeFilmType;
  /** Statistics region, in proxy pixels. */
  crop: PixelRect | null;
  base: BaseSample | null;
  neutral: PickedSample | null;
  adjustments: InversionAdjustments;
  tool: InverterTool | null;
  view: InverterView;
  /** How the photo is turned for the stage and the export. A view
   *  transform: crop, base and neutral stay in proxy pixels. */
  orientation: Orientation;
}

export type InverterAction<N> =
  | { type: 'load-start' }
  | {
      type: 'load-success';
      negative: N;
      size: PixelSize;
      autoBase: DetectedBase | null;
      /** The base brought over from live mode, used instead of
       *  `autoBase`. */
      carried?: CarriedFraming;
    }
  | { type: 'restore'; negative: N; session: RestoredSession }
  | { type: 'load-failure'; error: string }
  | { type: 'unload' }
  | {
      type: 'film-type';
      filmType: NegativeFilmType;
      autoBase: DetectedBase | null;
    }
  | { type: 'crop'; crop: PixelRect; autoBase: DetectedBase | null }
  | { type: 'base'; sample: PickedSample }
  | { type: 'neutral'; sample: PickedSample | null }
  | { type: 'adjust'; key: keyof InversionAdjustments; value: number }
  | { type: 'reset' }
  | { type: 'tool'; tool: InverterTool | null }
  | { type: 'view'; view: InverterView }
  | { type: 'orient'; step: OrientationStep };

export function initialInverterState<N>(
  filmType: NegativeFilmType = 'c41'
): InverterState<N> {
  return {
    generation: 0,
    loading: false,
    error: null,
    negative: null,
    filmType,
    crop: null,
    base: null,
    neutral: null,
    adjustments: DEFAULT_INVERSION_ADJUSTMENTS,
    tool: null,
    view: 'positive',
    orientation: IDENTITY_ORIENTATION,
  };
}

const autoSample = (detected: DetectedBase | null): BaseSample | null =>
  detected ? detectedSample(detected) : null;

/** Replace an automatic base with a fresh proposal; keep a picked one. */
function rebase(
  base: BaseSample | null,
  detected: DetectedBase | null
): BaseSample | null {
  return base && !base.auto ? base : autoSample(detected);
}

export function inverterReducer<N>(
  state: InverterState<N>,
  action: InverterAction<N>
): InverterState<N> {
  switch (action.type) {
    case 'load-start':
      return { ...state, loading: true, error: null };
    case 'load-success': {
      const base = action.carried
        ? action.carried.base
        : autoSample(action.autoBase);
      return {
        ...initialInverterState<N>(state.filmType),
        generation: state.generation + 1,
        adjustments: state.adjustments,
        negative: action.negative,
        crop: {
          x: 0,
          y: 0,
          width: action.size.width,
          height: action.size.height,
        },
        base,
        // With a proposed base the positive is ready; without one, the next
        // step is picking it on the negative.
        tool: base ? null : 'base',
        view: base ? 'positive' : 'negative',
      };
    }
    case 'restore':
      return {
        ...initialInverterState<N>(action.session.filmType),
        generation: state.generation + 1,
        negative: action.negative,
        crop: action.session.crop,
        base: action.session.base,
        neutral: action.session.neutral,
        adjustments: action.session.adjustments,
        orientation: action.session.orientation,
        tool: action.session.base ? null : 'base',
        view: action.session.base ? 'positive' : 'negative',
      };
    case 'load-failure':
      return { ...state, loading: false, error: action.error };
    case 'unload':
      return {
        ...initialInverterState<N>(state.filmType),
        generation: state.generation + 1,
        adjustments: state.adjustments,
      };
    case 'film-type':
      return {
        ...state,
        filmType: action.filmType,
        base: rebase(state.base, action.autoBase),
        neutral: action.filmType === 'bw' ? null : state.neutral,
        tool:
          action.filmType === 'bw' && state.tool === 'neutral'
            ? null
            : state.tool,
      };
    case 'crop':
      return {
        ...state,
        crop: action.crop,
        base: rebase(state.base, action.autoBase),
      };
    case 'base':
      return {
        ...state,
        base: pickedSample(action.sample),
        tool: null,
        view: 'positive',
      };
    case 'neutral':
      return {
        ...state,
        neutral: action.sample,
        tool: action.sample ? null : state.tool,
      };
    case 'adjust':
      return {
        ...state,
        adjustments: { ...state.adjustments, [action.key]: action.value },
      };
    case 'reset':
      // Keeps the photo, crop, base, film type and orientation: framing and
      // picking are not what "reset" should undo.
      return {
        ...state,
        adjustments: DEFAULT_INVERSION_ADJUSTMENTS,
        neutral: null,
        tool: state.tool === 'neutral' ? null : state.tool,
      };
    case 'tool':
      return {
        ...state,
        tool: action.tool,
        // The base is picked on the negative, a neutral on the positive.
        // Leaving the base picker (Done, or Crop) goes back to the positive
        // once there is a base to show it with.
        view:
          action.tool === 'base'
            ? 'negative'
            : action.tool === 'neutral' || state.base
              ? 'positive'
              : state.view,
      };
    case 'view':
      return { ...state, view: action.view };
    case 'orient':
      return { ...state, orientation: orient(state.orientation, action.step) };
  }
}

/**
 * The negative's measurements for the current base, crop and film type, or
 * null before there is a base. Recomputed only when one of those changes;
 * slider moves reuse it.
 */
export function inverterStatistics(
  proxy: RgbaImage | null,
  base: PickedSample | null,
  filmType: NegativeFilmType,
  crop: PixelRect | null,
  sampleTarget?: number
): NegativeStatistics | null {
  if (!proxy || !base || !crop) return null;
  return analyzeNegative({
    image: proxy,
    filmType,
    base: base.rgb,
    region: crop,
    sampleTarget,
  });
}

/** The parts of the state the coefficients depend on. */
export type CoefficientInputs = Pick<
  InverterState<unknown>,
  'base' | 'filmType' | 'adjustments' | 'neutral'
>;

/**
 * Coefficients for the shader. A neutral pick is applied on top of the
 * coefficients derived without it, so picking again replaces the correction
 * instead of stacking on it (as on web).
 */
export function inverterCoefficients(
  statistics: NegativeStatistics | null,
  { base, adjustments, neutral }: CoefficientInputs
): InversionCoefficients | null {
  if (!statistics || !base) return null;
  const input = { statistics, adjustments };
  const plain = deriveCoefficients(input);
  if (statistics.filmType !== 'c41' || !neutral) return plain;
  return deriveCoefficients({
    ...input,
    neutral: neutralOffset(neutral.rgb, plain),
  });
}
