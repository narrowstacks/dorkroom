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
  isLocked: boolean;
  meterAtPoint: (point: { x: number; y: number }) => Promise<void>;
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
  const [isLocked, setIsLocked] = useState(false);

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
    const controller = cameraRef.current;
    if (controller == null) return;
    try {
      // AE-only metering at the tapped point via the CameraRef's view-coordinate focusTo.
      await controller.focusTo(point, { modes: ['AE'] });
      setIsLocked(true);
    } catch {
      // Metering not supported here; leave the reading live.
    }
  }, []);

  return {
    device,
    hasPermission,
    requestPermission,
    cameraRef,
    ev,
    isLocked,
    meterAtPoint,
    onInitialized,
  };
};
