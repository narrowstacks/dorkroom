import type {
  InversionAdjustments,
  NegativeFilmType,
  PixelPoint,
  PixelSize,
} from '@dorkroom/logic';
import type { SkImage } from '@shopify/react-native-skia';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  type CameraController,
  type CameraDevice,
  CommonResolutions,
  type Constraint,
  type Frame,
  useCamera,
  useFrameOutput,
  usePhotoOutput,
} from 'react-native-vision-camera';
import { createSynchronizable, scheduleOnUI } from 'react-native-worklets';
import {
  IDLE_UNIFORMS,
  type InversionUniforms,
  inversionUniforms,
  mixUniforms,
} from '@/components/negative-inverter/inversion-sksl';
import {
  type BaseSample,
  inverterCoefficients,
  isUnsureBase,
} from '@/components/negative-inverter/inverter-state';
import {
  exposureCorrection,
  type FilmExposure,
  isBlueClipping,
  nextExposureBias,
} from '@/components/negative-inverter/live-exposure';
import {
  type AutoBaseTrack,
  type LiveCarry,
  type LiveFraming,
  type LiveReading,
  type LiveSnapshot,
  needsStatsPass,
  NO_AUTO_BASE,
  readLiveSnapshot,
} from '@/components/negative-inverter/live-reading';
import {
  EXPOSURE_SETTLE_MS,
  exposureSettled,
  IDLE_SNAPSHOT_CLOCK,
  SNAPSHOT_INTERVAL_MS,
  snapshotChanged,
  snapshotDue,
  snapshotReceived,
  snapshotRequested,
} from '@/components/negative-inverter/live-snapshot';
import { disposeOnUi, renderLiveFrame } from '@/lib/live-frame';

export interface LiveInverterSettings {
  filmType: NegativeFilmType;
  adjustments: InversionAdjustments;
}

/** A captured photo and the live framing to open it with. */
export interface LiveCapture {
  uri: string;
  carry: LiveCarry;
}

// Frames are dropped, by design, while the previous one is still drawing.
const ignoreDroppedFrame = () => undefined;

const STABILIZATION_OFF: Constraint[] = [
  { videoStabilizationMode: 'off' },
  { previewStabilizationMode: 'off' },
];

/** How long the live view eases to new coefficients, in ms. */
const EASE_MS = 250;

/** What the live UI shows about the latest reading: React state, so it is
 *  replaced only when one of these changes, not on every snapshot. */
export interface LiveView {
  base: BaseSample | null;
  exposure: FilmExposure | null;
  /** Coefficients exist, so the positive can be drawn. */
  ready: boolean;
}

const EMPTY_VIEW: LiveView = { base: null, exposure: null, ready: false };

const blueShare = (e: FilmExposure | null) =>
  e ? Math.round(e.blueClipped * 100) : -1;

/** Same on screen: base marker and badge, clipping badge, positive on. */
function sameView(a: LiveView, b: LiveView): boolean {
  return (
    a.ready === b.ready &&
    a.base?.point.x === b.base?.point.x &&
    a.base?.point.y === b.base?.point.y &&
    a.base?.auto === b.base?.auto &&
    isUnsureBase(a.base) === isUnsureBase(b.base) &&
    blueShare(a.exposure) === blueShare(b.exposure) &&
    isBlueClipping(a.exposure) === isBlueClipping(b.exposure)
  );
}

/**
 * The live camera inverter: a camera session with a frame output (the live
 * view, see src/lib/live-frame.ts) and a photo output (the capture), the
 * coefficients derived from statistics snapshots, and the exposure loop that
 * meters for the film (see live-exposure.ts).
 *
 * Threads: frames are drawn on the camera's frame queue and reach the stage
 * through the JS thread (`onImage`; see live-frame.ts for why not directly),
 * so JS work is kept short: statistics passes are a few ms and skipped when
 * the picture is unchanged. Snapshot pixels come to the JS thread at most every
 * SNAPSHOT_INTERVAL_MS; a pass runs only when the picture changed (or the
 * framing, film type or exposure did), outside React's render. Its
 * coefficients reach the shader through shared values, eased over EASE_MS
 * on the UI thread; React state holds only what the badges show.
 */
export function useLiveInverter(
  device: CameraDevice,
  { filmType, adjustments }: LiveInverterSettings
) {
  const isFocused = useIsFocused();
  const image = useSharedValue<SkImage | null>(null);
  const shownSize = useRef<PixelSize>({ width: 0, height: 0 });
  const [liveSize, setLiveSize] = useState<PixelSize | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [framing, setFraming] = useState<LiveFraming>({ basePoint: null });
  const [view, setView] = useState<LiveView>(EMPTY_VIEW);
  const [meterForFilm, setMeterForFilm] = useState(true);
  const [bias, setBias] = useState(0);
  const [capturing, setCapturing] = useState(false);

  const snapshotWanted = useMemo(() => createSynchronizable(false), []);
  // Backpressure: one live image in flight at a time (see live-frame.ts).
  const imagePending = useMemo(() => createSynchronizable(false), []);
  const lastFailure = useMemo(() => createSynchronizable(''), []);
  const clock = useRef(IDLE_SNAPSHOT_CLOCK);
  const mounted = useRef(true);

  /** Show a new live image; the UI thread frees the one it replaces once
   *  no draw can still be using it. */
  const onImage = useCallback(
    (next: SkImage) => {
      imagePending.setBlocking(false);
      if (!mounted.current) {
        scheduleOnUI(disposeOnUi, next);
        return;
      }
      const old = image.get();
      image.set(next);
      if (old) scheduleOnUI(disposeOnUi, old);
      const width = next.width();
      const height = next.height();
      const shown = shownSize.current;
      if (shown.width !== width || shown.height !== height) {
        shownSize.current = { width, height };
        setLiveSize({ width, height });
      }
    },
    [image, imagePending]
  );

  // The shader's uniforms: eased from `from` to `to` as `t` runs 0 to 1.
  const fromUniforms = useSharedValue<InversionUniforms>(IDLE_UNIFORMS);
  const toUniforms = useSharedValue<InversionUniforms>(IDLE_UNIFORMS);
  const ease = useSharedValue(1);
  // False until the first real coefficients: those snap in rather than ease
  // from the idle uniforms.
  const shownReal = useSharedValue(false);
  const uniforms = useDerivedValue(() =>
    mixUniforms(fromUniforms.value, toUniforms.value, ease.value)
  );
  const showUniforms = useCallback(
    (next: InversionUniforms, eased: boolean) => {
      scheduleOnUI(() => {
        'worklet';
        const shown = mixUniforms(
          fromUniforms.value,
          toUniforms.value,
          ease.value
        );
        const glide = eased && shownReal.value;
        shownReal.value = true;
        fromUniforms.value = glide ? shown : next;
        toUniforms.value = next;
        ease.value = 0;
        ease.value = glide ? withTiming(1, { duration: EASE_MS }) : 1;
      });
    },
    [ease, fromUniforms, shownReal, toUniforms]
  );

  const onFailure = useCallback((message: string) => {
    if (mounted.current) setFailure((current) => current ?? message);
  }, []);

  // Everything a statistics pass reads, kept current without re-creating
  // the snapshot handler.
  const settings = useRef({ framing, filmType, adjustments, meterForFilm });
  const controllerRef = useRef<CameraController | undefined>(undefined);
  const pass = useRef<{
    snapshot: LiveSnapshot | null;
    track: AutoBaseTrack;
    reading: LiveReading | null;
  }>({ snapshot: null, track: NO_AUTO_BASE, reading: null });
  const exposureChangedAt = useRef<number | null>(null);

  /** Coefficients from the last reading and the given adjustments. */
  const publish = useCallback(
    (reading: LiveReading | null, eased: boolean) => {
      const { filmType: type, adjustments: adj } = settings.current;
      const coeffs = inverterCoefficients(reading?.statistics ?? null, {
        base: reading?.base ?? null,
        filmType: type,
        adjustments: adj,
        neutral: null,
      });
      if (coeffs) showUniforms(inversionUniforms(coeffs), eased);
      const next: LiveView = {
        base: reading?.base ?? null,
        exposure: reading?.exposure ?? null,
        ready: coeffs !== null,
      };
      setView((prev) => (sameView(prev, next) ? prev : next));
    },
    [showUniforms]
  );

  /** Meter for the film: move the exposure bias if the densest blue is
   *  crushed or the base clipped, once the last move settled. */
  const meter = useCallback((reading: LiveReading) => {
    const controller = controllerRef.current;
    const exposure = reading.exposure;
    if (!controller || !settings.current.meterForFilm || !exposure) return;
    const { supportsExposureBias, minExposureBias, maxExposureBias } =
      controller.device;
    if (!supportsExposureBias) return;
    const now = Date.now();
    if (!exposureSettled(exposureChangedAt.current, now)) return;
    const current = controller.exposureBias;
    const next = nextExposureBias(
      current,
      exposureCorrection(exposure, reading.base?.rgb ?? null),
      minExposureBias,
      maxExposureBias
    );
    if (next === current) return;
    exposureChangedAt.current = now;
    controller
      .setExposureBias(next)
      .then(() => {
        if (mounted.current) setBias(next);
      })
      .catch(() => undefined);
  }, []);

  /**
   * One statistics pass on `snapshot`. `force` takes a new automatic base at
   * once (framing or film type changed); otherwise it goes through the
   * hysteresis in settleAutoBase, except while the camera exposure settles.
   */
  const runPass = useCallback(
    (snapshot: LiveSnapshot, force: boolean) => {
      const { framing: f, filmType: type } = settings.current;
      const exposureMoving =
        exposureChangedAt.current !== null &&
        Date.now() - exposureChangedAt.current < EXPOSURE_SETTLE_MS * 2;
      const { reading, track } = readLiveSnapshot(
        snapshot,
        f,
        type,
        pass.current.track,
        force || exposureMoving
      );
      pass.current = { snapshot, track, reading };
      publish(reading, true);
      meter(reading);
    },
    [meter, publish]
  );

  const onSnapshot = useCallback(
    (
      pixels: Uint8Array,
      width: number,
      height: number,
      liveWidth: number,
      liveHeight: number
    ) => {
      clock.current = snapshotReceived(clock.current);
      if (!mounted.current) return;
      const snapshot = {
        image: { data: pixels, width, height },
        live: { width: liveWidth, height: liveHeight },
      };
      // A steady negative repeats itself: no need to measure it again,
      // unless a new automatic base is still collecting votes.
      const changed = snapshotChanged(
        pass.current.snapshot?.image ?? null,
        snapshot.image
      );
      if (!needsStatsPass(changed, pass.current.track)) return;
      runPass(snapshot, false);
    },
    [runPass]
  );

  // New framing or film type: re-read the last snapshot at once (a tap does
  // not wait for the next one), taking the new automatic base directly.
  useEffect(() => {
    settings.current = { ...settings.current, framing, filmType };
    const last = pass.current.snapshot;
    if (last) runPass(last, true);
  }, [framing, filmType, runPass]);

  // New adjustments (a slider released): recompute from the same reading.
  useEffect(() => {
    settings.current = { ...settings.current, adjustments };
    publish(pass.current.reading, false);
  }, [adjustments, publish]);

  useEffect(() => {
    settings.current = { ...settings.current, meterForFilm };
  }, [meterForFilm]);

  const onFrame = useCallback(
    (frame: Frame) => {
      'worklet';
      renderLiveFrame(frame, {
        snapshotWanted,
        imagePending,
        onImage,
        onSnapshot,
        onFailure,
        lastFailure,
      });
    },
    [snapshotWanted, imagePending, onImage, onSnapshot, onFailure, lastFailure]
  );

  const frameOutput = useFrameOutput({
    // 4:3 like the photo, so both see the same field.
    targetResolution: CommonResolutions.HD_4_3,
    // Native YUV: Skia wraps it as a texture with no conversion or copy.
    pixelFormat: 'yuv',
    dropFramesWhileBusy: true,
    onFrame,
    onFrameDropped: ignoreDroppedFrame,
  });
  const photoOutput = usePhotoOutput({
    targetResolution: CommonResolutions.HIGHEST_4_3,
    // JPEG at full quality. HEIC is the iOS default but Skia 2.6.2 has no
    // HEIF codec; vision-camera 5.1 has no bit-depth option; a DNG would go
    // through Skia's software RAW decoder twice (proxy and export) at full
    // size, untested on device and far slower.
    containerFormat: 'jpeg',
    quality: 1,
    qualityPrioritization: 'quality',
  });
  const outputs = useMemo(
    () => [frameOutput, photoOutput],
    [frameOutput, photoOutput]
  );
  const onCameraError = useCallback(
    () => onFailure('The camera stopped. Leave live mode and try again.'),
    [onFailure]
  );
  const controller = useCamera({
    isActive: isFocused,
    device,
    outputs,
    // The screen is portrait-locked: frames and photos come upright.
    orientationSource: 'interface',
    // Stabilization crops and shifts the stream, so the live framing would
    // no longer match the photo it carries over to.
    constraints: STABILIZATION_OFF,
    onError: onCameraError,
  });

  useEffect(() => {
    controllerRef.current = controller;
  }, [controller]);

  // Teardown: the last image is freed on the UI thread; images still on
  // their way are freed as they arrive (onImage). GPU objects never leave
  // the frame call that made them.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const last = image.get();
      image.set(null);
      if (last) scheduleOnUI(disposeOnUi, last);
    };
  }, [image]);

  // Ask the frame thread for a statistics snapshot on a steady beat.
  useEffect(() => {
    if (!isFocused) return;
    const id = setInterval(() => {
      const now = Date.now();
      if (!snapshotDue(clock.current, now)) return;
      clock.current = snapshotRequested(now);
      snapshotWanted.setBlocking(true);
    }, SNAPSHOT_INTERVAL_MS / 2);
    return () => clearInterval(id);
  }, [isFocused, snapshotWanted]);

  /** Redraw with a slider's value mid-drag, without committing it. */
  const previewAdjust = useCallback(
    (key: keyof InversionAdjustments, value: number) => {
      const reading = pass.current.reading;
      const s = settings.current;
      const coeffs = inverterCoefficients(reading?.statistics ?? null, {
        base: reading?.base ?? null,
        filmType: s.filmType,
        adjustments: { ...s.adjustments, [key]: value },
        neutral: null,
      });
      if (coeffs) showUniforms(inversionUniforms(coeffs), false);
    },
    [showUniforms]
  );

  const toggleMeterForFilm = useCallback(
    (on: boolean) => {
      setMeterForFilm(on);
      if (on || !controller?.device.supportsExposureBias) return;
      // Back to the camera's own metering.
      exposureChangedAt.current = null;
      controller
        .setExposureBias(0)
        .then(() => {
          if (mounted.current) setBias(0);
        })
        .catch(() => undefined);
    },
    [controller]
  );

  /** Take a full-resolution photo; resolves with it and the framing. */
  const capture = useCallback(async (): Promise<LiveCapture | null> => {
    if (capturing || !liveSize) return null;
    setCapturing(true);
    try {
      // No flash: it would light the film from the wrong side.
      const file = await photoOutput.capturePhotoToFile(
        { flashMode: 'off' },
        {}
      );
      const uri = file.filePath.startsWith('file://')
        ? file.filePath
        : `file://${file.filePath}`;
      return { uri, carry: { ...framing, live: liveSize } };
    } catch {
      if (mounted.current)
        setFailure('The photo could not be taken. Try again.');
      return null;
    } finally {
      if (mounted.current) setCapturing(false);
    }
  }, [capturing, framing, liveSize, photoOutput]);

  const pickBase = useCallback(
    (basePoint: PixelPoint) => setFraming((f) => ({ ...f, basePoint })),
    []
  );
  const autoBase = useCallback(
    () => setFraming((f) => ({ ...f, basePoint: null })),
    []
  );

  const actions = useMemo(
    () => ({
      pickBase,
      autoBase,
      setMeterForFilm: toggleMeterForFilm,
      previewAdjust,
      capture,
    }),
    [pickBase, autoBase, toggleMeterForFilm, previewAdjust, capture]
  );

  return {
    image,
    liveSize,
    framing,
    view,
    uniforms,
    meterForFilm,
    bias,
    capturing,
    failure,
    actions,
  };
}
