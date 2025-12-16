import { useEffect, useMemo, useRef } from 'react';
import { debugWarn } from '../utils/debug-logger';

/**
 * Options for validating a field value during hydration
 */
export interface FieldValidator<T> {
  /**
   * Validate a value before setting it on the form.
   * Return true if the value is valid and should be applied.
   */
  validate?: (value: unknown) => boolean;
  /**
   * Transform a value during hydration before setting it on the form.
   * If not provided, the value is used as-is.
   */
  transform?: (value: unknown) => T;
}

/**
 * Configuration for useLocalStorageFormPersistence hook
 */
export interface LocalStorageFormPersistenceOptions<T extends object> {
  /**
   * The localStorage key to use for persistence
   */
  storageKey: string;
  /**
   * The form instance from TanStack Form.
   * Only requires setFieldValue method with compatible signature.
   */
  form: {
    setFieldValue: (field: keyof T, value: T[keyof T]) => void;
  };
  /**
   * Current form values to persist
   */
  formValues: T;
  /**
   * Keys to persist. If not provided, all keys from formValues are persisted.
   */
  persistKeys?: Array<keyof T>;
  /**
   * Optional validators for each field during hydration.
   * If a validator is provided and returns false, the field is skipped.
   */
  validators?: Partial<Record<keyof T, FieldValidator<unknown>>>;
  /**
   * Default validator applied to all fields if no specific validator is provided.
   * Defaults to checking the value is not undefined.
   */
  defaultValidator?: (value: unknown) => boolean;
  /**
   * Callback after hydration completes
   */
  onHydrated?: (loadedValues: Partial<T>) => void;
  /**
   * Callback after persistence completes
   */
  onPersisted?: (values: Partial<T>) => void;
  /**
   * Disable hydration (useful for testing or conditional loading)
   */
  disableHydration?: boolean;
  /**
   * Disable persistence (useful for testing)
   */
  disablePersistence?: boolean;
}

/**
 * Return type for useLocalStorageFormPersistence hook
 */
export interface LocalStorageFormPersistenceReturn {
  /**
   * Whether the form has been hydrated from localStorage
   */
  isHydrated: boolean;
  /**
   * Clear persisted data from localStorage
   */
  clearPersistedData: () => void;
}

/**
 * Hook for persisting TanStack Form state to localStorage.
 *
 * Handles both:
 * 1. Hydration: Loading saved state from localStorage on mount (runs once)
 * 2. Persistence: Saving form state to localStorage when it changes
 *
 * @example
 * ```typescript
 * const form = useForm({ defaultValues: { originalTime: 10, stops: 1 } });
 * const formValues = useStore(form.store, (state) => state.values);
 *
 * const { isHydrated, clearPersistedData } = useLocalStorageFormPersistence({
 *   storageKey: 'exposure-calculator',
 *   form,
 *   formValues,
 *   persistKeys: ['originalTime', 'stops'],
 *   validators: {
 *     originalTime: {
 *       validate: (v) => typeof v === 'number' && Number.isFinite(v),
 *     },
 *   },
 * });
 * ```
 */
export function useLocalStorageFormPersistence<T extends object>(
  options: LocalStorageFormPersistenceOptions<T>
): LocalStorageFormPersistenceReturn {
  const {
    storageKey,
    form,
    formValues,
    persistKeys,
    validators = {} as Partial<Record<keyof T, FieldValidator<unknown>>>,
    defaultValidator = (value: unknown) => value !== undefined,
    onHydrated,
    onPersisted,
    disableHydration = false,
    disablePersistence = false,
  } = options;

  const hydrationRef = useRef(false);
  const isHydratedRef = useRef(false);

  // Determine which keys to persist
  const keysToUse = useMemo(() => {
    return persistKeys ?? (Object.keys(formValues) as Array<keyof T>);
  }, [persistKeys, formValues]);

  // Create a memoized snapshot of persistable state
  const persistableSnapshot = useMemo(
    () => {
      const snapshot: Partial<T> = {};
      for (const key of keysToUse) {
        snapshot[key] = formValues[key];
      }
      return snapshot;
    },
    // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally using dynamic deps array to track form value changes
    keysToUse.map((key) => formValues[key])
  );

  // Hydrate from localStorage on mount (runs exactly once)
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentional - only run once on mount
  useEffect(() => {
    if (
      hydrationRef.current ||
      disableHydration ||
      typeof window === 'undefined'
    ) {
      return;
    }
    hydrationRef.current = true;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        isHydratedRef.current = true;
        return;
      }

      const parsed = JSON.parse(raw) as Partial<T>;
      if (!parsed || typeof parsed !== 'object') {
        isHydratedRef.current = true;
        return;
      }

      const loadedValues: Partial<T> = {};

      for (const key of keysToUse) {
        const value = parsed[key];
        const fieldValidator = validators[key];

        // Check if value passes validation
        const validateFn = fieldValidator?.validate ?? defaultValidator;
        if (!validateFn(value)) {
          continue;
        }

        // Transform value if transformer is provided
        const transformedValue = fieldValidator?.transform
          ? fieldValidator.transform(value)
          : value;

        form.setFieldValue(key, transformedValue as T[typeof key]);
        loadedValues[key] = transformedValue as T[typeof key];
      }

      isHydratedRef.current = true;
      onHydrated?.(loadedValues);
    } catch (error) {
      debugWarn(
        `[useLocalStorageFormPersistence] Failed to load state from '${storageKey}':`,
        error
      );
      isHydratedRef.current = true;
    }
  }, [form.setFieldValue]);

  // Persist form state to localStorage whenever it changes
  useEffect(() => {
    if (disablePersistence || typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(persistableSnapshot)
      );
      onPersisted?.(persistableSnapshot);
    } catch (error) {
      debugWarn(
        `[useLocalStorageFormPersistence] Failed to save state to '${storageKey}':`,
        error
      );
    }
  }, [storageKey, persistableSnapshot, disablePersistence, onPersisted]);

  const clearPersistedData = () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch (error) {
      debugWarn(
        `[useLocalStorageFormPersistence] Failed to clear state from '${storageKey}':`,
        error
      );
    }
  };

  return {
    isHydrated: isHydratedRef.current,
    clearPersistedData,
  };
}
