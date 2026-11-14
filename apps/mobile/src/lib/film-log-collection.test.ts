import { describe, expect, it } from 'vitest';
import type { Camera, FilmRoll } from '@/schemas/film-log.schema';
import {
  filmLogStats,
  filterRolls,
  ROLL_FILTERS,
  rollCounts,
  rollFilterFromParam,
  sortRolls,
} from './film-log-collection';

const NOW = new Date(2026, 10, 13, 12);

function roll(id: string, patch: Partial<FilmRoll> = {}): FilmRoll {
  return {
    id,
    cameraId: 'cam1',
    process: 'bw',
    status: 'active',
    shots: [],
    startedAt: new Date(2026, 5, 1).toISOString(),
    createdAt: 'x',
    updatedAt: 'x',
    ...patch,
  };
}

const shots = (count: number): FilmRoll['shots'] =>
  Array.from({ length: count }, (_, i) => ({
    id: `s${i}`,
    frameNumber: i + 1,
    source: 'manual' as const,
  }));

const cameras: Camera[] = [
  { id: 'cam1', name: 'Nikon FM2', format: '35mm', createdAt: 'x' },
  { id: 'cam2', name: 'Hasselblad', format: '120', createdAt: 'x' },
];

describe('filters', () => {
  const rolls = [
    roll('a', { status: 'active' }),
    roll('b', { status: 'finished', startedAt: '2025-12-31T10:00:00' }),
    roll('c', { status: 'developed' }),
    roll('d', { status: 'finished', startedAt: 'not a date' }),
  ];

  it('lists the four filters in order', () => {
    expect(ROLL_FILTERS.map((f) => f.label)).toEqual([
      'All',
      'In camera',
      'To develop',
      'This year',
    ]);
  });

  it('filters by status and year', () => {
    const ids = (f: Parameters<typeof filterRolls>[1]) =>
      filterRolls(rolls, f, NOW).map((r) => r.id);
    expect(ids('all')).toEqual(['a', 'b', 'c', 'd']);
    expect(ids('in-camera')).toEqual(['a']);
    expect(ids('to-develop')).toEqual(['b', 'd']);
    expect(ids('this-year')).toEqual(['a', 'c']);
  });

  it('counts each filter', () => {
    expect(rollCounts(rolls, NOW)).toEqual({
      all: 4,
      'in-camera': 1,
      'to-develop': 2,
      'this-year': 2,
    });
  });

  it('handles an empty log', () => {
    expect(rollCounts([], NOW)).toEqual({
      all: 0,
      'in-camera': 0,
      'to-develop': 0,
      'this-year': 0,
    });
  });
});

describe('year boundary in local time', () => {
  it('uses the local year of a Z timestamp, not the UTC one', () => {
    // 23:30 local on 31 Dec: already next year in UTC for any zone west of it.
    const lateNewYearsEve = new Date(2026, 11, 31, 23, 30).toISOString();
    const earlyNewYear = new Date(2027, 0, 1, 0, 30).toISOString();
    const rolls = [
      roll('a', { startedAt: lateNewYearsEve }),
      roll('b', { startedAt: earlyNewYear }),
    ];
    expect(filterRolls(rolls, 'this-year', NOW).map((r) => r.id)).toEqual([
      'a',
    ]);
    expect(rollCounts(rolls, NOW)['this-year']).toBe(1);
  });
});

describe('sortRolls', () => {
  it('groups by status, newest first, bad dates last, without mutating', () => {
    const input = [
      roll('dev', { status: 'developed', startedAt: '2026-09-01T00:00:00' }),
      roll('fin', { status: 'finished', startedAt: '2026-03-01T00:00:00' }),
      roll('old', { status: 'active', startedAt: '2026-01-01T00:00:00' }),
      roll('bad', { status: 'active', startedAt: 'nope' }),
      roll('new', { status: 'active', startedAt: '2026-08-01T00:00:00' }),
    ];
    const before = input.map((r) => r.id);
    expect(sortRolls(input).map((r) => r.id)).toEqual([
      'new',
      'old',
      'bad',
      'fin',
      'dev',
    ]);
    expect(input.map((r) => r.id)).toEqual(before);
  });

  it('is stable for equal keys', () => {
    const input = [
      roll('x', { startedAt: 'a' }),
      roll('y', { startedAt: 'b' }),
    ];
    expect(sortRolls(input).map((r) => r.id)).toEqual(['x', 'y']);
  });
});

describe('filmLogStats', () => {
  it('is empty for no rolls', () => {
    expect(filmLogStats([], cameras, NOW)).toEqual({
      rollsThisYear: 0,
      framesThisYear: 0,
    });
  });

  it('counts this year and names the top film and camera all time', () => {
    const rolls = [
      roll('a', { filmStockName: 'HP5', shots: shots(36) }),
      roll('b', {
        filmStockName: 'HP5',
        shots: shots(12),
        cameraId: 'cam2',
      }),
      roll('c', {
        filmStockName: 'Tri-X',
        startedAt: '2024-05-01T00:00:00',
        shots: shots(10),
      }),
      roll('d', { startedAt: '2023-05-01T00:00:00' }),
    ];
    expect(filmLogStats(rolls, cameras, NOW)).toEqual({
      rollsThisYear: 2,
      framesThisYear: 48,
      topFilm: { name: 'HP5', rolls: 2, tied: false },
      topCamera: { name: 'Nikon FM2', rolls: 3, tied: false },
    });
  });

  it('breaks ties by the most recently started', () => {
    const rolls = [
      roll('a', {
        filmStockName: 'Old',
        cameraId: 'cam1',
        startedAt: '2025-01-01T00:00:00',
      }),
      roll('b', {
        filmStockName: 'New',
        cameraId: 'cam2',
        startedAt: '2026-01-01T00:00:00',
      }),
    ];
    const stats = filmLogStats(rolls, cameras, NOW);
    expect(stats.topFilm).toEqual({ name: 'New', rolls: 1, tied: true });
    expect(stats.topCamera).toEqual({
      name: 'Hasselblad',
      rolls: 1,
      tied: true,
    });
  });

  it('skips a deleted camera and unnamed film', () => {
    const rolls = [
      roll('a', { cameraId: 'gone', filmStockName: '  ' }),
      roll('b', { cameraId: 'gone' }),
    ];
    const stats = filmLogStats(rolls, cameras, NOW);
    expect(stats.topCamera).toBeUndefined();
    expect(stats.topFilm).toBeUndefined();
  });
});

describe('rollFilterFromParam', () => {
  it('reads a known filter, first value of a repeated one', () => {
    expect(rollFilterFromParam('to-develop')).toBe('to-develop');
    expect(rollFilterFromParam(['in-camera', 'all'])).toBe('in-camera');
  });

  it('ignores a missing or unknown value', () => {
    expect(rollFilterFromParam(undefined)).toBeUndefined();
    expect(rollFilterFromParam('printing')).toBeUndefined();
    expect(rollFilterFromParam([])).toBeUndefined();
  });
});
