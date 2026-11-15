// Reactive read hooks over the MMKV film-log stores. `useMMKVString` subscribes
// to a key, and the pure parsers derive state from the raw string, so screens
// re-render after any add/update/delete.
import { useMemo } from 'react';
import { useMMKVString } from 'react-native-mmkv';
import { type CameraLenses, lensesForCamera } from '@/lib/camera-lenses';
import {
  KEYS,
  parseCameras,
  parseCustomBrands,
  parseCustomFilms,
  parseCustomMounts,
  parseLenses,
  parseRolls,
  storage,
} from '@/lib/film-log-storage';
import { useFilmStocks } from '@/lib/film-stocks';
import type {
  Camera,
  CustomBrand,
  CustomMount,
  FilmRoll,
  FilmStock,
  Lens,
} from '@/schemas/film-log.schema';

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

/** The brands the user added (#733). */
export function useCustomBrands(): CustomBrand[] {
  const [raw] = useMMKVString(KEYS.customBrands, storage);
  return useMemo(() => parseCustomBrands(raw), [raw]);
}

/** The lens mounts the user added (#733). */
export function useCustomMounts(): CustomMount[] {
  const [raw] = useMMKVString(KEYS.customMounts, storage);
  return useMemo(() => parseCustomMounts(raw), [raw]);
}

/** The lenses a frame on this camera can be shot with: `lensesForCamera`
 * (its fixed lens, or the lenses its mount, a pin or no camera at all give it). */
export function useCameraLenses(cameraId: string | undefined): CameraLenses {
  const cameras = useCameras();
  const lenses = useLenses();
  return useMemo(
    () => lensesForCamera(cameraId, cameras, lenses),
    [cameraId, cameras, lenses]
  );
}
