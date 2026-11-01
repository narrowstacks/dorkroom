import {
  analyzeNegative,
  AUTO_BASE_MIN_CONFIDENCE,
  DEFAULT_INVERSION_ADJUSTMENTS,
  deriveCoefficients,
  type DetectedBase,
  detectFilmBase,
  type InversionAdjustments,
  type InversionCoefficients,
  type NegativeFilmType,
  neutralOffset,
  type PixelPoint,
  type PixelRect,
  type Rgb,
  samplePatch,
} from '@dorkroom/logic';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  decodeFailureMessage,
  ImageDecodeFailure,
  type LoadedNegative,
  loadNegative,
} from './decode-image';

/** What a tap or drag on the photo does. */
export type InverterTool = 'crop' | 'base' | 'neutral';

/** Which version of the photo is on screen. */
export type InverterView = 'negative' | 'positive';

/** A colour sampled from the proxy, in linear light, and where. */
export interface PickedSample {
  point: PixelPoint;
  rgb: Rgb;
}

/** The film base, and whether it was found automatically or picked. */
export interface BaseSample extends PickedSample {
  auto: boolean;
  /**
   * False for an automatic base the detector was unsure of: it still
   * converts, but the page asks for a pick.
   */
  confident: boolean;
}

/** Patch sizes in proxy pixels (the proxy's long edge is 2048). */
export const BASE_PATCH_SIZE = 15;
export const NEUTRAL_PATCH_SIZE = 9;

interface InverterState {
  /** Bumped on every successful load, to reset per-photo UI state. */
  generation: number;
  loading: boolean;
  error: string | null;
  negative: LoadedNegative | null;
  filmType: NegativeFilmType;
  /** Statistics region, in proxy pixels. */
  crop: PixelRect | null;
  base: BaseSample | null;
  neutral: PickedSample | null;
  adjustments: InversionAdjustments;
  tool: InverterTool | null;
  view: InverterView;
}

type InverterAction =
  | { type: 'load-start' }
  | {
      type: 'load-success';
      negative: LoadedNegative;
      autoBase: DetectedBase | null;
    }
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
  | {
      type: 'adjust';
      key: keyof InversionAdjustments;
      value: number;
    }
  | { type: 'reset'; autoBase: DetectedBase | null }
  | { type: 'tool'; tool: InverterTool | null }
  | { type: 'view'; view: InverterView };

const INITIAL_STATE: InverterState = {
  generation: 0,
  loading: false,
  error: null,
  negative: null,
  filmType: 'bw',
  crop: null,
  base: null,
  neutral: null,
  adjustments: DEFAULT_INVERSION_ADJUSTMENTS,
  tool: null,
  view: 'negative',
};

const autoSample = (detected: DetectedBase | null): BaseSample | null =>
  detected
    ? {
        point: detected.point,
        rgb: detected.rgb,
        auto: true,
        confident: detected.confidence >= AUTO_BASE_MIN_CONFIDENCE,
      }
    : null;

/**
 * The base after the photo's statistics region or film type changed: an
 * automatic base is proposed again, a picked one stays (as on iOS).
 */
const rebase = (base: BaseSample | null, detected: DetectedBase | null) =>
  base && !base.auto ? base : autoSample(detected);

function reducer(state: InverterState, action: InverterAction): InverterState {
  switch (action.type) {
    case 'load-start':
      return { ...state, loading: true, error: null };
    case 'load-success': {
      const { width, height } = action.negative.proxy;
      const base = autoSample(action.autoBase);
      return {
        ...INITIAL_STATE,
        generation: state.generation + 1,
        filmType: state.filmType,
        adjustments: state.adjustments,
        negative: action.negative,
        crop: { x: 0, y: 0, width, height },
        base,
        // With a base found the positive shows at once; without one the
        // flow starts by framing the crop, then picking the base.
        tool: base ? null : 'crop',
        view: base ? 'positive' : 'negative',
      };
    }
    case 'load-failure':
      return { ...state, loading: false, error: action.error };
    case 'unload':
      return {
        ...INITIAL_STATE,
        // A new generation remounts the export card, which cancels any
        // export still running for the photo being put away.
        generation: state.generation + 1,
        filmType: state.filmType,
        adjustments: state.adjustments,
      };
    case 'film-type':
      return {
        ...state,
        filmType: action.filmType,
        base: rebase(state.base, action.autoBase),
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
      // The first base pick is the conversion: show the positive and put the
      // picker away, so the next tap does not move the base by accident.
      return {
        ...state,
        base: { ...action.sample, auto: false, confident: true },
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
      // Back to the page's defaults, keeping the photo, crop and a picked
      // base: the work of framing and picking is not what "reset" should
      // undo. An automatic base is found again for the default film type.
      return {
        ...state,
        filmType: INITIAL_STATE.filmType,
        base: rebase(state.base, action.autoBase),
        adjustments: DEFAULT_INVERSION_ADJUSTMENTS,
        neutral: null,
        tool: state.tool === 'neutral' ? null : state.tool,
      };
    case 'tool':
      return {
        ...state,
        tool: action.tool,
        // The base is picked on the negative, a neutral on the positive.
        view:
          action.tool === 'base'
            ? 'negative'
            : action.tool === 'neutral'
              ? 'positive'
              : state.view,
      };
    case 'view':
      return { ...state, view: action.view };
  }
}

export function useNegativeInverter() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  // Only the latest load may land; a slow decode must not overwrite a newer one.
  const loadId = useRef(0);

  const { filmType, crop } = state;
  // The film type can change while a photo decodes (the control stays
  // enabled), so detection reads the current one, not the one at load start.
  const filmTypeRef = useRef(filmType);
  useEffect(() => {
    filmTypeRef.current = filmType;
  }, [filmType]);
  const loadFile = useCallback(async (file: File) => {
    const id = ++loadId.current;
    dispatch({ type: 'load-start' });
    try {
      const negative = await loadNegative(file);
      if (id !== loadId.current) return;
      dispatch({
        type: 'load-success',
        negative,
        // Proposed on the whole photo; it is proposed again as the crop
        // changes, until a base is picked by hand.
        autoBase: detectFilmBase(negative.proxy, filmTypeRef.current),
      });
    } catch (failure) {
      if (id !== loadId.current) return;
      dispatch({
        type: 'load-failure',
        error:
          failure instanceof ImageDecodeFailure
            ? failure.message
            : decodeFailureMessage('unreadable'),
      });
    }
  }, []);

  const proxy = state.negative?.proxy ?? null;

  const setFilmType = useCallback(
    (next: NegativeFilmType) =>
      dispatch({
        type: 'film-type',
        filmType: next,
        autoBase: proxy ? detectFilmBase(proxy, next, crop ?? undefined) : null,
      }),
    [proxy, crop]
  );

  const reset = useCallback(
    () =>
      dispatch({
        type: 'reset',
        autoBase: proxy
          ? detectFilmBase(proxy, INITIAL_STATE.filmType, crop ?? undefined)
          : null,
      }),
    [proxy, crop]
  );

  const setCrop = useCallback(
    (next: PixelRect) =>
      dispatch({
        type: 'crop',
        crop: next,
        autoBase: proxy ? detectFilmBase(proxy, filmType, next) : null,
      }),
    [proxy, filmType]
  );

  const pickBase = useCallback(
    (point: PixelPoint) => {
      if (!proxy) return;
      const rgb = samplePatch(proxy, point.x, point.y, BASE_PATCH_SIZE);
      if (rgb) dispatch({ type: 'base', sample: { point, rgb } });
    },
    [proxy]
  );

  const pickNeutral = useCallback(
    (point: PixelPoint) => {
      if (!proxy) return;
      const rgb = samplePatch(proxy, point.x, point.y, NEUTRAL_PATCH_SIZE);
      if (rgb) dispatch({ type: 'neutral', sample: { point, rgb } });
    },
    [proxy]
  );

  // Measured only when the base, crop or film type changes. Slider moves
  // reuse it and only re-derive the coefficients, which is cheap.
  const statistics = useMemo(() => {
    if (!proxy || !state.base || !state.crop) return null;
    return analyzeNegative({
      image: proxy,
      filmType: state.filmType,
      base: state.base.rgb,
      region: state.crop,
    });
  }, [proxy, state.base, state.crop, state.filmType]);

  const coefficients = useMemo((): InversionCoefficients | null => {
    if (!statistics || !state.base) return null;
    const input = { statistics, adjustments: state.adjustments };
    const plain = deriveCoefficients(input);
    if (state.filmType !== 'c41' || !state.neutral) return plain;
    // Derived from the un-neutralized coefficients, so re-picking replaces
    // the correction instead of stacking on it.
    return deriveCoefficients({
      ...input,
      neutral: neutralOffset(state.neutral.rgb, plain),
    });
  }, [
    statistics,
    state.adjustments,
    state.base,
    state.filmType,
    state.neutral,
  ]);

  const actions = useMemo(
    () => ({
      loadFile,
      unload: () => {
        loadId.current++;
        dispatch({ type: 'unload' });
      },
      setFilmType,
      setCrop,
      pickBase,
      pickNeutral,
      clearNeutral: () => dispatch({ type: 'neutral', sample: null }),
      adjust: (key: keyof InversionAdjustments, value: number) =>
        dispatch({ type: 'adjust', key, value }),
      reset,
      setTool: (tool: InverterTool | null) => dispatch({ type: 'tool', tool }),
      setView: (view: InverterView) => dispatch({ type: 'view', view }),
    }),
    [loadFile, setFilmType, setCrop, reset, pickBase, pickNeutral]
  );

  return { state, coefficients, actions };
}

export type NegativeInverterActions = ReturnType<
  typeof useNegativeInverter
>['actions'];
