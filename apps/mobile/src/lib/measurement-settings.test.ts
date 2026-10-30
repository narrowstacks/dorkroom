import { beforeEach, describe, expect, it } from 'vitest';
import {
  getMeasurementUnit,
  MEASUREMENT_UNIT_KEY,
  normalizeMeasurementUnit,
  preferencesStorage,
  setMeasurementUnit,
} from './measurement-settings';

describe('measurement-settings', () => {
  beforeEach(() => preferencesStorage.clearAll());

  it('defaults to imperial when unset', () => {
    expect(getMeasurementUnit()).toBe('imperial');
  });

  it('round-trips metric and back', () => {
    setMeasurementUnit('metric');
    expect(getMeasurementUnit()).toBe('metric');
    setMeasurementUnit('imperial');
    expect(getMeasurementUnit()).toBe('imperial');
  });

  it('stores the bare unit string under the web key', () => {
    setMeasurementUnit('metric');
    expect(preferencesStorage.getString(MEASUREMENT_UNIT_KEY)).toBe('metric');
  });

  it('hydrates an unknown or malformed stored value as the default', () => {
    preferencesStorage.set(MEASUREMENT_UNIT_KEY, '"metric"');
    expect(getMeasurementUnit()).toBe('imperial');
    expect(normalizeMeasurementUnit('cm')).toBe('imperial');
    expect(normalizeMeasurementUnit(undefined)).toBe('imperial');
  });
});
