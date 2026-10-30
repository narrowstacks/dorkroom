import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  type PersistedValue,
  useLocalStorageFormPersistence,
} from '../../hooks/use-local-storage-form-persistence';
import { definePersistedFormFields } from '../../utils/persisted-form-fields';

const STORAGE_KEY = 'persistedFormFieldsTest_v1';

const fields = definePersistedFormFields(STORAGE_KEY, {
  count: z.number().min(1).max(10),
  label: z.string().min(1),
  enabled: z.boolean(),
  withDefault: z.number().optional().default(5),
});

interface TestForm {
  count: number;
  label: string;
  enabled: boolean;
  withDefault: number;
  notPersisted: string;
}

const DEFAULTS: TestForm = {
  count: 3,
  label: 'default',
  enabled: false,
  withDefault: 5,
  notPersisted: 'untouched',
};

const hydrate = (stored: Record<string, PersistedValue>) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  const values: TestForm = { ...DEFAULTS };
  renderHook(() =>
    useLocalStorageFormPersistence<TestForm>({
      ...fields,
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

describe('definePersistedFormFields', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns the storage key and every schema key, in order', () => {
    expect(fields.storageKey).toBe(STORAGE_KEY);
    expect(fields.persistKeys).toEqual([
      'count',
      'label',
      'enabled',
      'withDefault',
    ]);
    expect(Object.keys(fields.validators)).toEqual(fields.persistKeys);
  });

  it('accepts values inside the bounds', () => {
    expect(fields.validators.count.validate(1)).toBe(true);
    expect(fields.validators.count.validate(10)).toBe(true);
    expect(fields.validators.label.validate('x')).toBe(true);
    expect(fields.validators.enabled.validate(true)).toBe(true);
  });

  it('rejects out-of-bounds values', () => {
    expect(fields.validators.count.validate(0)).toBe(false);
    expect(fields.validators.count.validate(11)).toBe(false);
    expect(fields.validators.label.validate('')).toBe(false);
  });

  it('rejects wrong types', () => {
    expect(fields.validators.count.validate('5')).toBe(false);
    expect(fields.validators.count.validate(null)).toBe(false);
    expect(fields.validators.enabled.validate(1)).toBe(false);
    expect(fields.validators.label.validate({ text: 'x' })).toBe(false);
  });

  it('rejects a missing value even when the schema would default it', () => {
    expect(z.number().optional().default(5).safeParse(undefined).success).toBe(
      true
    );
    expect(fields.validators.withDefault.validate(undefined)).toBe(false);
    expect(fields.validators.count.validate(undefined)).toBe(false);
  });

  it('hydrates valid values and keeps defaults for invalid ones', () => {
    expect(
      hydrate({ count: 7, label: 'saved', enabled: 'yes', withDefault: 'x' })
    ).toEqual({
      ...DEFAULTS,
      count: 7,
      label: 'saved',
    });
  });

  it('keeps defaults for keys missing from the stored snapshot', () => {
    expect(hydrate({ count: 9 })).toEqual({ ...DEFAULTS, count: 9 });
  });

  it('ignores stored keys outside the schema map', () => {
    expect(
      hydrate({ count: 4, notPersisted: 'tampered', unknownKey: 1 })
    ).toEqual({ ...DEFAULTS, count: 4 });
  });

  it('can express the border calculator field map', async () => {
    const { persistedBorderCalculatorFieldSchemas } =
      await import('../../hooks/border-calculator/use-border-calculator-state');
    const border = definePersistedFormFields(
      'border',
      persistedBorderCalculatorFieldSchemas
    );
    expect(border.persistKeys).toEqual(
      Object.keys(persistedBorderCalculatorFieldSchemas)
    );
    expect(border.validators.minBorder.validate(undefined)).toBe(false);
  });
});
