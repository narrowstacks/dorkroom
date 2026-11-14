// MMKV-backed persistence for the film-log feature. Each collection is a
// JSON-stringified array under its own key, read and written through
// lib/stored-collection.ts: records that fail their schema are skipped on read
// and moved to `<key>.quarantine` before a write replaces them (issue #532).
import { createMMKV } from 'react-native-mmkv';
import {
  cleanGearName,
  knownBrand,
  knownMount,
  type PendingMount,
} from '@/lib/custom-gear';
import { deletePhotoFile } from '@/lib/film-log-photos';
import { generateId } from '@/lib/id';
import { rollStatusPatch } from '@/lib/roll-lifecycle';
import { parseCollection, writeCollection } from '@/lib/stored-collection';
import {
  cameraSchema,
  customBrandSchema,
  customMountSchema,
  filmRollSchema,
  filmStockSchema,
  lensSchema,
} from '@/schemas/film-log.schema';
import type {
  Camera,
  CustomBrand,
  CustomMount,
  FilmRoll,
  FilmStock,
  Lens,
  RollDevelopment,
  Shot,
  ShotPhoto,
} from '@/schemas/film-log.schema';

export const storage = createMMKV({ id: 'dorkroom-film-log' });

export const KEYS = {
  rolls: 'rolls',
  cameras: 'cameras',
  lenses: 'lenses',
  customFilms: 'customFilms',
  customBrands: 'customBrands',
  customMounts: 'customMounts',
} as const;

function nowIso(): string {
  return new Date().toISOString();
}

// Pure parsers — exported so the reactive hooks can derive state directly from
// the MMKV-subscribed raw string (keeps `raw` a real dependency, not just a
// re-render trigger).
export const parseRolls = (raw: string | undefined): FilmRoll[] =>
  parseCollection(raw, filmRollSchema);
export const parseCameras = (raw: string | undefined): Camera[] =>
  parseCollection(raw, cameraSchema);
export const parseLenses = (raw: string | undefined): Lens[] =>
  parseCollection(raw, lensSchema);
export const parseCustomFilms = (raw: string | undefined): FilmStock[] =>
  parseCollection(raw, filmStockSchema);
export const parseCustomBrands = (raw: string | undefined): CustomBrand[] =>
  parseCollection(raw, customBrandSchema);
export const parseCustomMounts = (raw: string | undefined): CustomMount[] =>
  parseCollection(raw, customMountSchema);

// --- Rolls -----------------------------------------------------------------

export function getRolls(): FilmRoll[] {
  return parseRolls(storage.getString(KEYS.rolls));
}

export function setRolls(rolls: FilmRoll[]): void {
  writeCollection(storage, KEYS.rolls, filmRollSchema, rolls);
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

// --- Roll lifecycle --------------------------------------------------------
// In camera (`active`) -> Shot (`finished`) -> Developed (`developed`). Each
// returns whether it changed anything, so a stale tap on a roll that moved on
// (or was deleted) is a no-op. Going back (to the camera, or to Shot) is the
// roll form's status control, through the same `rollStatusPatch` rule.

/** In camera to Shot: the roll leaves the Meter, `finishedAt` is set if unset. */
export function markRollShot(id: string): boolean {
  const roll = getRolls().find((r) => r.id === id);
  if (!roll || roll.status !== 'active') return false;
  updateRoll(id, rollStatusPatch(roll, 'finished', nowIso()));
  return true;
}

/** "Mark as developed" by hand: any roll not yet developed (in the camera
 * too, as the form allows). Keeps a development record the roll already has
 * (set back to Shot and marked again), else records only the date. */
export function markRollDevelopedByHand(id: string): boolean {
  const roll = getRolls().find((r) => r.id === id);
  if (!roll || roll.status === 'developed') return false;
  updateRoll(id, rollStatusPatch(roll, 'developed', nowIso()));
  return true;
}

/** "Save to roll" from the Process Timer: any roll not yet developed (in the
 * camera too, as the form allows) becomes developed with this run's record.
 * The only path that replaces a record the roll already has. */
export function markRollDeveloped(
  id: string,
  development: RollDevelopment
): boolean {
  const roll = getRolls().find((r) => r.id === id);
  if (!roll || roll.status === 'developed') return false;
  updateRoll(id, {
    status: 'developed',
    finishedAt: roll.finishedAt ?? development.developedAt,
    development,
  });
  return true;
}

export function deleteRoll(id: string): void {
  const target = getRolls().find((r) => r.id === id);
  target?.shots.forEach((s) => {
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
  writeCollection(storage, KEYS.cameras, cameraSchema, cameras);
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
  writeCollection(storage, KEYS.lenses, lensSchema, lenses);
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
  writeCollection(storage, KEYS.customFilms, filmStockSchema, films);
}

export function addCustomFilm(film: Omit<FilmStock, 'id'>): FilmStock {
  const created: FilmStock = { ...film, id: `custom-${generateId()}` };
  setCustomFilms([...getCustomFilms(), created]);
  return created;
}

export function deleteCustomFilm(id: string): void {
  setCustomFilms(getCustomFilms().filter((film) => film.id !== id));
}

// --- Custom brands and mounts (#733) ---------------------------------------
// Brands and lens mounts the user added because the built-in lists
// (`gear-catalog.ts`) lack them. Kept like custom films: their own key, read
// per record, never deleted in this version (nothing offers it, since a camera
// or lens may use one). Adding a name that is already there, built-in or
// custom (ignoring case and accents), returns the existing entry.

export function getCustomBrands(): CustomBrand[] {
  return parseCustomBrands(storage.getString(KEYS.customBrands));
}

export function setCustomBrands(brands: CustomBrand[]): void {
  writeCollection(storage, KEYS.customBrands, customBrandSchema, brands);
}

export function getCustomMounts(): CustomMount[] {
  return parseCustomMounts(storage.getString(KEYS.customMounts));
}

export function setCustomMounts(mounts: CustomMount[]): void {
  writeCollection(storage, KEYS.customMounts, customMountSchema, mounts);
}

/** Stores a brand the user typed (when the camera or lens form is saved) and
 * returns the name to store on the item: the built-in or existing custom
 * spelling when one matches, else the cleaned name. Empty input stores
 * nothing and returns undefined. */
export function addCustomBrand(typed: string): string | undefined {
  const name = cleanGearName(typed);
  if (!name) return undefined;
  const brands = getCustomBrands();
  const known = knownBrand(name, brands);
  if (known) return known;
  setCustomBrands([
    ...brands,
    { id: `custom-brand-${generateId()}`, name, createdAt: nowIso() },
  ]);
  return name;
}

/** Stores a mount typed in a form (when the form is saved) and returns the id
 * to store in `mountId`: an existing built-in or custom mount's id when the
 * name matches one (case, accents and spacing ignored), else the pending id. */
export function addCustomMount(pending: PendingMount): string | undefined {
  const name = cleanGearName(pending.name);
  if (!name) return undefined;
  const mounts = getCustomMounts();
  const known = knownMount(name, mounts);
  if (known) return known;
  setCustomMounts([...mounts, { id: pending.id, name, createdAt: nowIso() }]);
  return pending.id;
}
