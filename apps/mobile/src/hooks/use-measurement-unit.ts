import type { MeasurementUnit } from '@dorkroom/logic';
import { useCallback, useMemo } from 'react';
import { useMMKVString } from 'react-native-mmkv';
import {
  MEASUREMENT_UNIT_KEY,
  normalizeMeasurementUnit,
  preferencesStorage,
  setMeasurementUnit,
} from '@/lib/measurement-settings';

/**
 * The global Imperial/Metric preference. Subscribes to the MMKV key, so a
 * change in Settings (or on Resize) re-renders every screen reading it.
 */
export function useMeasurementUnit(): readonly [
  MeasurementUnit,
  (unit: MeasurementUnit) => void,
] {
  const [raw] = useMMKVString(MEASUREMENT_UNIT_KEY, preferencesStorage);
  const unit = useMemo(() => normalizeMeasurementUnit(raw), [raw]);
  const setUnit = useCallback(
    (next: MeasurementUnit) => setMeasurementUnit(next),
    []
  );
  return [unit, setUnit] as const;
}
