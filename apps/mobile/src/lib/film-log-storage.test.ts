import { beforeEach, describe, expect, it, vi } from 'vitest';

const deleted: string[] = [];
vi.mock('@/lib/film-log-photos', () => ({
  deletePhotoFile: vi.fn(async (f: string) => void deleted.push(f)),
}));

const store = new Map<string, string>();
vi.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (k: string) => store.get(k),
    set: (k: string, v: string) => void store.set(k, v),
    remove: (k: string) => void store.delete(k),
  }),
  useMMKVString: (key: string) => [store.get(key), vi.fn()],
}));

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
  setShotPhoto,
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

describe('film-log storage', () => {
  beforeEach(() => {
    store.clear();
    deleted.length = 0;
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

  it('falls back to [] on corrupt JSON', () => {
    store.set(KEYS.rolls, 'not json');
    expect(getRolls()).toEqual([]);
  });

  it('falls back to [] when the shape fails schema validation', () => {
    expect(parseRolls(JSON.stringify([{ id: 1, bogus: true }]))).toEqual([]);
    expect(parseRolls(undefined)).toEqual([]);
  });

  it('deletes the photo file when a shot with a photo is removed', () => {
    const roll = newRoll();
    const shot = addShot(roll.id, { frameNumber: 1, source: 'manual' });
    if (shot)
      setShotPhoto(roll.id, shot.id, {
        fileName: 'p1.jpg',
        width: 1,
        height: 1,
        capturedAt: 'x',
        source: 'library',
      });
    if (shot) removeShot(roll.id, shot.id);
    expect(deleted).toContain('p1.jpg');
  });

  it('deletes all shot photos when a roll is deleted', () => {
    const roll = newRoll();
    const shot = addShot(roll.id, { frameNumber: 1, source: 'manual' });
    if (shot)
      setShotPhoto(roll.id, shot.id, {
        fileName: 'p2.jpg',
        width: 1,
        height: 1,
        capturedAt: 'x',
        source: 'library',
      });
    deleteRoll(roll.id);
    expect(deleted).toContain('p2.jpg');
  });

  it('deletes the old file when a shot photo is replaced', () => {
    const roll = newRoll();
    const shot = addShot(roll.id, { frameNumber: 1, source: 'manual' });
    if (shot)
      setShotPhoto(roll.id, shot.id, {
        fileName: 'old.jpg',
        width: 1,
        height: 1,
        capturedAt: 'x',
        source: 'library',
      });
    if (shot)
      setShotPhoto(roll.id, shot.id, {
        fileName: 'new.jpg',
        width: 1,
        height: 1,
        capturedAt: 'x',
        source: 'library',
      });
    expect(deleted).toContain('old.jpg');
  });
});
