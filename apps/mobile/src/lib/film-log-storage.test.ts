import { getInfoAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ensurePhotoDir, photoUri } from '@/lib/film-log-photos';
// The runner points 'expo-file-system/legacy' at this in-memory implementation;
// its reset hook is not part of the real module's API, so it is imported from
// the implementation itself (same module, so the same store).
import type {
  Camera,
  FilmRoll,
  FilmStock,
  Lens,
  RollDevelopment,
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
  markRollDeveloped,
  markRollDevelopedByHand,
  markRollShot,
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
import { rollFormStatusPatch } from './roll-lifecycle';
import { getQuarantined } from './stored-collection';

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

// Every optional field populated. The primary guard against fields being
// erased on read (issue #452) is that the types are `z.infer` of the schemas,
// so a field exists in both or neither; `Required<>` then makes a new schema
// field a compile error here until the fixture sets it. The round-trip
// assertion below catches a future transform or pick on the read/write path
// that drops a field.
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
  place: 'Harbor',
  takenAt: '2026-06-24T00:00:00.000Z',
  source: 'meter',
} satisfies Required<Shot>;

const fullDevelopment = {
  developedAt: '2026-06-26T18:00:00.000Z',
  recipeId: 'c-uuid-1',
  recipeName: 'Kodak Tri-X 400 in Kodak D-76',
  developer: 'Kodak D-76',
  dilution: '1+1',
  temperatureF: 68,
  timeSeconds: 585,
  shootingIso: 800,
  notes: 'fresh stock',
} satisfies Required<RollDevelopment>;

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
  development: fullDevelopment,
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

  it('patches a roll', () => {
    const roll = newRoll();
    updateRoll(roll.id, { status: 'finished', name: 'Trip' });
    const updated = getRolls()[0];
    expect(updated?.status).toBe('finished');
    expect(updated?.name).toBe('Trip');
  });

  describe('updatedAt', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('is bumped by updateRoll while createdAt stays put', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const roll = newRoll();
      vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
      updateRoll(roll.id, { name: 'Trip' });
      const updated = getRolls()[0];
      expect(updated?.updatedAt).toBe('2026-01-02T00:00:00.000Z');
      expect(updated?.createdAt).toBe(roll.createdAt);
    });
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

  describe('invalid records (issue #532)', () => {
    // The issue's repro: a status value the schema does not know.
    const badRoll = { ...fullRoll, id: 'bad', status: 'lost-in-the-mail' };
    const goodRoll = { ...fullRoll, id: 'good' };

    beforeEach(() => {
      storage.set(KEYS.rolls, JSON.stringify([goodRoll, badRoll]));
    });

    it('loads the valid rolls when one is invalid', () => {
      expect(getRolls()).toEqual([goodRoll]);
    });

    it('keeps every valid roll and quarantines the bad one on the next write', () => {
      const created = newRoll();
      expect(getRolls().map((r) => r.id)).toEqual([created.id, 'good']);
      expect(getQuarantined(storage, KEYS.rolls)).toEqual([
        JSON.stringify(badRoll),
      ]);
    });

    it('leaves the quarantine intact and de-duplicated across later writes', () => {
      newRoll();
      newRoll();
      updateRoll('good', { name: 'Renamed' });
      expect(getQuarantined(storage, KEYS.rolls)).toEqual([
        JSON.stringify(badRoll),
      ]);
      expect(getRolls()).toHaveLength(3);
    });

    it('applies to cameras, lenses and custom films too', () => {
      const badCamera = { ...fullCamera, id: 'bad', format: 'glass-plate' };
      const badLens = { ...fullLens, id: 'bad', focalLength: 'wide' };
      const badFilm = { ...fullFilm, id: 'bad', process: 'tintype' };
      storage.set(KEYS.cameras, JSON.stringify([fullCamera, badCamera]));
      storage.set(KEYS.lenses, JSON.stringify([fullLens, badLens]));
      storage.set(KEYS.customFilms, JSON.stringify([fullFilm, badFilm]));
      addCamera({ name: 'Leica M6', format: '35mm' });
      addLens({ name: 'Summicron 50mm', cameraId: null });
      addCustomFilm({ brand: 'Ilford', name: 'HP5', iso: 400, process: 'bw' });
      expect(getCameras()).toHaveLength(2);
      expect(getLenses()).toHaveLength(2);
      expect(getCustomFilms()).toHaveLength(2);
      expect(getQuarantined(storage, KEYS.cameras)).toEqual([
        JSON.stringify(badCamera),
      ]);
      expect(getQuarantined(storage, KEYS.lenses)).toEqual([
        JSON.stringify(badLens),
      ]);
      expect(getQuarantined(storage, KEYS.customFilms)).toEqual([
        JSON.stringify(badFilm),
      ]);
    });
  });

  it('preserves unparseable storage exactly before a write replaces it', () => {
    const corrupt = '[{"id":"r1", truncated';
    storage.set(KEYS.rolls, corrupt);
    const created = newRoll();
    expect(getRolls().map((r) => r.id)).toEqual([created.id]);
    expect(getQuarantined(storage, KEYS.rolls)).toEqual([corrupt]);
  });

  it('keeps a damaged quarantine value as an entry rather than replacing it', () => {
    storage.set(`${KEYS.rolls}.quarantine`, 'garbled');
    storage.set(KEYS.rolls, 'not json');
    newRoll();
    expect(getQuarantined(storage, KEYS.rolls)).toEqual([
      'garbled',
      'not json',
    ]);
  });

  it('writes no quarantine on a fresh install', () => {
    newRoll();
    expect(getRolls()).toHaveLength(1);
    expect(storage.getString(`${KEYS.rolls}.quarantine`)).toBeUndefined();
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

describe('roll development record (hydration)', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  /** A roll as an older build stored it: no `development` key at all. */
  const { development: _omit, ...oldRoll } = { ...fullRoll, id: 'old' };

  const stored = (rolls: unknown[]) =>
    storage.set(KEYS.rolls, JSON.stringify(rolls));

  it('reads a roll stored before the record existed unchanged', () => {
    stored([oldRoll]);
    const [roll] = getRolls();
    expect(roll).toEqual(oldRoll);
    expect(roll?.development).toBeUndefined();
  });

  it('round-trips a full and a partial record', () => {
    const partial = {
      ...fullRoll,
      id: 'partial',
      development: { developedAt: '2026-07-01T00:00:00.000Z' },
    };
    setRolls([fullRoll, partial]);
    expect(getRolls()).toEqual([fullRoll, partial]);
  });

  it('drops only the bad value of a malformed field, keeping the rest', () => {
    stored([
      {
        ...fullRoll,
        development: { ...fullDevelopment, timeSeconds: 'nine', dilution: 4 },
      },
    ]);
    const { timeSeconds: _t, dilution: _d, ...rest } = fullDevelopment;
    expect(getRolls()[0]?.development).toEqual(rest);
    expect(getRolls()[0]?.status).toBe('finished');
  });

  it('keeps a key a newer build added through a read, an unrelated write and a read', () => {
    stored([{ ...fullRoll, development: { ...fullDevelopment, rating: 4 } }]);
    updateRoll('r1', { name: 'Renamed' });
    const [roll] = getRolls();
    expect(roll?.name).toBe('Renamed');
    expect(roll?.development).toEqual({ ...fullDevelopment, rating: 4 });
    // It is the parsed value that is written back, so the key is in storage.
    expect(storage.getString(KEYS.rolls)).toContain('"rating":4');
  });

  it('reads a record without a valid developedAt as no record, keeping the roll', () => {
    const { developedAt: _a, ...undated } = fullDevelopment;
    stored([
      { ...fullRoll, id: 'a', development: 'yesterday' },
      {
        ...fullRoll,
        id: 'b',
        development: { ...fullDevelopment, developedAt: 42 },
      },
      { ...fullRoll, id: 'c', development: undated },
      { ...fullRoll, id: 'd', development: null },
      fullRoll,
    ]);
    const rolls = getRolls();
    expect(rolls.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd', 'r1']);
    for (const roll of rolls.slice(0, 4)) {
      expect(roll.development).toBeUndefined();
      expect(roll.shots).toEqual(fullRoll.shots);
    }
    expect(rolls[4]).toEqual(fullRoll);
    newRoll();
    // Nothing is quarantined: every roll decoded.
    expect(getQuarantined(storage, KEYS.rolls)).toEqual([]);
  });

  it('documents the intended loss: an undated record is gone after the next write', () => {
    stored([
      { ...fullRoll, development: { ...fullDevelopment, developedAt: 42 } },
    ]);
    updateRoll('r1', { name: 'Renamed' });
    // Neither the roll list nor the quarantine keeps it: the roll decoded,
    // so only the record (which had no usable date) is lost.
    expect(storage.getString(KEYS.rolls)).not.toContain('Kodak D-76');
    expect(getQuarantined(storage, KEYS.rolls)).toEqual([]);
  });

  it('still skips a roll whose other fields are invalid (unchanged behaviour)', () => {
    const bad = { ...fullRoll, id: 'bad', status: 'printing' };
    stored([bad, fullRoll]);
    expect(getRolls()).toEqual([fullRoll]);
  });
});

describe('roll lifecycle', () => {
  beforeEach(() => {
    storage.clearAll();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T12:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks an active roll shot and sets finishedAt', () => {
    const roll = newRoll();
    expect(markRollShot(roll.id)).toBe(true);
    const [shot] = getRolls();
    expect(shot?.status).toBe('finished');
    expect(shot?.finishedAt).toBe('2026-08-01T12:00:00.000Z');
  });

  it('keeps an existing finishedAt and ignores a roll that is not in the camera', () => {
    const roll = newRoll();
    updateRoll(roll.id, { finishedAt: '2026-07-01T00:00:00.000Z' });
    markRollShot(roll.id);
    expect(getRolls()[0]?.finishedAt).toBe('2026-07-01T00:00:00.000Z');
    expect(markRollShot(roll.id)).toBe(false);
    expect(markRollShot('missing')).toBe(false);
  });

  it('saves a run to a roll with its record', () => {
    const roll = newRoll();
    markRollShot(roll.id);
    expect(markRollDeveloped(roll.id, fullDevelopment)).toBe(true);
    const [developed] = getRolls();
    expect(developed?.status).toBe('developed');
    expect(developed?.development).toEqual(fullDevelopment);
    expect(developed?.finishedAt).toBe('2026-08-01T12:00:00.000Z');
  });

  it('does not develop a roll twice or one that is gone', () => {
    const roll = newRoll();
    markRollDeveloped(roll.id, { developedAt: 'first' });
    expect(markRollDeveloped(roll.id, { developedAt: 'second' })).toBe(false);
    expect(markRollDevelopedByHand(roll.id)).toBe(false);
    expect(getRolls()[0]?.development?.developedAt).toBe('first');
    expect(markRollDeveloped('missing', { developedAt: 'x' })).toBe(false);
    expect(markRollDevelopedByHand('missing')).toBe(false);
  });

  it('marks a roll developed by hand with only the date', () => {
    const roll = newRoll();
    markRollShot(roll.id);
    expect(markRollDevelopedByHand(roll.id)).toBe(true);
    expect(getRolls()[0]?.development).toEqual({
      developedAt: '2026-08-01T12:00:00.000Z',
    });
  });

  it('keeps a timer record when the form sets the roll back to Shot and it is marked developed by hand', () => {
    const roll = newRoll();
    markRollDeveloped(roll.id, fullDevelopment);
    // The roll form, opened on a developed roll, saved with "Shot".
    const opened = getRolls()[0];
    updateRoll(
      roll.id,
      rollFormStatusPatch(opened, 'developed', 'finished', 'later')
    );
    expect(getRolls()[0]?.status).toBe('finished');
    markRollDevelopedByHand(roll.id);
    const [developed] = getRolls();
    expect(developed?.status).toBe('developed');
    expect(developed?.development).toEqual(fullDevelopment);
  });

  it('lets Save to roll replace a kept record', () => {
    const roll = newRoll();
    markRollDeveloped(roll.id, fullDevelopment);
    updateRoll(
      roll.id,
      rollFormStatusPatch(getRolls()[0], 'developed', 'finished', 'later')
    );
    const newer = { developedAt: '2026-08-02T00:00:00.000Z', dilution: '1+3' };
    expect(markRollDeveloped(roll.id, newer)).toBe(true);
    expect(getRolls()[0]?.development).toEqual(newer);
  });

  it('does not let an open form undo Save to roll from the timer', () => {
    const roll = newRoll();
    markRollShot(roll.id);
    // The form opens on the shot roll; meanwhile the timer saves to it.
    const openedStatus = getRolls()[0]?.status;
    markRollDeveloped(roll.id, fullDevelopment);
    const current = getRolls()[0];
    updateRoll(roll.id, {
      name: 'Renamed',
      ...rollFormStatusPatch(current, openedStatus, 'finished', 'later'),
    });
    const [saved] = getRolls();
    expect(saved?.name).toBe('Renamed');
    expect(saved?.status).toBe('developed');
    expect(saved?.development).toEqual(fullDevelopment);
  });
});
