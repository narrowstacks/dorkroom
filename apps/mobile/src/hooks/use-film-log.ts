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
import { useFilmStocks } from '@/lib/film-stocks-stub';
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

/**
 * The film picker source: the catalog (stubbed for now, the real film database
 * later) plus the user's own custom stocks. When the DB lands, only the catalog
 * source inside here changes — custom films keep merging on top.
 */
export function useFilmCatalog(): FilmStock[] {
  const catalog = useFilmStocks();
  const custom = useCustomFilms();
  return useMemo(() => [...custom, ...catalog], [custom, catalog]);
}

/** Lenses usable on a camera: those bound to it plus any unassigned (global) lenses. */
export function useLensesForCamera(cameraId: string | undefined): Lens[] {
  const lenses = useLenses();
  return useMemo(
    () => lenses.filter((lens) => !lens.cameraId || lens.cameraId === cameraId),
    [lenses, cameraId]
  );
}
