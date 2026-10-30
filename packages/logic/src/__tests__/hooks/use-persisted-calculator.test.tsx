import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  PERSIST_DEBOUNCE_MS,
  PersistenceStorageProvider,
  usePersistedCalculator,
} from '../../hooks/use-persisted-calculator';
import {
  createMemoryStorage,
  type KeyValueStorage,
} from '../../services/key-value-storage';
import { definePersistedCalculator } from '../../utils/persisted-calculator';

const KEY = 'persistedCalculatorTest_v1';

interface State {
  time: number;
  mode: 'a' | 'b';
  label: string;
  transient: string;
}

const DEFAULTS: State = { time: 10, mode: 'a', label: 'base', transient: '' };

const definition = definePersistedCalculator(
  KEY,
  {
    time: z.number().positive().max(100),
    mode: z.enum(['a', 'b']),
    label: z.string(),
  },
  DEFAULTS
);

/** A `useState`-backed calculator, the shape the logic hooks use. */
function useStateCalculator(onReset?: () => void) {
  const [values, setValues] = useState<State>(DEFAULTS);
  const persistence = usePersistedCalculator(definition, {
    values,
    setValues,
    onReset,
  });
  return { values, setValues, ...persistence };
}

const withStorage =
  (storage: KeyValueStorage) =>
  ({ children }: { children: ReactNode }) =>
    createElement(PersistenceStorageProvider, { value: storage }, children);

const render = (storage: KeyValueStorage, onReset?: () => void) =>
  renderHook(() => useStateCalculator(onReset), {
    wrapper: withStorage(storage),
  });

describe('usePersistedCalculator', () => {
  let storage: KeyValueStorage;

  beforeEach(() => {
    storage = createMemoryStorage();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('hydration', () => {
    it('applies every valid persisted field', () => {
      storage.setItem(KEY, JSON.stringify({ time: 42, mode: 'b', label: 'x' }));
      const { result } = render(storage);
      expect(result.current.values).toEqual({
        ...DEFAULTS,
        time: 42,
        mode: 'b',
        label: 'x',
      });
    });

    it('keeps the default for each field that fails its validator', () => {
      storage.setItem(
        KEY,
        JSON.stringify({ time: 500, mode: 'zzz', label: 'kept' })
      );
      const { result } = render(storage);
      expect(result.current.values).toEqual({ ...DEFAULTS, label: 'kept' });
    });

    it('keeps defaults for fields missing from a partial snapshot', () => {
      storage.setItem(KEY, JSON.stringify({ time: 7 }));
      const { result } = render(storage);
      expect(result.current.values).toEqual({ ...DEFAULTS, time: 7 });
    });

    it('ignores stored keys outside the definition', () => {
      storage.setItem(KEY, JSON.stringify({ time: 7, transient: 'tampered' }));
      const { result } = render(storage);
      expect(result.current.values).toEqual({ ...DEFAULTS, time: 7 });
    });

    it('keeps every default for malformed JSON or a non-object snapshot', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      storage.setItem(KEY, '{not json');
      expect(render(storage).result.current.values).toEqual(DEFAULTS);

      storage.setItem(KEY, JSON.stringify([1, 2, 3]));
      expect(render(storage).result.current.values).toEqual(DEFAULTS);
    });

    it('reports the applied fields to onHydrated, once', () => {
      storage.setItem(KEY, JSON.stringify({ time: 20, mode: 'nope' }));
      const onHydrated = vi.fn();
      const { rerender } = renderHook(
        () => {
          const [values, setValues] = useState<State>(DEFAULTS);
          return usePersistedCalculator(definition, {
            values,
            setValues,
            onHydrated,
          });
        },
        { wrapper: withStorage(storage) }
      );
      rerender();
      expect(onHydrated).toHaveBeenCalledTimes(1);
      expect(onHydrated).toHaveBeenCalledWith({ time: 20 });
    });

    it('drives a form target field by field', () => {
      storage.setItem(KEY, JSON.stringify({ time: 3, mode: 'b' }));
      const setFieldValue = vi.fn();
      renderHook(
        () =>
          usePersistedCalculator(definition, {
            form: { setFieldValue },
            values: DEFAULTS,
          }),
        { wrapper: withStorage(storage) }
      );
      expect(setFieldValue.mock.calls).toEqual([
        ['time', 3],
        ['mode', 'b'],
      ]);
    });

    it('purges superseded keys from the same storage', () => {
      const border = definePersistedCalculator(
        'borderCalculatorState_v2',
        { time: z.number() },
        DEFAULTS
      );
      storage.setItem('borderCalculatorState_v1', '{}');
      storage.setItem('borderCalculatorState_v2', JSON.stringify({ time: 5 }));
      renderHook(
        () => {
          const [values, setValues] = useState<State>(DEFAULTS);
          return usePersistedCalculator(border, { values, setValues });
        },
        { wrapper: withStorage(storage) }
      );
      expect(storage.getItem('borderCalculatorState_v1')).toBeNull();
    });
  });

  describe('persistence', () => {
    it('writes only the persisted keys, in definition order, after the debounce', () => {
      vi.useFakeTimers();
      const { result } = render(storage);

      act(() =>
        result.current.setValues({
          time: 12,
          mode: 'b',
          label: 'new',
          transient: 'not stored',
        })
      );
      act(() => vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS - 1));
      expect(storage.getItem(KEY)).toBeNull();

      act(() => vi.advanceTimersByTime(1));
      expect(storage.getItem(KEY)).toBe(
        JSON.stringify({ time: 12, mode: 'b', label: 'new' })
      );
    });

    it('restarts the debounce on each change and writes the last value once', () => {
      vi.useFakeTimers();
      const setItem = vi.spyOn(storage, 'setItem');
      const { result } = render(storage);

      for (const time of [1, 2, 3]) {
        act(() => result.current.setValues((prev) => ({ ...prev, time })));
        act(() => vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS - 50));
      }
      expect(setItem).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(50));
      expect(setItem).toHaveBeenCalledTimes(1);
      expect(storage.getItem(KEY)).toBe(
        JSON.stringify({ time: 3, mode: 'a', label: 'base' })
      );
    });

    it('does not rewrite when only a non-persisted field changes', () => {
      vi.useFakeTimers();
      const { result } = render(storage);
      act(() => vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS));
      const setItem = vi.spyOn(storage, 'setItem');

      act(() =>
        result.current.setValues((prev) => ({ ...prev, transient: 'typing' }))
      );
      act(() => vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS));
      expect(setItem).not.toHaveBeenCalled();
    });
  });

  describe('clear and reset', () => {
    it('clearPersistedData removes the snapshot and leaves the values', () => {
      storage.setItem(KEY, JSON.stringify({ time: 42 }));
      const { result } = render(storage);

      act(() => result.current.clearPersistedData());

      expect(storage.getItem(KEY)).toBeNull();
      expect(result.current.values.time).toBe(42);
    });

    it('resetToDefaults restores the definition defaults and drops the snapshot', () => {
      storage.setItem(KEY, JSON.stringify({ time: 42, label: 'saved' }));
      const onReset = vi.fn();
      const { result } = render(storage, onReset);

      act(() => result.current.resetToDefaults());

      expect(onReset).toHaveBeenCalledTimes(1);
      expect(result.current.values).toEqual(DEFAULTS);
      expect(storage.getItem(KEY)).toBeNull();
    });

    it('cancels a pending write of the discarded values and persists the defaults', () => {
      vi.useFakeTimers();
      const { result } = render(storage);

      act(() => result.current.setValues({ ...DEFAULTS, time: 99 }));
      act(() => result.current.resetToDefaults());
      act(() => vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS));

      expect(storage.getItem(KEY)).toBe(
        JSON.stringify({ time: 10, mode: 'a', label: 'base' })
      );
    });

    it('uses form.reset for a form target, and still clears without one', () => {
      storage.setItem(KEY, JSON.stringify({ time: 42 }));
      const reset = vi.fn();
      const { result } = renderHook(
        () =>
          usePersistedCalculator(definition, {
            form: { setFieldValue: () => undefined, reset },
            values: DEFAULTS,
          }),
        { wrapper: withStorage(storage) }
      );
      act(() => result.current.resetToDefaults());
      expect(reset).toHaveBeenCalledTimes(1);
      expect(storage.getItem(KEY)).toBeNull();

      storage.setItem(KEY, JSON.stringify({ time: 42 }));
      const bare = renderHook(
        () =>
          usePersistedCalculator(definition, {
            form: { setFieldValue: () => undefined },
            values: DEFAULTS,
          }),
        { wrapper: withStorage(storage) }
      );
      act(() => bare.result.current.resetToDefaults());
      expect(storage.getItem(KEY)).toBeNull();
    });
  });

  describe('storage failures', () => {
    const failing = (): KeyValueStorage => ({
      getItem: () => {
        throw new Error('read blocked');
      },
      setItem: () => {
        throw new Error('quota exceeded');
      },
      removeItem: () => {
        throw new Error('remove blocked');
      },
    });

    it('keeps defaults when reading throws, and logs in development', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const { result } = render(failing());
      expect(result.current.values).toEqual(DEFAULTS);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to load state from '${KEY}'`),
        expect.any(Error)
      );
    });

    it('survives a throwing write and a throwing clear', () => {
      vi.useFakeTimers();
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const { result } = render(failing());

      act(() => result.current.setValues({ ...DEFAULTS, time: 5 }));
      act(() => vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS));
      act(() => result.current.resetToDefaults());

      expect(result.current.values).toEqual(DEFAULTS);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to save state to '${KEY}'`),
        expect.any(Error)
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to clear state from '${KEY}'`),
        expect.any(Error)
      );
    });
  });

  describe('without a provider', () => {
    it('falls back to localStorage under the same key and JSON shape', () => {
      vi.useFakeTimers();
      window.localStorage.setItem(KEY, JSON.stringify({ time: 33 }));
      const { result } = renderHook(() => useStateCalculator());
      expect(result.current.values.time).toBe(33);

      act(() => result.current.setValues((prev) => ({ ...prev, mode: 'b' })));
      act(() => vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS));
      expect(window.localStorage.getItem(KEY)).toBe(
        JSON.stringify({ time: 33, mode: 'b', label: 'base' })
      );
    });

    it('uses the provided storage instead of localStorage', () => {
      window.localStorage.setItem(KEY, JSON.stringify({ time: 33 }));
      storage.setItem(KEY, JSON.stringify({ time: 44 }));
      expect(render(storage).result.current.values.time).toBe(44);
    });
  });
});
