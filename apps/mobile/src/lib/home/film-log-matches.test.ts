import { describe, expect, it } from 'vitest';
import type { Camera, FilmRoll, Lens, Shot } from '@/schemas/film-log.schema';
import { matchFilmLog } from './film-log-matches';

const camera = (id: string, name: string, format: Camera['format'] = '35mm') =>
  ({ id, name, format, createdAt: '2026-01-01T00:00:00Z' }) satisfies Camera;

const lens = (id: string, name: string) =>
  ({ id, name, createdAt: '2026-01-01T00:00:00Z' }) satisfies Lens;

const shot = (id: string, lensId?: string): Shot => ({
  id,
  frameNumber: 1,
  lensId,
  source: 'manual',
});

function roll(id: string, extra: Partial<FilmRoll> = {}): FilmRoll {
  return {
    id,
    cameraId: 'fm2',
    process: 'bw',
    status: 'finished',
    shots: [],
    startedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...extra,
  };
}

const cameras = [
  camera('fm2', 'Nikon FM2'),
  camera('rb', 'Mamiya RB67', '120'),
];
const lenses = [lens('l50', 'Nikkor 50mm f/1.8'), lens('l90', 'Sekor 90mm')];

const empty = { rolls: [], cameras: [] };
const data = (rolls: FilmRoll[]) => ({ rolls, cameras, lenses });

describe('matchFilmLog', () => {
  it('matches nothing for an empty, blank or one-character query', () => {
    const d = data([roll('a', { filmStockName: 'HP5+' })]);
    expect(matchFilmLog('', d)).toEqual(empty);
    expect(matchFilmLog('   ', d)).toEqual(empty);
    expect(matchFilmLog('h', d)).toEqual(empty);
    expect(matchFilmLog(' h ', d)).toEqual(empty);
  });

  it('matches nothing for a query of only punctuation', () => {
    expect(matchFilmLog('+-', data([roll('a', { name: 'a+b' })]))).toEqual(
      empty
    );
  });

  it('ignores punctuation on both sides', () => {
    const d = data([
      roll('a', { filmStockName: 'Ilford HP5+' }),
      roll('b', { filmStockName: 'Kodak Tri-X 400' }),
    ]);
    expect(matchFilmLog('hp5', d).rolls.map((r) => r.rollId)).toEqual(['a']);
    expect(matchFilmLog('HP5+', d).rolls.map((r) => r.rollId)).toEqual(['a']);
    expect(matchFilmLog('trix', d).rolls.map((r) => r.rollId)).toEqual(['b']);
    expect(matchFilmLog('tri-x', d).rolls.map((r) => r.rollId)).toEqual(['b']);
    expect(matchFilmLog('fm2', d).cameras.map((c) => c.cameraId)).toEqual([
      'fm2',
    ]);
    expect(matchFilmLog('fm-2', d).cameras).toHaveLength(1);
  });

  it('requires every token, in any order and any field', () => {
    const d = data([
      roll('a', { filmStockName: 'HP5+', cameraId: 'fm2' }),
      roll('b', { filmStockName: 'HP5+', cameraId: 'rb' }),
    ]);
    expect(matchFilmLog('hp5 nikon', d).rolls.map((r) => r.rollId)).toEqual([
      'a',
    ]);
    expect(matchFilmLog('mamiya hp5', d).rolls.map((r) => r.rollId)).toEqual([
      'b',
    ]);
    expect(matchFilmLog('hp5 leica', d).rolls).toEqual([]);
    // Words in no roll field rule a roll out, which is why filler is dropped.
    expect(matchFilmLog('hp5 zebra', d).rolls).toEqual([]);
  });

  it('matches name, notes, lenses used and the rated EI', () => {
    const d = data([
      roll('named', { name: 'Iceland trip' }),
      roll('noted', { notes: 'Pushed after a cold week' }),
      roll('lensed', { shots: [shot('s1', 'l90')] }),
      roll('rated', { iso: 800 }),
    ]);
    const ids = (q: string) => matchFilmLog(q, d).rolls.map((r) => r.rollId);
    expect(ids('iceland')).toEqual(['named']);
    expect(ids('cold week')).toEqual(['noted']);
    expect(ids('sekor')).toEqual(['lensed']);
    expect(ids('800')).toEqual(['rated']);
    // A lens that no shot used does not count.
    expect(ids('nikkor')).toEqual([]);
  });

  it('still matches a roll whose camera was deleted, on its own fields', () => {
    const orphan = roll('o', { cameraId: 'gone', filmStockName: 'Portra 400' });
    const result = matchFilmLog('portra', data([orphan]));
    expect(result.rolls).toEqual([
      {
        rollId: 'o',
        title: 'Portra 400',
        subtitle: 'Finished · 0 shots',
      },
    ]);
    expect(matchFilmLog('nikon', data([orphan])).rolls).toEqual([]);
  });

  it('writes the title and subtitle', () => {
    const r = roll('a', {
      name: 'Spring',
      filmStockName: 'HP5+',
      iso: 1600,
      status: 'active',
      shots: [shot('1'), shot('2')],
    });
    expect(matchFilmLog('spring', data([r])).rolls[0]).toEqual({
      rollId: 'a',
      title: 'Spring',
      subtitle: 'HP5+ · Nikon FM2 · EI 1600 · Active · 2 shots',
    });
    const developed = roll('b', { name: 'Spring', status: 'developed' });
    expect(matchFilmLog('spring', data([developed])).rolls[0].subtitle).toBe(
      'Nikon FM2 · Developed · 0 shots'
    );
  });

  it('names the film under a named roll that matched on it', () => {
    const r = roll('a', { name: 'Spring', filmStockName: 'HP5+' });
    expect(matchFilmLog('hp5', data([r])).rolls[0]).toEqual({
      rollId: 'a',
      title: 'Spring',
      subtitle: 'HP5+ · Nikon FM2 · Finished · 0 shots',
    });
  });

  it('drops one-character words, and matches nothing when none are left', () => {
    const d = data([roll('a', { name: 'a b c', filmStockName: 'HP5+' })]);
    expect(matchFilmLog('a b', d)).toEqual(empty);
    expect(matchFilmLog('a hp5', d).rolls).toHaveLength(1);
    expect(matchFilmLog('a zz', d).rolls).toEqual([]);
  });

  it('ignores filler words, so "hp5 at 800" finds the roll', () => {
    const d = data([
      roll('a', { filmStockName: 'HP5+', iso: 800 }),
      roll('b', { filmStockName: 'HP5+', iso: 400 }),
    ]);
    expect(matchFilmLog('hp5 at 800', d).rolls.map((r) => r.rollId)).toEqual([
      'a',
    ]);
    expect(matchFilmLog('the hp5 for 800', d).rolls).toHaveLength(1);
    // The full placeholder still names a developer (`ddx`), which no roll has.
    expect(matchFilmLog('hp5 at 800 in dd-x', d).rolls).toEqual([]);
    // Only filler left: nothing matches.
    expect(matchFilmLog('at in of', d)).toEqual(empty);
  });

  it('lists the most used cameras first, then by name, before the cap', () => {
    const cams = ['Zed', 'Alpha', 'Mid', 'Busy'].map((n, i) =>
      camera(`c${i}`, `Pentax ${n}`)
    );
    const rolls = [
      roll('r1', { cameraId: 'c3' }),
      roll('r2', { cameraId: 'c3' }),
      roll('r3', { cameraId: 'c2' }),
    ];
    const result = matchFilmLog('pentax', { rolls, cameras: cams, lenses });
    expect(result.cameras.map((c) => c.title)).toEqual([
      'Pentax Busy',
      'Pentax Mid',
      'Pentax Alpha',
    ]);
  });

  it('puts active rolls first, then the most recently updated', () => {
    const d = data([
      roll('old', { name: 'x roll', updatedAt: '2026-01-01T00:00:00Z' }),
      roll('new', { name: 'x roll', updatedAt: '2026-06-01T00:00:00Z' }),
      roll('live', {
        name: 'x roll',
        status: 'active',
        updatedAt: '2026-02-01T00:00:00Z',
      }),
    ]);
    expect(matchFilmLog('roll', d).rolls.map((r) => r.rollId)).toEqual([
      'live',
      'new',
      'old',
    ]);
  });

  it('caps rolls at 6 and cameras at 3', () => {
    const rolls = Array.from({ length: 9 }, (_, i) =>
      roll(`r${i}`, { name: 'Roll' })
    );
    const many = Array.from({ length: 5 }, (_, i) =>
      camera(`c${i}`, `Pentax ${i}`)
    );
    expect(
      matchFilmLog('roll', { rolls, cameras: many, lenses }).rolls
    ).toHaveLength(6);
    expect(
      matchFilmLog('pentax', { rolls, cameras: many, lenses }).cameras
    ).toHaveLength(3);
  });

  it('matches cameras on name only, with format and roll count', () => {
    const d = data([
      roll('a', { cameraId: 'rb', filmStockName: 'Mamiya film' }),
      roll('b', { cameraId: 'rb' }),
    ]);
    expect(matchFilmLog('mamiya', d).cameras).toEqual([
      { cameraId: 'rb', title: 'Mamiya RB67', subtitle: '120 · 2 rolls' },
    ]);
    expect(matchFilmLog('nikon', d).cameras[0].subtitle).toBe(
      '35mm · No rolls'
    );
    // A camera is not found through a roll's film or notes.
    expect(matchFilmLog('film', d).cameras).toEqual([]);
  });
});
