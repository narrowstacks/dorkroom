import { DEFAULT_METER_CALIBRATION_OFFSET } from '@dorkroom/logic';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'dorkroom-light-meter' });
const KEY = 'calibrationOffsetStops';

/** Reads the persisted calibration offset in stops, defaulting when unset/invalid. */
export function getCalibrationOffset(): number {
  const value = storage.getNumber(KEY);
  return value === undefined || !Number.isFinite(value)
    ? DEFAULT_METER_CALIBRATION_OFFSET
    : value;
}

/** Persists the calibration offset in stops. */
export function setCalibrationOffset(stops: number): void {
  storage.set(KEY, stops);
}
