import {
  DEFAULT_NEW_HEIGHT,
  DEFAULT_NEW_LENGTH,
  DEFAULT_NEW_WIDTH,
  DEFAULT_ORIGINAL_HEIGHT,
  DEFAULT_ORIGINAL_LENGTH,
  DEFAULT_ORIGINAL_TIME,
  DEFAULT_ORIGINAL_WIDTH,
  type PersistedValue,
  RESIZE_STORAGE_KEY,
  type ResizeCalculatorState,
  useLocalStorageFormPersistence,
} from '@dorkroom/logic';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { resizeHydrationValidators } from '../hydration';

/** The page's own defaults, so "falls back to the default" means the real one. */
const DEFAULTS = {
  isEnlargerHeightMode: false,
  originalWidth: Number(DEFAULT_ORIGINAL_WIDTH),
  originalLength: Number(DEFAULT_ORIGINAL_LENGTH),
  newWidth: Number(DEFAULT_NEW_WIDTH),
  newLength: Number(DEFAULT_NEW_LENGTH),
  originalTime: Number(DEFAULT_ORIGINAL_TIME),
  originalHeight: Number(DEFAULT_ORIGINAL_HEIGHT),
  newHeight: Number(DEFAULT_NEW_HEIGHT),
} satisfies ResizeCalculatorState;

const PERSIST_KEYS = [
  'isEnlargerHeightMode',
  'originalWidth',
  'originalLength',
  'newWidth',
  'newLength',
  'originalTime',
  'originalHeight',
  'newHeight',
] as const;

/** Run the real hydration path over a stored payload and return what landed. */
const hydrate = (stored: Partial<Record<string, PersistedValue>>) => {
  window.localStorage.setItem(RESIZE_STORAGE_KEY, JSON.stringify(stored));
  const values: ResizeCalculatorState = { ...DEFAULTS };

  renderHook(() =>
    useLocalStorageFormPersistence({
      storageKey: RESIZE_STORAGE_KEY,
      form: {
        setFieldValue: (key, value) => {
          Object.assign(values, { [key]: value });
        },
      },
      formValues: values,
      persistKeys: [...PERSIST_KEYS],
      validators: resizeHydrationValidators,
      disablePersistence: true,
    })
  );

  return values;
};

describe('resizeHydrationValidators (issue #239)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('accepts values the form schema accepts', () => {
    expect(resizeHydrationValidators.originalWidth.validate(4)).toBe(true);
    expect(resizeHydrationValidators.newHeight.validate(0.5)).toBe(true);
    expect(resizeHydrationValidators.originalTime.validate(10)).toBe(true);
    expect(resizeHydrationValidators.isEnlargerHeightMode.validate(true)).toBe(
      true
    );
  });

  it('rejects out-of-bounds numbers', () => {
    expect(resizeHydrationValidators.originalWidth.validate(0)).toBe(false);
    expect(resizeHydrationValidators.originalWidth.validate(-4)).toBe(false);
    expect(resizeHydrationValidators.newWidth.validate(100000)).toBe(false);
    expect(resizeHydrationValidators.originalTime.validate(0)).toBe(false);
    expect(resizeHydrationValidators.originalTime.validate(999999)).toBe(false);
  });

  it('rejects wrong types and missing values', () => {
    expect(resizeHydrationValidators.originalWidth.validate('4')).toBe(false);
    expect(resizeHydrationValidators.originalWidth.validate(null)).toBe(false);
    expect(resizeHydrationValidators.originalWidth.validate(undefined)).toBe(
      false
    );
    expect(resizeHydrationValidators.isEnlargerHeightMode.validate(1)).toBe(
      false
    );
  });

  it('hydrates a valid stored payload unchanged', () => {
    const values = hydrate({
      isEnlargerHeightMode: true,
      originalWidth: 5,
      originalTime: 12.5,
      newHeight: 750,
    });

    expect(values.isEnlargerHeightMode).toBe(true);
    expect(values.originalWidth).toBe(5);
    expect(values.originalTime).toBe(12.5);
    expect(values.newHeight).toBe(750);
  });

  it('keeps the default when a field was cleared before reload', () => {
    // Clearing a number field persists 0, which the form schema rejects, so
    // the field comes back at its default rather than as an invalid 0.
    const values = hydrate({ originalWidth: 0, originalTime: 0, newWidth: 8 });

    expect(values.originalWidth).toBe(DEFAULTS.originalWidth);
    expect(values.originalTime).toBe(DEFAULTS.originalTime);
    expect(values.newWidth).toBe(8);
  });

  it('keeps the default for a tampered payload', () => {
    const values = hydrate({
      originalWidth: '4',
      newLength: -12,
      isEnlargerHeightMode: 'yes',
    });

    expect(values.originalWidth).toBe(DEFAULTS.originalWidth);
    expect(values.newLength).toBe(DEFAULTS.newLength);
    expect(values.isEnlargerHeightMode).toBe(false);
  });
});
