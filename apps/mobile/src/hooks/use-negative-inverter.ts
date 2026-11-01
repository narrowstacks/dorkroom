import {
  type DetectedBase,
  detectFilmBase,
  type InversionAdjustments,
  type InversionCoefficients,
  type NegativeFilmType,
  type PixelPoint,
  type PixelRect,
  samplePatch,
} from '@dorkroom/logic';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { AppState, Share } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import type { ExportFormat } from '@/components/negative-inverter/export-plan';
import {
  IDLE_UNIFORMS,
  type InversionUniforms,
  inversionUniforms,
} from '@/components/negative-inverter/inversion-sksl';
import {
  restoreSession,
  type SessionRecord,
  toSessionRecord,
} from '@/components/negative-inverter/inverter-session';
import {
  BASE_PATCH_SIZE,
  initialInverterState,
  inverterCoefficients,
  inverterReducer,
  inverterStatistics,
  type InverterTool,
  type InverterView,
  NEUTRAL_PATCH_SIZE,
} from '@/components/negative-inverter/inverter-state';
import {
  carryToPhoto,
  type LiveCarry,
} from '@/components/negative-inverter/live-reading';
import type {
  Orientation,
  OrientationStep,
} from '@/components/negative-inverter/orientation';
import type { LiveCapture } from '@/hooks/use-live-inverter';
import {
  clearSession,
  deleteSource,
  readSession,
  sourceUri,
  storeSource,
  sweepSources,
  writeSession,
} from '@/lib/inverter-session-storage';
import {
  deleteExport,
  type ExportedPositive,
  exportPositive,
  InverterFailure,
  type LoadedNegative,
  loadNegative,
  saveToPhotos,
} from '@/lib/negative-inverter';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  // A JPEG, never HEIC, which Skia's codecs do not read.
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

export type ExportKind = 'save' | 'share';

/** Quiet time before a change to the session is written. */
const SAVE_DELAY_MS = 400;

/** The last rendered file, reused while nothing that shapes it changed. */
interface CachedExport {
  coefficients: InversionCoefficients;
  format: ExportFormat;
  crop: PixelRect;
  orientation: Orientation;
  file: ExportedPositive;
}

/**
 * State, derived statistics and actions for the negative inverter screen.
 * Statistics are recomputed only when the base, crop or film type changes;
 * slider drags go through `previewAdjust`, which writes the shader uniforms
 * straight to a shared value so the canvas redraws without a React render.
 * Exports live here too, tied to the photo's generation, so loading another
 * photo can neither be raced by nor race a running export.
 */
export function useNegativeInverter() {
  const [state, dispatch] = useReducer(
    inverterReducer<LoadedNegative>,
    undefined,
    () => initialInverterState<LoadedNegative>()
  );
  // Only the latest load may land.
  const loadId = useRef(0);
  // The current photo's file name in the inverter's own folder; the session
  // is saved against it, and it is deleted when the photo is replaced.
  const sourceName = useRef<string | null>(null);
  // Photos replaced but still on disk: deleted only once a record that no
  // longer needs them is saved, so a kill in between never strands the
  // session without its photo.
  const retired = useRef<string[]>([]);
  const proxy = state.negative?.proxy ?? null;

  const [exporting, setExporting] = useState<ExportKind | null>(null);
  // Tagged with the photo it is about, so it disappears with that photo.
  const [failure, setFailure] = useState<{
    generation: number;
    message: string;
  } | null>(null);
  const cached = useRef<CachedExport | null>(null);
  const unmounted = useRef(false);
  useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
    };
  }, []);
  // The generation an export finished in must still be current to count.
  const generation = useRef(state.generation);
  useEffect(() => {
    generation.current = state.generation;
    // The rendered file belongs to this photo: drop it when the photo goes
    // (another load, unload, or leaving the screen).
    return () => {
      if (cached.current) deleteExport(cached.current.file.uri);
      cached.current = null;
    };
  }, [state.generation]);

  const propose = useCallback(
    (
      filmType: NegativeFilmType,
      crop: PixelRect | null
    ): DetectedBase | null =>
      proxy ? detectFilmBase(proxy, filmType, crop ?? undefined) : null,
    [proxy]
  );

  /**
   * Read a photo into the editor, with live mode's base if it has one. The
   * photo is first copied into the inverter's folder, so the session can
   * reopen it later; the photo it replaces is deleted.
   */
  const open = useCallback(async (uri: string, carry?: LiveCarry) => {
    const id = ++loadId.current;
    dispatch({ type: 'load-start' });
    let stored: string | null = null;
    try {
      stored = storeSource(uri);
      const negative = await loadNegative(sourceUri(stored));
      if (id !== loadId.current) {
        deleteSource(stored);
        return;
      }
      if (sourceName.current) retired.current.push(sourceName.current);
      sourceName.current = stored;
      const filmType = live.current.filmType;
      dispatch({
        type: 'load-success',
        negative,
        size: { width: negative.proxy.width, height: negative.proxy.height },
        autoBase: carry ? null : detectFilmBase(negative.proxy, filmType),
        carried: carry
          ? carryToPhoto(carry, negative.proxy, filmType)
          : undefined,
      });
    } catch (error) {
      deleteSource(stored);
      if (id !== loadId.current) return;
      dispatch({
        type: 'load-failure',
        error:
          error instanceof InverterFailure
            ? error.message
            : 'That photo could not be opened.',
      });
    }
  }, []);

  const chooseFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) await open(asset.uri);
  }, [open]);

  /** Open a photo taken in live mode, framed as it was there. */
  const openCapture = useCallback(
    (capture: LiveCapture) => open(capture.uri, capture.carry),
    [open]
  );

  // Reopen the last session: its photo from the inverter's folder, and
  // everything done to it. A missing or unreadable one starts empty.
  useEffect(() => {
    const record = readSession();
    // Before any load starts, so no copy in flight is swept.
    sweepSources(record?.fileName ?? null);
    if (!record) {
      clearSession();
      return;
    }
    const id = ++loadId.current;
    dispatch({ type: 'load-start' });
    loadNegative(sourceUri(record.fileName)).then(
      (negative) => {
        if (id !== loadId.current) {
          // A newer photo replaced this one before it opened.
          retired.current.push(record.fileName);
          return;
        }
        sourceName.current = record.fileName;
        dispatch({
          type: 'restore',
          negative,
          session: restoreSession(record, negative.proxy),
        });
      },
      () => {
        clearSession();
        deleteSource(record.fileName);
        if (id === loadId.current) dispatch({ type: 'unload' });
      }
    );
  }, []);

  // Save the session: at once for a newly opened photo (then its
  // predecessors can go), debounced for edits (slider drags only preview, so
  // they do not reach here), and flushed on leaving or backgrounding.
  const pending = useRef<SessionRecord | null>(null);
  const savedNegative = useRef<LoadedNegative | null>(null);
  useEffect(() => {
    const name = sourceName.current;
    const record = name
      ? toSessionRecord(
          {
            negative: state.negative,
            filmType: state.filmType,
            crop: state.crop,
            base: state.base,
            neutral: state.neutral,
            adjustments: state.adjustments,
            orientation: state.orientation,
          },
          name
        )
      : null;
    if (!record) return;
    if (state.negative !== savedNegative.current) {
      savedNegative.current = state.negative;
      pending.current = null;
      writeSession(record);
      for (const old of retired.current) {
        if (old !== record.fileName) deleteSource(old);
      }
      retired.current = [];
      return;
    }
    pending.current = record;
    const timer = setTimeout(() => {
      writeSession(record);
      pending.current = null;
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [
    state.negative,
    state.filmType,
    state.crop,
    state.base,
    state.neutral,
    state.adjustments,
    state.orientation,
  ]);
  useEffect(() => {
    const flush = () => {
      if (pending.current) writeSession(pending.current);
      pending.current = null;
    };
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') flush();
    });
    return () => {
      subscription.remove();
      flush();
    };
  }, []);

  const statistics = useMemo(
    () => inverterStatistics(proxy, state.base, state.filmType, state.crop),
    [proxy, state.base, state.crop, state.filmType]
  );

  const coefficients = useMemo(
    () =>
      inverterCoefficients(statistics, {
        base: state.base,
        filmType: state.filmType,
        adjustments: state.adjustments,
        neutral: state.neutral,
      }),
    [statistics, state.adjustments, state.base, state.filmType, state.neutral]
  );

  const uniforms = useSharedValue<InversionUniforms>(IDLE_UNIFORMS);
  useEffect(() => {
    if (coefficients) uniforms.value = inversionUniforms(coefficients);
  }, [coefficients, uniforms]);

  // Read by previewAdjust without making it depend on every render.
  const live = useRef(state);
  const liveStatistics = useRef(statistics);
  useEffect(() => {
    live.current = state;
    liveStatistics.current = statistics;
  }, [state, statistics]);

  /** Redraw with a slider's value mid-drag, without committing it. */
  const previewAdjust = useCallback(
    (key: keyof InversionAdjustments, value: number) => {
      const s = live.current;
      const coeffs = inverterCoefficients(liveStatistics.current, {
        ...s,
        adjustments: { ...s.adjustments, [key]: value },
      });
      if (coeffs) uniforms.value = inversionUniforms(coeffs);
    },
    [uniforms]
  );

  const pick = useCallback(
    (tool: 'base' | 'neutral', point: PixelPoint) => {
      if (!proxy) return;
      const size = tool === 'base' ? BASE_PATCH_SIZE : NEUTRAL_PATCH_SIZE;
      const rgb = samplePatch(proxy, point.x, point.y, size);
      if (!rgb) return;
      dispatch(
        tool === 'base'
          ? { type: 'base', sample: { point, rgb } }
          : { type: 'neutral', sample: { point, rgb } }
      );
    },
    [proxy]
  );

  /**
   * Render (or reuse) the full-resolution positive, then save or share it.
   * Resolves true when the file reached Photos. A result that lands after
   * the photo changed is thrown away, file and all.
   */
  const runExport = useCallback(
    async (kind: ExportKind, format: ExportFormat): Promise<boolean> => {
      const negative = state.negative;
      const crop = state.crop;
      const orientation = state.orientation;
      if (!negative || !crop || !coefficients || exporting) return false;
      const startedIn = generation.current;
      // Stale once the photo changed or the screen went away: either way the
      // file is no longer wanted and nobody will clean it up later.
      const stale = () => unmounted.current || generation.current !== startedIn;
      setExporting(kind);
      setFailure(null);
      try {
        const hit = cached.current;
        let file: ExportedPositive;
        if (
          hit &&
          hit.coefficients === coefficients &&
          hit.format === format &&
          hit.crop === crop &&
          hit.orientation === orientation
        ) {
          file = hit.file;
        } else {
          file = await exportPositive(
            negative,
            coefficients,
            format,
            crop,
            orientation
          );
          if (stale()) {
            deleteExport(file.uri);
            return false;
          }
          if (hit) deleteExport(hit.file.uri);
          cached.current = { coefficients, format, crop, orientation, file };
        }
        if (kind === 'share') {
          // Dismissing the sheet rejects; that is a cancel, not an error.
          await Share.share({ url: file.uri }).catch(() => undefined);
          return false;
        }
        const saved = await saveToPhotos(file.uri);
        if (stale()) return false;
        if (!saved) {
          setFailure({
            generation: startedIn,
            message:
              'Photos access is off. Allow adding photos in Settings > Dorkroom.',
          });
          return false;
        }
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        return true;
      } catch (error) {
        if (!stale()) {
          setFailure({
            generation: startedIn,
            message:
              error instanceof InverterFailure
                ? error.message
                : 'The positive could not be exported.',
          });
        }
        return false;
      } finally {
        setExporting(null);
      }
    },
    [coefficients, exporting, state.negative, state.crop, state.orientation]
  );

  const actions = useMemo(
    () => ({
      chooseFromLibrary,
      openCapture,
      /** Close the photo and forget the session, file and all. */
      discard: () => {
        loadId.current++;
        deleteSource(sourceName.current);
        for (const name of retired.current) deleteSource(name);
        retired.current = [];
        sourceName.current = null;
        savedNegative.current = null;
        pending.current = null;
        clearSession();
        dispatch({ type: 'unload' });
      },
      setFilmType: (filmType: NegativeFilmType) =>
        dispatch({
          type: 'film-type',
          filmType,
          autoBase: propose(filmType, live.current.crop),
        }),
      setCrop: (crop: PixelRect) =>
        dispatch({
          type: 'crop',
          crop,
          autoBase: propose(live.current.filmType, crop),
        }),
      pick,
      clearNeutral: () => dispatch({ type: 'neutral', sample: null }),
      adjust: (key: keyof InversionAdjustments, value: number) =>
        dispatch({ type: 'adjust', key, value }),
      previewAdjust,
      reset: () => dispatch({ type: 'reset' }),
      setTool: (tool: InverterTool | null) => dispatch({ type: 'tool', tool }),
      setView: (view: InverterView) => dispatch({ type: 'view', view }),
      orient: (step: OrientationStep) => dispatch({ type: 'orient', step }),
      runExport,
    }),
    [chooseFromLibrary, openCapture, propose, pick, previewAdjust, runExport]
  );

  return {
    state,
    coefficients,
    uniforms,
    exporting,
    exportError:
      failure?.generation === state.generation ? failure.message : null,
    actions,
  };
}

export type NegativeInverterActions = ReturnType<
  typeof useNegativeInverter
>['actions'];
