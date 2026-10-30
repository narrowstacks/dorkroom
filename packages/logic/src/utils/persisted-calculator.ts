import { z } from 'zod';

/** A persisted snapshot: one JSON value per field name. */
export const persistedSnapshotSchema = z.record(z.string(), z.json());

/**
 * A field value as it comes back out of a persisted snapshot, or `undefined`
 * when the snapshot held no entry for that field.
 */
export type PersistedValue =
  z.infer<typeof persistedSnapshotSchema>[string] | undefined;

/**
 * A hydration validator derived from one field's bounds schema. It is a type
 * guard: a stored value it accepts is a valid value for the field, so
 * hydration can write it into form state without a cast.
 */
export interface PersistedFieldValidator<V> {
  validate: (value: PersistedValue) => value is PersistedValue & V;
}

/**
 * Everything the persistence hook needs to know about one calculator: where
 * its snapshot lives, which fields it holds, how to validate each stored
 * field, and the defaults a reset restores. Built by
 * `definePersistedCalculator` and passed to `usePersistedCalculator`.
 */
export interface PersistedCalculatorDefinition<
  T extends object,
  K extends keyof T & string = keyof T & string,
> {
  storageKey: string;
  persistKeys: K[];
  validators: { [P in K]: PersistedFieldValidator<T[P]> };
  defaults: T;
}

/**
 * A map of field name to bounds schema for the fields of `T` that persist.
 * Each schema's input and output must fit the field's type, so a schema for a
 * field `T` lacks, or one whose accepted values the field cannot hold, is a
 * type error at the definition site. (`undefined` is allowed as input so a
 * schema with `.optional().default()` still fits; the validator rejects a
 * missing value separately.)
 *
 * Hydration applies the stored value as is, not the schema's parsed output,
 * so a schema here must not change its input. A `.transform()` is caught by
 * this type; `z.coerce.*`, `z.preprocess` and `.catch()` are not (zod types
 * their input loosely), so do not use them in a persisted field map. As a
 * runtime backstop, a stored primitive is only accepted when the schema
 * returns it unchanged, so those schemas cannot pass a value of the wrong
 * type through for the primitive fields every calculator persists today.
 */
export type PersistedFieldSchemas<T extends object, S> = {
  [K in keyof S]: K extends keyof T ? z.ZodType<T[K], T[K] | undefined> : never;
};

/**
 * Derive a calculator's persistence definition from its storage key, a map of
 * field name to bounds schema, and its defaults, so keys and validators cannot
 * drift apart: every persisted key has a validator, and every validator checks
 * the same bounds the form does. A stored value that fails its schema falls
 * back to the default instead of flowing into form state.
 *
 * `undefined` (no stored entry) is rejected up front: a schema with
 * `.optional()` or `.default()` would otherwise accept it and hydrate the
 * raw `undefined` into the field.
 *
 * @example
 * ```typescript
 * const definition = definePersistedCalculator(
 *   'my-calc_v1',
 *   { originalTime: exposureTimeValidator(), stops: stopsValidator() },
 *   { originalTime: 10, stops: 1 }
 * );
 * usePersistedCalculator(definition, { values, setValues });
 * ```
 */
export function definePersistedCalculator<
  T extends object,
  const S extends PersistedFieldSchemas<T, S>,
>(
  storageKey: string,
  fieldSchemas: S,
  defaults: T
): PersistedCalculatorDefinition<T, keyof S & keyof T & string> {
  type Key = keyof S & keyof T & string;
  // SAFETY: Object.keys over S returns exactly its own string keys, and the
  // PersistedFieldSchemas constraint makes every one of them a key of T; the
  // assertion only recovers the literal key union TypeScript widens to string.
  const persistKeys = Object.keys(fieldSchemas) as Key[];
  const validators = Object.fromEntries(
    persistKeys.map((key) => {
      const schema: z.ZodType = fieldSchemas[key];
      return [
        key,
        {
          validate: (value: PersistedValue) => {
            if (value === undefined) return false;
            const result = schema.safeParse(value);
            if (!result.success) return false;
            // A coercing, preprocessing or `.catch()` schema can succeed with
            // a different value ('5' -> 5, 'abc' -> 0). The raw value is what
            // hydrates, so require a primitive to come back unchanged.
            return value instanceof Object || Object.is(result.data, value);
          },
        },
      ];
    })
  );

  return {
    storageKey,
    persistKeys,
    // SAFETY: built from persistKeys, so it holds exactly one entry per Key,
    // and each `validate` is a sound guard for T[Key]: it accepts only values
    // its schema parses, a schema's accepted input is typed T[Key] | undefined
    // by the PersistedFieldSchemas constraint, and undefined is rejected
    // first. The constraint misses coerce/preprocess/.catch() (documented
    // there); for primitive values the Object.is check closes that at runtime,
    // and an object value relies on the schema alone. TypeScript cannot derive
    // a type predicate from safeParse, hence the cast.
    validators: validators as PersistedCalculatorDefinition<
      T,
      Key
    >['validators'],
    defaults,
  };
}
