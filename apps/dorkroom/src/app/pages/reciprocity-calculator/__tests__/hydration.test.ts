import {
  type PersistedValue,
  RECIPROCITY_STORAGE_KEY,
  type ReciprocityFormState,
  useLocalStorageFormPersistence,
} from '@dorkroom/logic';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { reciprocityHydrationValidators } from '../hydration';

const DEFAULTS = {
  filmType: 'tri-x',
  meteredTime: '30s',
  customFactor: 1.3,
} satisfies ReciprocityFormState;

const PERSIST_KEYS = ['filmType', 'meteredTime', 'customFactor'] as const;

/** Run the real hydration path over a stored payload and return what landed. */
const hydrate = (stored: Partial<Record<string, PersistedValue>>) => {
  window.localStorage.setItem(RECIPROCITY_STORAGE_KEY, JSON.stringify(stored));
  const values: ReciprocityFormState = { ...DEFAULTS };

  renderHook(() =>
    useLocalStorageFormPersistence({
      storageKey: RECIPROCITY_STORAGE_KEY,
      form: {
        setFieldValue: (key, value) => {
          Object.assign(values, { [key]: value });
        },
      },
      formValues: values,
      persistKeys: [...PERSIST_KEYS],
      validators: reciprocityHydrationValidators,
      disablePersistence: true,
    })
  );

  return values;
};

describe('reciprocityHydrationValidators (issue #239)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('accepts values the form schema accepts', () => {
    expect(reciprocityHydrationValidators.filmType.validate('tri-x')).toBe(
      true
    );
    expect(reciprocityHydrationValidators.filmType.validate('custom')).toBe(
      true
    );
    expect(reciprocityHydrationValidators.meteredTime.validate('30s')).toBe(
      true
    );
    expect(
      reciprocityHydrationValidators.meteredTime.validate('1h 30m 45s')
    ).toBe(true);
    expect(reciprocityHydrationValidators.customFactor.validate(1.3)).toBe(
      true
    );
  });

  it('rejects out-of-bounds and malformed values', () => {
    expect(reciprocityHydrationValidators.filmType.validate('')).toBe(false);
    // Not a member of RECIPROCITY_FILM_TYPES, so no factor could be looked up
    expect(reciprocityHydrationValidators.filmType.validate('not-a-film')).toBe(
      false
    );
    expect(
      reciprocityHydrationValidators.meteredTime.validate('not a time')
    ).toBe(false);
    expect(reciprocityHydrationValidators.customFactor.validate(0)).toBe(false);
    expect(reciprocityHydrationValidators.customFactor.validate(999)).toBe(
      false
    );
  });

  it('rejects wrong types and missing values', () => {
    expect(reciprocityHydrationValidators.filmType.validate(3)).toBe(false);
    expect(reciprocityHydrationValidators.meteredTime.validate(30)).toBe(false);
    expect(reciprocityHydrationValidators.customFactor.validate('1.3')).toBe(
      false
    );
    expect(
      reciprocityHydrationValidators.customFactor.validate(undefined)
    ).toBe(false);
  });

  it('hydrates a valid stored payload unchanged', () => {
    const values = hydrate({
      filmType: 'hp5',
      meteredTime: '2m 30s',
      customFactor: 1.45,
    });

    expect(values.filmType).toBe('hp5');
    expect(values.meteredTime).toBe('2m 30s');
    expect(values.customFactor).toBe(1.45);
  });

  it('keeps the default for an unknown film or a half-typed time', () => {
    const values = hydrate({
      filmType: 'not-a-film',
      meteredTime: '1m3',
      customFactor: 1.45,
    });

    expect(values.filmType).toBe(DEFAULTS.filmType);
    expect(values.meteredTime).toBe(DEFAULTS.meteredTime);
    expect(values.customFactor).toBe(1.45);
  });
});
