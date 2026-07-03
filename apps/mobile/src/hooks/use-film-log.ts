// Reactive read hooks over the MMKV film-log stores. Mirrors use-pinned-tabs.ts:
// `useMMKVString` subscribes to a key, and the pure parsers derive state from the
// raw string, so screens re-render after any add/update/delete.
import { useMemo } from 'react';
import { useMMKVString } from 'react-native-mmkv';
import {
  KEYS,
  parseCameras,
  parseCustomFilms,
  parseLenses,
  parseRolls,
  storage,
} from '@/lib/film-log-storage';
import { useFilmStocks } from '@/lib/film-stocks';
import type { Camera, FilmRoll, FilmStock, Lens } from '@/types/film-log';

export function useRolls(): FilmRoll[] {
  const [raw] = useMMKVString(KEYS.rolls, storage);
  return useMemo(() => parseRolls(raw), [raw]);
}

export function useRoll(id: string | undefined): FilmRoll | undefined {
  const rolls = useRolls();
  return useMemo(
    () => (id ? rolls.find((roll) => roll.id === id) : undefined),
    [rolls, id]
  );
}

export function useCameras(): Camera[] {
  const [raw] = useMMKVString(KEYS.cameras, storage);
  return useMemo(() => parseCameras(raw), [raw]);
}

export function useLenses(): Lens[] {
  const [raw] = useMMKVString(KEYS.lenses, storage);
  return useMemo(() => parseLenses(raw), [raw]);
}

export function useCustomFilms(): FilmStock[] {
  const [raw] = useMMKVString(KEYS.customFilms, storage);
  return useMemo(() => parseCustomFilms(raw), [raw]);
}

/** {@link useFilmCatalog} result: the merged film list plus catalog fetch state. */
export interface FilmCatalog {
  /** User's custom stocks first, then the live API catalog (sorted). */
  films: FilmStock[];
  /** The API catalog is being fetched for the first time (no cache yet). */
  isLoading: boolean;
  /** The API catalog failed to load (offline with empty cache, auth, etc.). */
  isError: boolean;
  /** No films available at all (catalog failed/empty AND no custom stocks). */
  isEmpty: boolean;
  /** Retry the catalog fetch. */
  refetch: () => void;
}

/**
 * The film picker source: the live API film database plus the user's own custom
 * stocks. Custom films always come first and remain available offline, so the
 * picker is never empty as long as the user has added their own stocks.
 */
export function useFilmCatalog(): FilmCatalog {
  const { films: catalog, isLoading, isError, refetch } = useFilmStocks();
  const custom = useCustomFilms();
  const films = useMemo(() => [...custom, ...catalog], [custom, catalog]);
  return {
    films,
    isLoading,
    isError,
    isEmpty: films.length === 0,
    refetch,
  };
}

/** Lenses usable on a camera: those bound to it plus any unassigned (global) lenses. */
export function useLensesForCamera(cameraId: string | undefined): Lens[] {
  const lenses = useLenses();
  return useMemo(
    () => lenses.filter((lens) => !lens.cameraId || lens.cameraId === cameraId),
    [lenses, cameraId]
  );
}
