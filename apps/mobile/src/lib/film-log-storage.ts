// MMKV-backed persistence for the film-log feature. Mirrors lib/tab-bar-settings.ts:
// each collection is a JSON-stringified array under its own key, read back with a
// schema safeParse so corrupt/legacy data falls back to [] instead of crashing.
import { createMMKV } from 'react-native-mmkv';
import { deletePhotoFile } from '@/lib/film-log-photos';
import {
  camerasSchema,
  customFilmsSchema,
  lensesSchema,
  rollsSchema,
} from '@/schemas/film-log.schema';
import type {
  Camera,
  FilmRoll,
  FilmStock,
  Lens,
  Shot,
  ShotPhoto,
} from '@/types/film-log';

export const storage = createMMKV({ id: 'dorkroom-film-log' });

export const KEYS = {
  rolls: 'rolls',
  cameras: 'cameras',
  lenses: 'lenses',
  customFilms: 'customFilms',
} as const;

/** Collision-resistant id from a timestamp + randomness. Runtime-only use. */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

type ArrayParse<T> = (
  value: unknown
) => { success: true; data: T[] } | { success: false };

/** Pure: parse a stored JSON string through a schema, falling back to []. */
function parseArray<T>(raw: string | undefined, parse: ArrayParse<T>): T[] {
  if (!raw) return [];
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }
  const result = parse(json);
  return result.success ? result.data : [];
}

// Pure parsers — exported so the reactive hooks can derive state directly from
// the MMKV-subscribed raw string (keeps `raw` a real dependency, not just a
// re-render trigger).
export const parseRolls = (raw: string | undefined): FilmRoll[] =>
  parseArray(raw, (v) => rollsSchema.safeParse(v));
export const parseCameras = (raw: string | undefined): Camera[] =>
  parseArray(raw, (v) => camerasSchema.safeParse(v));
export const parseLenses = (raw: string | undefined): Lens[] =>
  parseArray(raw, (v) => lensesSchema.safeParse(v));
export const parseCustomFilms = (raw: string | undefined): FilmStock[] =>
  parseArray(raw, (v) => customFilmsSchema.safeParse(v));

// --- Rolls -----------------------------------------------------------------

export function getRolls(): FilmRoll[] {
  return parseRolls(storage.getString(KEYS.rolls));
}

export function setRolls(rolls: FilmRoll[]): void {
  storage.set(KEYS.rolls, JSON.stringify(rolls));
}

export function addRoll(
  roll: Omit<FilmRoll, 'id' | 'shots' | 'createdAt' | 'updatedAt'>
): FilmRoll {
  const created: FilmRoll = {
    ...roll,
    id: generateId(),
    shots: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  setRolls([created, ...getRolls()]);
  return created;
}

export function updateRoll(
  id: string,
  patch: Partial<Omit<FilmRoll, 'id' | 'shots' | 'createdAt'>>
): void {
  setRolls(
    getRolls().map((roll) =>
      roll.id === id ? { ...roll, ...patch, updatedAt: nowIso() } : roll
    )
  );
}

export function deleteRoll(id: string): void {
  const roll = getRolls().find((r) => r.id === id);
  roll?.shots.forEach((s) => {
    if (s.photo) void deletePhotoFile(s.photo.fileName);
  });
  setRolls(getRolls().filter((roll) => roll.id !== id));
}

// --- Shots (nested under a roll) -------------------------------------------

export function addShot(
  rollId: string,
  shot: Omit<Shot, 'id'>
): Shot | undefined {
  const created: Shot = { ...shot, id: generateId() };
  let added = false;
  setRolls(
    getRolls().map((roll) => {
      if (roll.id !== rollId) return roll;
      added = true;
      return { ...roll, shots: [...roll.shots, created], updatedAt: nowIso() };
    })
  );
  return added ? created : undefined;
}

export function updateShot(
  rollId: string,
  shotId: string,
  patch: Partial<Omit<Shot, 'id'>>
): void {
  setRolls(
    getRolls().map((roll) =>
      roll.id === rollId
        ? {
            ...roll,
            shots: roll.shots.map((shot) =>
              shot.id === shotId ? { ...shot, ...patch } : shot
            ),
            updatedAt: nowIso(),
          }
        : roll
    )
  );
}

export function removeShot(rollId: string, shotId: string): void {
  const photo = getRolls()
    .find((r) => r.id === rollId)
    ?.shots.find((s) => s.id === shotId)?.photo;
  if (photo) void deletePhotoFile(photo.fileName);
  setRolls(
    getRolls().map((roll) =>
      roll.id === rollId
        ? {
            ...roll,
            shots: roll.shots.filter((shot) => shot.id !== shotId),
            updatedAt: nowIso(),
          }
        : roll
    )
  );
}

export function setShotPhoto(
  rollId: string,
  shotId: string,
  photo: ShotPhoto
): void {
  const prev = getRolls()
    .find((r) => r.id === rollId)
    ?.shots.find((s) => s.id === shotId)?.photo;
  if (prev && prev.fileName !== photo.fileName) {
    void deletePhotoFile(prev.fileName);
  }
  updateShot(rollId, shotId, { photo });
}

// --- Cameras ---------------------------------------------------------------

export function getCameras(): Camera[] {
  return parseCameras(storage.getString(KEYS.cameras));
}

export function setCameras(cameras: Camera[]): void {
  storage.set(KEYS.cameras, JSON.stringify(cameras));
}

export function addCamera(camera: Omit<Camera, 'id' | 'createdAt'>): Camera {
  const created: Camera = { ...camera, id: generateId(), createdAt: nowIso() };
  setCameras([...getCameras(), created]);
  return created;
}

export function updateCamera(
  id: string,
  patch: Partial<Omit<Camera, 'id' | 'createdAt'>>
): void {
  setCameras(
    getCameras().map((camera) =>
      camera.id === id ? { ...camera, ...patch } : camera
    )
  );
}

export function deleteCamera(id: string): void {
  setCameras(getCameras().filter((camera) => camera.id !== id));
}

// --- Lenses ----------------------------------------------------------------

export function getLenses(): Lens[] {
  return parseLenses(storage.getString(KEYS.lenses));
}

export function setLenses(lenses: Lens[]): void {
  storage.set(KEYS.lenses, JSON.stringify(lenses));
}

export function addLens(lens: Omit<Lens, 'id' | 'createdAt'>): Lens {
  const created: Lens = { ...lens, id: generateId(), createdAt: nowIso() };
  setLenses([...getLenses(), created]);
  return created;
}

export function updateLens(
  id: string,
  patch: Partial<Omit<Lens, 'id' | 'createdAt'>>
): void {
  setLenses(
    getLenses().map((lens) => (lens.id === id ? { ...lens, ...patch } : lens))
  );
}

export function deleteLens(id: string): void {
  setLenses(getLenses().filter((lens) => lens.id !== id));
}

// --- Custom films ----------------------------------------------------------
// User-added film stocks, kept in their own list so they survive the eventual
// swap from the stubbed catalog to the real film database (which will be merged
// with these in useFilmCatalog). Ids are prefixed to avoid colliding with DB ids.

export function getCustomFilms(): FilmStock[] {
  return parseCustomFilms(storage.getString(KEYS.customFilms));
}

export function setCustomFilms(films: FilmStock[]): void {
  storage.set(KEYS.customFilms, JSON.stringify(films));
}

export function addCustomFilm(film: Omit<FilmStock, 'id'>): FilmStock {
  const created: FilmStock = { ...film, id: `custom-${generateId()}` };
  setCustomFilms([...getCustomFilms(), created]);
  return created;
}

export function deleteCustomFilm(id: string): void {
  setCustomFilms(getCustomFilms().filter((film) => film.id !== id));
}
