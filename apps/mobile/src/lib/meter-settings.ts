import {
  DEFAULT_CAMERA_EXPOSURE_APERTURE,
  DEFAULT_CAMERA_EXPOSURE_ISO,
  DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED,
  type MeterPriority,
} from '@dorkroom/logic';
import { createMMKV } from 'react-native-mmkv';

// Shares the light-meter store with the calibration offset.
const storage = createMMKV({ id: 'dorkroom-light-meter' });
// Exposed so the meter screen can persist the "lock ISO to the active roll" flag.
export const meterStorage = storage;
export const LOCK_ISO_TO_ROLL_KEY = 'lockIsoToRoll';
const KEYS = {
  priority: 'priority',
  aperture: 'apertureValue',
  shutterSpeed: 'shutterSpeedValue',
  iso: 'isoValue',
} as const;

export interface PersistedMeterSettings {
  priority: MeterPriority;
  aperture: number;
  shutterSpeed: number;
  iso: number;
}

const num = (value: number | undefined, fallback: number): number =>
  value === undefined || !Number.isFinite(value) ? fallback : value;

/** Reads the persisted locked setting (priority + its value) and ISO, falling
 * back to the camera-exposure defaults when unset/invalid. */
export function getMeterSettings(): PersistedMeterSettings {
  return {
    priority:
      storage.getString(KEYS.priority) === 'shutter' ? 'shutter' : 'aperture',
    aperture: num(
      storage.getNumber(KEYS.aperture),
      DEFAULT_CAMERA_EXPOSURE_APERTURE
    ),
    shutterSpeed: num(
      storage.getNumber(KEYS.shutterSpeed),
      DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED
    ),
    iso: num(storage.getNumber(KEYS.iso), DEFAULT_CAMERA_EXPOSURE_ISO),
  };
}

/** Persists the locked setting (priority + both values) and ISO. */
export function setMeterSettings(settings: PersistedMeterSettings): void {
  storage.set(KEYS.priority, settings.priority);
  storage.set(KEYS.aperture, settings.aperture);
  storage.set(KEYS.shutterSpeed, settings.shutterSpeed);
  storage.set(KEYS.iso, settings.iso);
}
