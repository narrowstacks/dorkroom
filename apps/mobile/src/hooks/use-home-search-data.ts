import {
  type HomeSearchData,
  useCombinations,
  useDevelopers,
  useFilms,
} from '@dorkroom/logic';
import { useMemo } from 'react';

interface HomeSearchDataState {
  data: HomeSearchData;
  /** What failed to load, as a sentence, or null. */
  loadError: string | null;
}

/**
 * The catalog the Home search reads: the same TanStack Query hooks (and so the
 * same persisted cache) the recipe browser uses. Calculator questions need no
 * data, so the queries only run once `enabled`: someone is searching, or Home
 * has recent recipes to name.
 */
export function useHomeSearchData(enabled: boolean): HomeSearchDataState {
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
  const failed = [
    ...(films.isError ? ['films'] : []),
    ...(developers.isError ? ['developers'] : []),
    ...(combinations.isError ? ['recipes'] : []),
  ];
  return {
    data,
    loadError:
      failed.length > 0
        ? `Could not load ${failed.join(', ')}. Calculator questions still work.`
        : null,
  };
}
