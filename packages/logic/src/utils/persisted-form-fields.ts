import type { z } from 'zod';
import type { PersistedValue } from '../hooks/use-local-storage-form-persistence';

/** A hydration validator derived from one field's bounds schema. */
export interface PersistedFieldValidator {
  validate: (value: PersistedValue) => boolean;
}

/**
 * The storage key, persist-key list and per-key hydration validators for a
 * persisted form, all derived from one field-schema map. Spread it into
 * `useLocalStorageFormPersistence` alongside `form` and `formValues`.
 */
export interface PersistedFormFields<K extends string> {
  storageKey: string;
  persistKeys: K[];
  validators: Record<K, PersistedFieldValidator>;
}

/**
 * Derive a persisted form's persist keys and hydration validators from a map
 * of field name to bounds schema, so the three cannot drift apart: every
 * persisted key has a validator, and every validator checks the same bounds
 * the form does. A stored value that fails its schema falls back to the
 * form's default instead of flowing into form state.
 *
 * `undefined` (no stored entry) is rejected up front: a schema with
 * `.optional()` or `.default()` would otherwise accept it and hydrate the
 * raw `undefined` into the field.
 *
 * The keys are checked against the form at the call site:
 * `persistKeys` must be assignable to the form's own keys, so a schema entry
 * for a field the form does not have is a type error.
 *
 * @example
 * ```typescript
 * const persistence = definePersistedFormFields('my-calc_v1', {
 *   originalTime: exposureTimeValidator(),
 *   stops: stopsValidator(),
 * });
 * useLocalStorageFormPersistence({ ...persistence, form, formValues });
 * ```
 */
export function definePersistedFormFields<
  const S extends Record<string, z.ZodType>,
>(storageKey: string, fieldSchemas: S): PersistedFormFields<keyof S & string> {
  type Key = keyof S & string;
  // SAFETY: Object.keys over S returns exactly its own string keys; the
  // assertion only recovers the literal key union TypeScript widens to string.
  const persistKeys = Object.keys(fieldSchemas) as Key[];
  // SAFETY: built from persistKeys, so it holds exactly one entry per Key.
  const validators = Object.fromEntries(
    persistKeys.map((key) => {
      const schema = fieldSchemas[key];
      return [
        key,
        {
          validate: (value: PersistedValue) =>
            value !== undefined && schema.safeParse(value).success,
        },
      ];
    })
  ) as Record<Key, PersistedFieldValidator>;

  return { storageKey, persistKeys, validators };
}

/**
 * The slice of a form `useLocalStorageFormPersistence` drives. Calculators
 * that keep their state in `useState` rather than TanStack Form expose the
 * same shape through `createStateFormAdapter`.
 */
export interface PersistenceFormAdapter<T extends object> {
  setFieldValue: (field: keyof T, value: T[keyof T]) => void;
  reset: () => void;
}

/**
 * Adapt a `useState` setter to the form shape the persistence hook expects, so
 * hydration writes one field at a time and `resetToDefaults` restores
 * `defaults`. `onReset` runs first, for state that describes the inputs being
 * discarded (a preset notice, say).
 */
export function createStateFormAdapter<T extends object>(
  setValues: (update: (prev: T) => T) => void,
  defaults: T,
  onReset?: () => void
): PersistenceFormAdapter<T> {
  return {
    setFieldValue: (field, value) =>
      setValues((prev) => ({ ...prev, [field]: value })),
    reset: () => {
      onReset?.();
      setValues(() => defaults);
    },
  };
}
