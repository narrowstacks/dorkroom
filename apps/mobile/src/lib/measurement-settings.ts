import type { MeasurementUnit } from '@dorkroom/logic';
import { createMMKV } from 'react-native-mmkv';

/**
 * The app-wide Imperial/Metric preference (#263), the iOS counterpart of web's
 * `MeasurementProvider`. Stored as the bare unit string under the same key web
 * uses, so the two read the same way. Lengths are still computed and stored in
 * inches everywhere; this only picks how they are displayed.
 */
export const preferencesStorage = createMMKV({ id: 'dorkroom-preferences' });
export const MEASUREMENT_UNIT_KEY = 'dorkroom-measurement-unit';
export const DEFAULT_MEASUREMENT_UNIT: MeasurementUnit = 'imperial';

/** A stored value back to a unit; anything unset or unknown is the default. */
export function normalizeMeasurementUnit(
  raw: string | undefined
): MeasurementUnit {
  return raw === 'imperial' || raw === 'metric'
    ? raw
    : DEFAULT_MEASUREMENT_UNIT;
}

export function getMeasurementUnit(): MeasurementUnit {
  return normalizeMeasurementUnit(
    preferencesStorage.getString(MEASUREMENT_UNIT_KEY)
  );
}

export function setMeasurementUnit(unit: MeasurementUnit): void {
  preferencesStorage.set(MEASUREMENT_UNIT_KEY, unit);
}
