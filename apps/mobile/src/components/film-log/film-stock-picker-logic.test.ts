import { describe, expect, it } from 'vitest';
import type { FilmRoll, FilmStock } from '@/types/film-log';
import {
  buildFilmSections,
  resolveFilmStockName,
} from './film-stock-picker-logic';

function stock(id: string, brand: string, name: string, iso = 400): FilmStock {
  return { id, brand, name, iso, process: 'bw' };
}

// Already brand/name-sorted, as `useFilmStocks` produces.
const KODAK_PORTRA = stock('kodak-portra-400', 'Kodak', 'Portra 400');
const KODAK_TRIX = stock('kodak-tri-x-400', 'Kodak', 'Tri-X 400');
const ILFORD_HP5 = stock('ilford-hp5-plus', 'Ilford', 'HP5 Plus');
const FUJI_400H = stock('fuji-400h', 'Fujifilm', '400H');
const CUSTOM_A = stock('custom-1', 'Custom', 'Homebrew A');
const CUSTOM_B = stock('custom-2', 'Custom', 'Homebrew B');

describe('buildFilmSections', () => {
  it('puts custom stocks in a single leading "Your films" section, preserving order', () => {
    const sections = buildFilmSections([CUSTOM_A, CUSTOM_B, KODAK_PORTRA], '');
    expect(sections[0]).toEqual({
      title: 'Your films',
      data: [CUSTOM_A, CUSTOM_B],
    });
  });

  it('groups catalog stocks by brand, brands sorted A→Z', () => {
    const sections = buildFilmSections(
      [KODAK_PORTRA, KODAK_TRIX, ILFORD_HP5, FUJI_400H],
      ''
    );
    expect(sections.map((s) => s.title)).toEqual([
      'Fujifilm',
      'Ilford',
      'Kodak',
    ]);
  });

  it('keeps films within a brand in input order (already name-sorted upstream)', () => {
    const sections = buildFilmSections([KODAK_PORTRA, KODAK_TRIX], '');
    expect(sections).toEqual([
      { title: 'Kodak', data: [KODAK_PORTRA, KODAK_TRIX] },
    ]);
  });

  it('returns all sections for an empty query', () => {
    const films = [CUSTOM_A, KODAK_PORTRA, ILFORD_HP5];
    expect(buildFilmSections(films, '').length).toBe(3);
    expect(buildFilmSections(films, '   ').length).toBe(3);
  });

  it('filters case-insensitively over "{brand} {name}", dropping empty sections', () => {
    const sections = buildFilmSections(
      [KODAK_PORTRA, KODAK_TRIX, ILFORD_HP5],
      'tri'
    );
    expect(sections).toEqual([{ title: 'Kodak', data: [KODAK_TRIX] }]);

    const upper = buildFilmSections(
      [KODAK_PORTRA, KODAK_TRIX, ILFORD_HP5],
      'TRI-X'
    );
    expect(upper).toEqual([{ title: 'Kodak', data: [KODAK_TRIX] }]);
  });

  it('keeps only "Your films" when the query matches only a custom film', () => {
    const sections = buildFilmSections(
      [CUSTOM_A, CUSTOM_B, KODAK_PORTRA],
      'homebrew a'
    );
    expect(sections).toEqual([{ title: 'Your films', data: [CUSTOM_A] }]);
  });

  it('omits "Your films" when there are no custom films', () => {
    const sections = buildFilmSections([KODAK_PORTRA, ILFORD_HP5], '');
    expect(sections.some((s) => s.title === 'Your films')).toBe(false);
  });

  it('returns no sections when nothing matches the query', () => {
    expect(buildFilmSections([KODAK_PORTRA, ILFORD_HP5], 'zzz')).toEqual([]);
  });
});

const BASE_ROLL: FilmRoll = {
  id: 'roll-1',
  name: '',
  cameraId: 'camera-1',
  filmStockId: 'stub-era-id',
  filmStockName: 'Kodak Tri-X 400 (legacy)',
  process: 'bw',
  status: 'active',
  shots: [],
  startedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('resolveFilmStockName', () => {
  it('uses the fresh brand/name when the id resolves', () => {
    expect(resolveFilmStockName(KODAK_TRIX, KODAK_TRIX.id, BASE_ROLL)).toBe(
      'Kodak Tri-X 400'
    );
  });

  it('keeps the existing snapshot when the id is unresolved but unchanged', () => {
    expect(
      resolveFilmStockName(undefined, BASE_ROLL.filmStockId, BASE_ROLL)
    ).toBe('Kodak Tri-X 400 (legacy)');
  });

  it('drops the name when the id is unresolved and changed from the existing roll', () => {
    expect(
      resolveFilmStockName(undefined, 'some-other-unresolved-id', BASE_ROLL)
    ).toBeUndefined();
  });

  it('drops the name when unresolved on a brand-new roll (no existing)', () => {
    expect(
      resolveFilmStockName(undefined, 'unresolved-id', undefined)
    ).toBeUndefined();
  });
});
