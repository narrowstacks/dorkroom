import { useCallback, useState } from 'react';

/**
 * Single-object form state with a typed field setter. Keeps related fields in one
 * `useState` (instead of many) so a form re-renders once per edit.
 */
export function useFormState<T extends object>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const set = useCallback(
    <K extends keyof T>(key: K, value: T[K]) =>
      setState((prev) => ({ ...prev, [key]: value })),
    []
  );
  return [state, set] as const;
}
