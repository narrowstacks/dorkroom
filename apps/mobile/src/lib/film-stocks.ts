// The film catalog, backed by the live Dorkroom API via `@dorkroom/logic`'s
// `useFilms()`. Replaces the former hardcoded stub: the picker now sees the full
// film database, and the same mapping upgrades the Film Log catalog.
//
// `FilmStock` is intentionally a subset of the API `Film` (id=slug, brand, name,
// iso=isoSpeed, process=colorType). `colorType` is already the same
// 'bw'|'color'|'slide' union as `FilmProcess`, so the mapping is direct.
import type { Film } from '@dorkroom/api';
import { useFilms } from '@dorkroom/logic';
import { useMemo } from 'react';
import type { FilmProcess, FilmStock } from '@/types/film-log';

const PROCESSES: readonly FilmProcess[] = ['bw', 'color', 'slide'];

function toProcess(colorType: string): FilmProcess {
  return (PROCESSES as readonly string[]).includes(colorType)
    ? (colorType as FilmProcess)
    : 'bw';
}

/** Map an API `Film` to the lighter `FilmStock` shape the film log uses. */
export function mapFilmToStock(film: Film): FilmStock {
  return {
    id: film.slug,
    brand: film.brand,
    name: film.name,
    iso: film.isoSpeed,
    process: toProcess(film.colorType),
  };
}

/** Result of {@link useFilmStocks}: the catalog plus its async fetch state. */
export interface FilmStocksResult {
  films: FilmStock[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * The live film catalog as `FilmStock[]`, sorted by brand then name, with
 * loading/error state for the UI. Cached + persisted by TanStack Query, so it
 * resolves instantly (and offline) after the first successful fetch.
 */
export function useFilmStocks(): FilmStocksResult {
  const { data, isLoading, isError, refetch } = useFilms();

  const films = useMemo(() => {
    if (!data) {
      return [];
    }
    return data
      .map(mapFilmToStock)
      .sort(
        (a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name)
      );
  }, [data]);

  return {
    films,
    isLoading,
    isError,
    refetch: () => void refetch(),
  };
}
