import {
  buildDensityHistograms,
  DEFAULT_INVERSION_ADJUSTMENTS,
  deriveCoefficients,
  histogramStep,
  type InversionAdjustments,
  type InversionCoefficients,
  type NegativeFilmType,
  neutralOffset,
  type PixelPoint,
  type PixelRect,
  type Rgb,
  samplePatch,
} from '@dorkroom/logic';
import { useCallback, useMemo, useReducer, useRef } from 'react';
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
  base: PickedSample | null;
  neutral: PickedSample | null;
  adjustments: InversionAdjustments;
  tool: InverterTool | null;
  view: InverterView;
}

type InverterAction =
  | { type: 'load-start' }
  | { type: 'load-success'; negative: LoadedNegative }
  | { type: 'load-failure'; error: string }
  | { type: 'unload' }
  | { type: 'film-type'; filmType: NegativeFilmType }
  | { type: 'crop'; crop: PixelRect }
  | { type: 'base'; sample: PickedSample }
  | { type: 'neutral'; sample: PickedSample | null }
  | {
      type: 'adjust';
      key: keyof InversionAdjustments;
      value: number;
    }
  | { type: 'reset-adjustments' }
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

function reducer(state: InverterState, action: InverterAction): InverterState {
  switch (action.type) {
    case 'load-start':
      return { ...state, loading: true, error: null };
    case 'load-success': {
      const { width, height } = action.negative.proxy;
      return {
        ...INITIAL_STATE,
        generation: state.generation + 1,
        filmType: state.filmType,
        adjustments: state.adjustments,
        negative: action.negative,
        crop: { x: 0, y: 0, width, height },
        tool: 'crop',
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
        tool:
          action.filmType === 'bw' && state.tool === 'neutral'
            ? null
            : state.tool,
      };
    case 'crop':
      return { ...state, crop: action.crop };
    case 'base':
      // The first base pick is the conversion: show the positive and put the
      // picker away, so the next tap does not move the base by accident.
      return { ...state, base: action.sample, tool: null, view: 'positive' };
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
    case 'reset-adjustments':
      return {
        ...state,
        adjustments: DEFAULT_INVERSION_ADJUSTMENTS,
        neutral: null,
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

  const loadFile = useCallback(async (file: File) => {
    const id = ++loadId.current;
    dispatch({ type: 'load-start' });
    try {
      const negative = await loadNegative(file);
      if (id === loadId.current) dispatch({ type: 'load-success', negative });
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

  // Recomputed only when the base, crop, or film type changes. Slider moves
  // reuse them and only re-derive the coefficients, which is cheap.
  const histograms = useMemo(() => {
    if (!proxy || !state.base || !state.crop) return null;
    return buildDensityHistograms(
      proxy,
      state.base.rgb,
      state.filmType,
      state.crop,
      histogramStep(state.crop)
    );
  }, [proxy, state.base, state.crop, state.filmType]);

  const coefficients = useMemo((): InversionCoefficients | null => {
    if (!histograms || !state.base) return null;
    const input = {
      filmType: state.filmType,
      base: state.base.rgb,
      histograms,
      adjustments: state.adjustments,
    };
    const plain = deriveCoefficients(input);
    if (state.filmType !== 'c41' || !state.neutral) return plain;
    // Derived from the un-neutralized coefficients, so re-picking replaces
    // the correction instead of stacking on it.
    return deriveCoefficients({
      ...input,
      neutral: neutralOffset(state.neutral.rgb, plain),
    });
  }, [
    histograms,
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
      setFilmType: (filmType: NegativeFilmType) =>
        dispatch({ type: 'film-type', filmType }),
      setCrop: (crop: PixelRect) => dispatch({ type: 'crop', crop }),
      pickBase,
      pickNeutral,
      clearNeutral: () => dispatch({ type: 'neutral', sample: null }),
      adjust: (key: keyof InversionAdjustments, value: number) =>
        dispatch({ type: 'adjust', key, value }),
      resetAdjustments: () => dispatch({ type: 'reset-adjustments' }),
      setTool: (tool: InverterTool | null) => dispatch({ type: 'tool', tool }),
      setView: (view: InverterView) => dispatch({ type: 'view', view }),
    }),
    [loadFile, pickBase, pickNeutral]
  );

  return { state, coefficients, actions };
}

export type NegativeInverterActions = ReturnType<
  typeof useNegativeInverter
>['actions'];
