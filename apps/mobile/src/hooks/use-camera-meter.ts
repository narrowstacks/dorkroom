import {
  DEFAULT_METER_APERTURE,
  evFromCameraReading,
  METER_EV_SAMPLE_WINDOW,
  smoothEv,
} from '@dorkroom/logic';
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  type CameraRef,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';

const POLL_MS = 250;

export interface CameraMeter {
  device: ReturnType<typeof useCameraDevice>;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  cameraRef: RefObject<CameraRef | null>;
  ev: number | null;
  meterAtPoint: (point: { x: number; y: number }) => Promise<void>;
  unlock: () => Promise<void>;
  onInitialized: () => void;
}

/**
 * Polls the camera's auto-exposure (exposureDuration + iso), smooths the EV, and
 * exposes a tap-to-meter lock. Returns EV at ISO 100 for the pure solver.
 */
export const useCameraMeter = (calibrationOffset: number): CameraMeter => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<CameraRef | null>(null);
  const samplesRef = useRef<number[]>([]);
  const initializedRef = useRef(false);
  const [ev, setEv] = useState<number | null>(null);

  const readEv = useCallback((): number => {
    const controller = cameraRef.current?.controller;
    if (controller == null) return Number.NaN;
    return evFromCameraReading(
      controller.exposureDuration,
      controller.iso,
      DEFAULT_METER_APERTURE,
      calibrationOffset
    );
  }, [calibrationOffset]);

  const onInitialized = useCallback(() => {
    initializedRef.current = true;
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (!initializedRef.current) return;
      const sample = readEv();
      const buffer = samplesRef.current;
      buffer.push(sample);
      if (buffer.length > METER_EV_SAMPLE_WINDOW) buffer.shift();
      const smoothed = smoothEv(buffer);
      setEv(Number.isFinite(smoothed) ? smoothed : null);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [readEv]);

  const meterAtPoint = useCallback(async (point: { x: number; y: number }) => {
    const camera = cameraRef.current;
    if (camera == null) return;
    try {
      // AE-only spot metering at the tapped point, locked (frozen) until reset.
      await camera.focusTo(point, {
        modes: ['AE'],
        adaptiveness: 'locked',
        autoResetAfter: null,
      });
    } catch {
      // Metering not supported here; leave the reading live.
    }
  }, []);

  const unlock = useCallback(async () => {
    const camera = cameraRef.current;
    try {
      // Reset to continuous (center-weighted) auto-exposure so EV tracks live.
      await camera?.controller?.resetFocus();
    } catch {
      // resetFocus unsupported; the next tap will re-meter regardless.
    }
  }, []);

  return {
    device,
    hasPermission,
    requestPermission,
    cameraRef,
    ev,
    meterAtPoint,
    unlock,
    onInitialized,
  };
};
