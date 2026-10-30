import {
  EXPOSURE_STORAGE_KEY,
  exposureCalculatorPersistence,
  type ExposureFormState,
  type PersistedValue,
  useLocalStorageFormPersistence,
} from '@dorkroom/logic';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const { validators } = exposureCalculatorPersistence;

/** The page's own defaults. */
const DEFAULTS = { originalTime: 10, stops: 1 } satisfies ExposureFormState;

/** Run the real hydration path over a stored payload and return what landed. */
const hydrate = (stored: Partial<Record<string, PersistedValue>>) => {
  window.localStorage.setItem(EXPOSURE_STORAGE_KEY, JSON.stringify(stored));
  const values: ExposureFormState = { ...DEFAULTS };

  renderHook(() =>
    useLocalStorageFormPersistence({
      ...exposureCalculatorPersistence,
      form: {
        setFieldValue: (key, value) => {
          Object.assign(values, { [key]: value });
        },
      },
      formValues: values,
      disablePersistence: true,
    })
  );

  return values;
};

describe('exposure calculator hydration (issue #284)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists both fields under the existing storage key', () => {
    expect(exposureCalculatorPersistence.storageKey).toBe(EXPOSURE_STORAGE_KEY);
    expect(exposureCalculatorPersistence.persistKeys).toEqual([
      'originalTime',
      'stops',
    ]);
  });

  it('accepts values inside the form schema bounds', () => {
    expect(validators.originalTime.validate(0.1)).toBe(true);
    expect(validators.originalTime.validate(3600)).toBe(true);
    expect(validators.stops.validate(-5)).toBe(true);
    expect(validators.stops.validate(5)).toBe(true);
    expect(validators.stops.validate(0)).toBe(true);
  });

  it('rejects values the old finite-number check let through', () => {
    expect(validators.originalTime.validate(0)).toBe(false);
    expect(validators.originalTime.validate(-10)).toBe(false);
    expect(validators.originalTime.validate(3601)).toBe(false);
    expect(validators.stops.validate(-5.5)).toBe(false);
    expect(validators.stops.validate(12)).toBe(false);
  });

  it('rejects wrong types and missing values', () => {
    expect(validators.originalTime.validate('10')).toBe(false);
    expect(validators.stops.validate(null)).toBe(false);
    expect(validators.stops.validate(undefined)).toBe(false);
  });

  it('hydrates a valid stored payload unchanged', () => {
    expect(hydrate({ originalTime: 42, stops: -2 })).toEqual({
      originalTime: 42,
      stops: -2,
    });
  });

  it('keeps the default for an out-of-bounds stored value', () => {
    expect(hydrate({ originalTime: 0, stops: 9 })).toEqual(DEFAULTS);
    expect(hydrate({ originalTime: 7200, stops: 2 })).toEqual({
      originalTime: DEFAULTS.originalTime,
      stops: 2,
    });
  });
});
