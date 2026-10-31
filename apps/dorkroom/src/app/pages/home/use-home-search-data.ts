import {
  type HomeSearchData,
  useCombinations,
  useDevelopers,
  useFilms,
} from '@dorkroom/logic';
import { useCallback, useMemo, useState } from 'react';

export interface HomeSearchDataState {
  data: HomeSearchData;
  /** Start fetching (idempotent). */
  load: () => void;
  /**
   * What failed to load, as a sentence ("Recipes could not load."), or null.
   * Calculator answers work either way.
   */
  loadError: string | null;
}

/** "Recipes", "Films and recipes", "Films, developers and recipes". */
function listOf(parts: readonly string[]): string {
  const text =
    parts.length > 1
      ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
      : (parts[0] ?? '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The catalog the home search reads, fetched only once someone shows interest
 * in searching (`load`). The recipes alone are about 500 KB, so the first
 * paint never waits on them: until they arrive the box answers calculator
 * queries, which need no data. Data already cached (say, from /development)
 * is used at once.
 */
export function useHomeSearchData(): HomeSearchDataState {
  const [enabled, setEnabled] = useState(false);
  const films = useFilms({ enabled });
  const developers = useDevelopers({ enabled });
  const combinations = useCombinations({ enabled });
  const data = useMemo(
    () => ({
      films: films.data,
      developers: developers.data,
      combinations: combinations.data,
    }),
    [films.data, developers.data, combinations.data]
  );
  const load = useCallback(() => setEnabled(true), []);
  const failed = [
    ...(films.isError ? ['films'] : []),
    ...(developers.isError ? ['developers'] : []),
    ...(combinations.isError ? ['recipes'] : []),
  ];
  return {
    data,
    load,
    loadError: failed.length ? `${listOf(failed)} could not load.` : null,
  };
}
