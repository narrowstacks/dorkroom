import type { Film } from '@dorkroom/api';
import { describe, expect, it } from 'vitest';
import {
  buildFilmSlugIndex,
  getAllSlugsForFilm,
  getBaseFilm,
  resolveFilmBySlug,
} from '../film-alias-resolver';

function makeFilm(overrides: Partial<Film> = {}): Film {
  return {
    id: 1,
    uuid: 'test-uuid',
    slug: 'kodak-tri-x-400',
    brand: 'Kodak',
    name: 'Tri-X 400',
    colorType: 'bw',
    isoSpeed: 400,
    grainStructure: null,
    description: '',
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: false,
    staticImageUrl: null,
    aliases: [],
    baseFilmSlug: null,
    dateAdded: '2024-01-01',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('film-alias-resolver', () => {
  describe('buildFilmSlugIndex', () => {
    it('indexes films by canonical slug', () => {
      const film = makeFilm();
      const index = buildFilmSlugIndex([film]);

      expect(index.get('kodak-tri-x-400')).toBe(film);
    });

    it('indexes films by aliases', () => {
      const film = makeFilm({
        slug: 'kodak-tmax-400',
        aliases: ['kodak-t-max-400', 'kodak-tmx-400'],
      });
      const index = buildFilmSlugIndex([film]);

      expect(index.get('kodak-tmax-400')).toBe(film);
      expect(index.get('kodak-t-max-400')).toBe(film);
      expect(index.get('kodak-tmx-400')).toBe(film);
    });

    it('handles films with no aliases', () => {
      const film = makeFilm({ aliases: [] });
      const index = buildFilmSlugIndex([film]);

      expect(index.size).toBe(1);
      expect(index.get('kodak-tri-x-400')).toBe(film);
    });

    it('later film wins when two films claim the same alias', () => {
      const filmA = makeFilm({
        slug: 'film-a',
        uuid: 'uuid-a',
        aliases: ['shared-alias'],
      });
      const filmB = makeFilm({
        slug: 'film-b',
        uuid: 'uuid-b',
        aliases: ['shared-alias'],
      });
      const index = buildFilmSlugIndex([filmA, filmB]);

      expect(index.get('shared-alias')).toBe(filmB);
    });

    it('handles empty film list', () => {
      const index = buildFilmSlugIndex([]);
      expect(index.size).toBe(0);
    });
  });

  describe('resolveFilmBySlug', () => {
    it('resolves canonical slug', () => {
      const film = makeFilm();
      const index = buildFilmSlugIndex([film]);

      expect(resolveFilmBySlug('kodak-tri-x-400', index)).toBe(film);
    });

    it('resolves alias to the canonical film', () => {
      const film = makeFilm({
        slug: 'kodak-tmax-400',
        aliases: ['kodak-t-max-400'],
      });
      const index = buildFilmSlugIndex([film]);

      expect(resolveFilmBySlug('kodak-t-max-400', index)).toBe(film);
    });

    it('returns undefined for unknown slug', () => {
      const index = buildFilmSlugIndex([makeFilm()]);

      expect(resolveFilmBySlug('nonexistent', index)).toBeUndefined();
    });
  });

  describe('getBaseFilm', () => {
    it('returns base film when baseFilmSlug is set', () => {
      const base = makeFilm({ slug: 'kodak-tri-x-400', uuid: 'base-uuid' });
      const rebrand = makeFilm({
        slug: 'arista-premium-400',
        uuid: 'rebrand-uuid',
        baseFilmSlug: 'kodak-tri-x-400',
      });
      const index = buildFilmSlugIndex([base, rebrand]);

      expect(getBaseFilm(rebrand, index)).toBe(base);
    });

    it('returns undefined when no baseFilmSlug', () => {
      const film = makeFilm({ baseFilmSlug: null });
      const index = buildFilmSlugIndex([film]);

      expect(getBaseFilm(film, index)).toBeUndefined();
    });

    it('returns undefined when base film slug not found in index', () => {
      const rebrand = makeFilm({
        slug: 'arista-premium-400',
        baseFilmSlug: 'nonexistent-base',
      });
      const index = buildFilmSlugIndex([rebrand]);

      expect(getBaseFilm(rebrand, index)).toBeUndefined();
    });
  });

  describe('getAllSlugsForFilm', () => {
    it('returns only canonical slug when no aliases', () => {
      const film = makeFilm({ slug: 'kodak-tri-x-400', aliases: [] });

      expect(getAllSlugsForFilm(film)).toEqual(['kodak-tri-x-400']);
    });

    it('returns canonical slug and all aliases', () => {
      const film = makeFilm({
        slug: 'kodak-tmax-400',
        aliases: ['kodak-t-max-400', 'kodak-tmx-400'],
      });

      expect(getAllSlugsForFilm(film)).toEqual([
        'kodak-tmax-400',
        'kodak-t-max-400',
        'kodak-tmx-400',
      ]);
    });
  });
});
