import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  createLocalStorageAdapter,
  type KeyValueStorage,
} from '../services/key-value-storage';
import { removeSupersededStorageKeys } from '../services/local-storage';
import { debugWarn } from '../utils/debug-logger';
import {
  type PersistedCalculatorDefinition,
  persistedSnapshotSchema,
  type PersistedValue,
} from '../utils/persisted-calculator';

/** How long state must sit still before it is written (slider drags). */
export const PERSIST_DEBOUNCE_MS = 300;

const defaultStorage = createLocalStorageAdapter();

const PersistenceStorageContext = createContext<KeyValueStorage | null>(null);

/**
 * Supplies the store persisted calculators read and write. The iOS app
 * provides an MMKV adapter once at its root. Without a provider, calculators
 * use `localStorage` (the web app relies on this), and a development build
 * warns if the host has none.
 */
export const PersistenceStorageProvider = PersistenceStorageContext.Provider;

/** The storage persisted calculators use under the current provider. */
export function usePersistenceStorage(): KeyValueStorage {
  return useContext(PersistenceStorageContext) ?? defaultStorage;
}

/**
 * A TanStack Form instance, or anything with the same two methods. `reset` is
 * what `resetToDefaults` calls; TanStack Form's own restores its
 * `defaultValues`.
 */
export interface PersistedFormTarget<T extends object> {
  setFieldValue: (field: keyof T, value: T[keyof T]) => void;
  reset?: () => void;
}

interface FormBinding<T extends object> {
  /** A TanStack Form (or compatible) holding the calculator's values. */
  form: PersistedFormTarget<T>;
  setValues?: never;
  onReset?: never;
}

interface StateBinding<T extends object> {
  /**
   * A `useState` setter holding the calculator's values. Hydration writes one
   * field at a time through it, and a reset restores `definition.defaults`.
   */
  setValues: (update: (prev: T) => T) => void;
  /**
   * Runs before a reset, for state that describes the inputs being discarded
   * (a preset notice, say). Keep it stable (`useCallback`).
   */
  onReset?: () => void;
  form?: never;
}

export type UsePersistedCalculatorOptions<T extends object> = (
  FormBinding<T> | StateBinding<T>
) & {
  /** The calculator's current values. The persisted keys are written. */
  values: T;
  /**
   * Called once after hydration with the fields that were applied, stored
   * and overridden alike. Not called when nothing was stored (or the stored
   * snapshot was unreadable) and no override applied.
   */
  onHydrated?: (loadedValues: Partial<T>) => void;
  /**
   * Values from outside the store (a calculator link's search params),
   * applied once on mount after the stored snapshot, so they win. Each is
   * checked by its field's validator like a stored value, and a key the
   * definition does not persist is ignored. Applied values then persist
   * through the normal debounced write. Read once: later changes are ignored.
   */
  overrides?: Partial<T>;
};

export interface UsePersistedCalculatorReturn {
  /** Remove the stored snapshot. */
  clearPersistedData: () => void;
  /**
   * Restore the defaults and drop the stored snapshot, so the reset holds
   * across a reload even if one lands before the debounced write of the
   * default values.
   */
  resetToDefaults: () => void;
}

/**
 * Persist a calculator's values through the storage seam.
 *
 * - **Hydrate** once on mount: read the snapshot, validate each persisted key
 *   with its definition validator, and apply only the fields that pass (an
 *   invalid or missing field keeps its default). Then apply `overrides`
 *   (a calculator link's values) the same way, so they win.
 * - **Persist** the persisted keys as one JSON object,
 *   `PERSIST_DEBOUNCE_MS` after the values stop changing.
 * - **Clear / reset**: drop the snapshot, optionally restoring defaults.
 *
 * Storage errors are logged in development and otherwise ignored, so a full
 * or blocked store never breaks the calculator.
 *
 * @example
 * ```typescript
 * const [values, setValues] = useState(matCalculatorPersistence.defaults);
 * const { resetToDefaults } = usePersistedCalculator(matCalculatorPersistence, {
 *   values,
 *   setValues,
 * });
 * ```
 */
export function usePersistedCalculator<
  T extends object,
  K extends keyof T & string,
>(
  definition: PersistedCalculatorDefinition<T, K>,
  options: UsePersistedCalculatorOptions<T>
): UsePersistedCalculatorReturn {
  const { storageKey, persistKeys, validators, defaults } = definition;
  const { values, onHydrated, overrides, form, setValues, onReset } = options;
  const storage = usePersistenceStorage();

  // One target for both bindings, memoized so its methods keep their identity.
  const target = useMemo<PersistedFormTarget<T>>(() => {
    if (form) {
      return form;
    }
    return {
      setFieldValue: (field, value) =>
        setValues((prev) => ({ ...prev, [field]: value })),
      reset: () => {
        onReset?.();
        setValues(() => defaults);
      },
    };
  }, [form, setValues, onReset, defaults]);

  const hydrationRef = useRef(false);

  // Create a memoized snapshot of persistable state
  const persistableSnapshot = useMemo(
    () => {
      const snapshot: Partial<T> = {};
      for (const key of persistKeys) {
        snapshot[key] = values[key];
      }
      return snapshot;
    },
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- dynamic deps array intentionally tracks each persisted value
    persistKeys.map((key) => values[key])
  );

  // Hydrate on mount (runs exactly once): the stored snapshot first, then the
  // overrides on top of it.
  useEffect(() => {
    if (hydrationRef.current) {
      return;
    }
    hydrationRef.current = true;

    const loadedValues: Partial<T> = {};
    let hydrated = false;
    const apply = (key: K, value: PersistedValue) => {
      if (!validators[key].validate(value)) return;
      target.setFieldValue(key, value);
      loadedValues[key] = value;
      hydrated = true;
    };

    try {
      const raw = storage.getItem(storageKey);
      if (raw) {
        removeSupersededStorageKeys(storageKey, storage);

        const snapshot = persistedSnapshotSchema.safeParse(JSON.parse(raw));
        if (snapshot.success) {
          for (const key of persistKeys) apply(key, snapshot.data[key]);
          hydrated = true;
        }
      }
    } catch (error) {
      debugWarn(
        `[usePersistedCalculator] Failed to load state from '${storageKey}':`,
        error
      );
    }

    if (overrides) {
      for (const key of persistKeys) {
        if (!Object.hasOwn(overrides, key)) continue;
        // SAFETY: `validate` runs a zod safeParse, which accepts any runtime
        // value; it is typed PersistedValue only because stored values are
        // JSON. An override that is not a valid JSON value for the field
        // fails the schema and is skipped like a bad stored value.
        apply(key, overrides[key] as PersistedValue);
      }
    }

    if (!hydrated) {
      return;
    }
    try {
      onHydrated?.(loadedValues);
    } catch (error) {
      debugWarn(
        `[usePersistedCalculator] Failed to load state from '${storageKey}':`,
        error
      );
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- mount-only hydration; deps intentionally limited to avoid re-hydrating
  }, [target.setFieldValue]);

  // Persist whenever the persisted values change (debounced to avoid blocking
  // the main thread during rapid slider drags)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        storage.setItem(storageKey, JSON.stringify(persistableSnapshot));
      } catch (error) {
        debugWarn(
          `[usePersistedCalculator] Failed to save state to '${storageKey}':`,
          error
        );
      }
    }, PERSIST_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [storage, storageKey, persistableSnapshot]);

  const clearPersistedData = useCallback(() => {
    try {
      storage.removeItem(storageKey);
    } catch (error) {
      debugWarn(
        `[usePersistedCalculator] Failed to clear state from '${storageKey}':`,
        error
      );
    }
  }, [storage, storageKey]);

  const targetReset = target.reset;
  const resetToDefaults = useCallback(() => {
    targetReset?.();
    clearPersistedData();
  }, [targetReset, clearPersistedData]);

  return { clearPersistedData, resetToDefaults };
}
