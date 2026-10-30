import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocalStorageFormPersistence } from '../../hooks/use-local-storage-form-persistence';

const STORAGE_KEY = 'persistence-reset-test';
const DEFAULTS = { time: 10, label: 'base' };
type State = typeof DEFAULTS;

/** A useState-backed form, the same adapter shape the calculator hooks use. */
function useHarness() {
  const [values, setValues] = useState<State>(DEFAULTS);
  const persistence = useLocalStorageFormPersistence({
    storageKey: STORAGE_KEY,
    form: {
      setFieldValue: (key: keyof State, value: State[keyof State]) =>
        setValues((prev) => ({ ...prev, [key]: value })),
      reset: () => setValues(DEFAULTS),
    },
    formValues: values,
  });
  return { values, setValues, ...persistence };
}

describe('useLocalStorageFormPersistence resetToDefaults', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('restores the defaults and removes the stored snapshot', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ time: 42, label: 'saved' })
    );
    const { result } = renderHook(() => useHarness());
    expect(result.current.values).toEqual({ time: 42, label: 'saved' });

    act(() => result.current.resetToDefaults());

    expect(result.current.values).toEqual(DEFAULTS);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('cancels a pending write of the discarded values and persists the defaults', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useHarness());

    act(() => result.current.setValues({ time: 99, label: 'edited' }));
    act(() => result.current.resetToDefaults());
    act(() => vi.advanceTimersByTime(300));

    expect(
      JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
    ).toEqual(DEFAULTS);
  });

  it('still clears storage when the form has no reset of its own', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ time: 42 }));
    const { result } = renderHook(() =>
      useLocalStorageFormPersistence({
        storageKey: STORAGE_KEY,
        form: { setFieldValue: () => undefined },
        formValues: DEFAULTS,
        disablePersistence: true,
      })
    );

    act(() => result.current.resetToDefaults());

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
