import { getInfoAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { beforeEach, describe, expect, it } from 'vitest';
import { ensurePhotoDir, photoUri } from '@/lib/film-log-photos';
// The runner points 'expo-file-system/legacy' at this in-memory implementation;
// its reset hook is not part of the real module's API, so it is imported from
// the implementation itself (same module, so the same store).
import type {
  Camera,
  FilmRoll,
  FilmStock,
  Lens,
  Shot,
  ShotPhoto,
} from '@/schemas/film-log.schema';
import { resetFileSystem } from '@/test/expo-file-system';
import {
  addCamera,
  addCustomFilm,
  addLens,
  addRoll,
  addShot,
  deleteRoll,
  getCameras,
  getCustomFilms,
  getLenses,
  getRolls,
  KEYS,
  parseRolls,
  removeShot,
  setCameras,
  setCustomFilms,
  setLenses,
  setRolls,
  setShotPhoto,
  storage,
  updateRoll,
  updateShot,
} from './film-log-storage';

function newRoll() {
  return addRoll({
    cameraId: 'cam1',
    process: 'bw' as const,
    status: 'active' as const,
    startedAt: '2026-01-01T00:00:00.000Z',
  });
}

const writePhotoFile = (fileName: string) =>
  writeAsStringAsync(photoUri(fileName), 'jpeg-bytes');

/** A roll with one photographed shot, its file on disk, ready to be deleted. */
async function shotWithPhoto(fileName: string) {
  const roll = newRoll();
  const shot = addShot(roll.id, { frameNumber: 1, source: 'manual' });
  if (!shot) throw new Error('addShot did not return the new shot');
  await writePhotoFile(fileName);
  setShotPhoto(roll.id, shot.id, {
    fileName,
    width: 1,
    height: 1,
    capturedAt: 'x',
    source: 'library',
  });
  return { rollId: roll.id, shotId: shot.id };
}

// Every optional field populated. `Required<>` makes a field added to a schema
// (and so to its inferred type) a compile error here until the fixture sets it,
// and the round-trip below then proves the read path keeps it. zod strips keys
// a schema does not list, so this is what catches a field being written to
// MMKV and silently erased on the next read (issue #452).
const fullPhoto = {
  fileName: 'p.jpg',
  width: 4032,
  height: 3024,
  capturedAt: '2026-06-24T00:00:00.000Z',
  source: 'meter',
  grayscale: true,
} satisfies Required<ShotPhoto>;

const fullShot = {
  id: 's1',
  frameNumber: 3,
  aperture: 8,
  shutterSpeed: 0.008,
  photo: fullPhoto,
  lensId: 'lens1',
  back: 'A12 #2',
  notes: 'backlit',
  takenAt: '2026-06-24T00:00:00.000Z',
  source: 'meter',
} satisfies Required<Shot>;

const fullRoll = {
  id: 'r1',
  name: 'Trip',
  cameraId: 'cam1',
  filmStockId: 'kodak-tri-x',
  filmStockName: 'Kodak Tri-X 400',
  process: 'bw',
  iso: 800,
  pushPull: 1,
  back: 'A12 #1',
  status: 'finished',
  shots: [fullShot],
  startedAt: '2026-06-20T00:00:00.000Z',
  finishedAt: '2026-06-25T00:00:00.000Z',
  notes: 'pushed one stop',
  createdAt: '2026-06-20T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
} satisfies Required<FilmRoll>;

const fullCamera = {
  id: 'cam1',
  name: 'Hasselblad 500C/M',
  format: '120',
  backs: ['A12 #1', 'A12 #2'],
  notes: 'needs new seals',
  createdAt: '2026-01-01T00:00:00.000Z',
} satisfies Required<Camera>;

const fullLens = {
  id: 'lens1',
  name: 'Planar 80mm',
  cameraId: 'cam1',
  focalLength: 80,
  maxAperture: 2.8,
  notes: 'C T*',
  createdAt: '2026-01-01T00:00:00.000Z',
} satisfies Required<Lens>;

const fullFilm = {
  id: 'custom-1',
  brand: 'Kodak',
  name: 'Double-X',
  iso: 250,
  process: 'bw',
} satisfies Required<FilmStock>;

describe('film-log storage', () => {
  beforeEach(async () => {
    storage.clearAll();
    resetFileSystem();
    await ensurePhotoDir();
  });

  it('starts empty', () => {
    expect(getRolls()).toEqual([]);
    expect(getCameras()).toEqual([]);
    expect(getLenses()).toEqual([]);
  });

  it('adds and reads a roll with generated id + timestamps', () => {
    const roll = newRoll();
    expect(roll.id).toBeTruthy();
    expect(roll.shots).toEqual([]);
    expect(roll.createdAt).toBeTruthy();
    const stored = getRolls();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe(roll.id);
  });

  it('updates a roll and bumps updatedAt', () => {
    const roll = newRoll();
    updateRoll(roll.id, { status: 'finished', name: 'Trip' });
    const updated = getRolls()[0];
    expect(updated?.status).toBe('finished');
    expect(updated?.name).toBe('Trip');
  });

  it('deletes a roll', () => {
    const roll = newRoll();
    deleteRoll(roll.id);
    expect(getRolls()).toEqual([]);
  });

  it('adds, updates, and removes a shot nested under a roll', () => {
    const roll = newRoll();
    const shot = addShot(roll.id, {
      frameNumber: 1,
      aperture: 8,
      shutterSpeed: 0.008,
      source: 'manual',
    });
    expect(shot).toBeDefined();
    expect(getRolls()[0]?.shots).toHaveLength(1);

    if (shot) updateShot(roll.id, shot.id, { frameNumber: 2 });
    expect(getRolls()[0]?.shots[0]?.frameNumber).toBe(2);

    if (shot) removeShot(roll.id, shot.id);
    expect(getRolls()[0]?.shots).toEqual([]);
  });

  it('does not add a shot to an unknown roll', () => {
    expect(
      addShot('nope', { frameNumber: 1, source: 'manual' })
    ).toBeUndefined();
  });

  it('round-trips cameras (with backs) and lenses', () => {
    const camera = addCamera({
      name: 'Hasselblad',
      format: '120',
      backs: ['A12'],
    });
    addLens({ name: 'Planar 80mm', cameraId: camera.id });
    expect(getCameras()[0]?.backs).toEqual(['A12']);
    expect(getLenses()[0]?.cameraId).toBe(camera.id);
  });

  it('adds a custom film with a prefixed id', () => {
    const film = addCustomFilm({
      brand: 'Kodak',
      name: 'Double-X',
      iso: 250,
      process: 'bw',
    });
    expect(film.id.startsWith('custom-')).toBe(true);
    expect(getCustomFilms()).toHaveLength(1);
    expect(getCustomFilms()[0]?.iso).toBe(250);
  });

  it('round-trips every field of every collection unchanged', () => {
    setRolls([fullRoll]);
    setCameras([fullCamera]);
    setLenses([fullLens]);
    setCustomFilms([fullFilm]);
    expect(getRolls()).toEqual([fullRoll]);
    expect(getCameras()).toEqual([fullCamera]);
    expect(getLenses()).toEqual([fullLens]);
    expect(getCustomFilms()).toEqual([fullFilm]);
  });

  it('keeps a null lens cameraId (used across bodies)', () => {
    setLenses([{ ...fullLens, cameraId: null }]);
    expect(getLenses()[0]?.cameraId).toBeNull();
  });

  it('falls back to [] on corrupt JSON', () => {
    storage.set(KEYS.rolls, 'not json');
    expect(getRolls()).toEqual([]);
  });

  it('falls back to [] when the shape fails schema validation', () => {
    expect(parseRolls(JSON.stringify([{ id: 1, bogus: true }]))).toEqual([]);
    expect(parseRolls(undefined)).toEqual([]);
  });

  it('deletes the photo file when a shot with a photo is removed', async () => {
    const shot = await shotWithPhoto('p1.jpg');
    removeShot(shot.rollId, shot.shotId);
    expect((await getInfoAsync(photoUri('p1.jpg'))).exists).toBe(false);
  });

  it('deletes all shot photos when a roll is deleted', async () => {
    const shot = await shotWithPhoto('p2.jpg');
    deleteRoll(shot.rollId);
    expect((await getInfoAsync(photoUri('p2.jpg'))).exists).toBe(false);
  });

  it('deletes the old file when a shot photo is replaced', async () => {
    const shot = await shotWithPhoto('old.jpg');
    await writePhotoFile('new.jpg');
    setShotPhoto(shot.rollId, shot.shotId, {
      fileName: 'new.jpg',
      width: 1,
      height: 1,
      capturedAt: 'x',
      source: 'library',
    });
    expect((await getInfoAsync(photoUri('old.jpg'))).exists).toBe(false);
    expect((await getInfoAsync(photoUri('new.jpg'))).exists).toBe(true);
  });
});
