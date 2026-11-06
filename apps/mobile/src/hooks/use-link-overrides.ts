import type { CalculatorLink } from '@dorkroom/logic';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { linkSearchFromParams, prefillKey } from '@/lib/link-prefill';

/**
 * The values a calculator screen's route was opened with (Home answers, deep
 * links), read through that calculator's link, plus a key to put on the
 * screen's body so a new link re-mounts it and the overrides apply.
 */
export function useLinkOverrides<T extends object>(
  link: CalculatorLink<T>
): { overrides: Partial<T> | undefined; prefillId: string } {
  const params = useLocalSearchParams();
  return useMemo(() => {
    const overrides = link.read(linkSearchFromParams(params));
    const prefillId = prefillKey(JSON.stringify(overrides), params);
    return {
      overrides: prefillId === 'none' ? undefined : overrides,
      prefillId,
    };
  }, [link, params]);
}
