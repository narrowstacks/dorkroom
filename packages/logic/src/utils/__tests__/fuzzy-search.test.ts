import type { Film } from '@dorkroom/api';
import { describe, expect, it } from 'vitest';
import {
  createFilmSearcher,
  matchesSearchQuery,
  searchFilms,
} from '../fuzzy-search';

/**
 * Comprehensive test suite for fuzzy search functionality using Fuse.js.
 * Tests the film search utility functions focusing on:
 * - Search result quality and relevance
 * - Match highlighting extraction
 * - Edge cases (empty queries, no matches, partial matches)
 * - Realistic film stock data scenarios
 */
describe('fuzzy-search', () => {
  /**
   * Mock film data representing realistic analog photography film stocks
   */
  const mockFilms: Film[] = [
    {
      id: 1,
      uuid: 'f1',
      slug: 'hp5-plus',
      brand: 'Ilford',
      name: 'HP5 Plus',
      colorType: 'bw',
      isoSpeed: 400,
      grainStructure: 'classic',
      description: 'Classic black and white film with excellent latitude',
      manufacturerNotes: null,
      reciprocityFailure: null,
      discontinued: false,
      staticImageUrl: null,
      aliases: [],
      baseFilmSlug: null,
      dateAdded: '2023-01-01',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
    {
      id: 2,
      uuid: 'f2',
      slug: 'tri-x-400',
      brand: 'Kodak',
      name: 'Tri-X 400',
      colorType: 'bw',
      isoSpeed: 400,
      grainStructure: 'classic',
      description: 'Iconic high-speed black and white film',
      manufacturerNotes: null,
      reciprocityFailure: null,
      discontinued: false,
      staticImageUrl: null,
      aliases: [],
      baseFilmSlug: null,
      dateAdded: '2023-01-01',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
    {
      id: 3,
      uuid: 'f3',
      slug: 'portra-400',
      brand: 'Kodak',
      name: 'Portra 400',
      colorType: 'color',
      isoSpeed: 400,
      grainStructure: 'fine',
      description: 'Professional color negative film for portraits',
      manufacturerNotes: null,
      reciprocityFailure: null,
      discontinued: false,
      staticImageUrl: null,
      aliases: [],
      baseFilmSlug: null,
      dateAdded: '2023-01-01',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
    {
      id: 4,
      uuid: 'f4',
      slug: 'delta-3200',
      brand: 'Ilford',
      name: 'Delta 3200',
      colorType: 'bw',
      isoSpeed: 3200,
      grainStructure: 'fine',
      description: 'Ultra-high speed black and white film',
      manufacturerNotes: null,
      reciprocityFailure: null,
      discontinued: false,
      staticImageUrl: null,
      aliases: [],
      baseFilmSlug: null,
      dateAdded: '2023-01-01',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
    {
      id: 5,
      uuid: 'f5',
      slug: 'ektar-100',
      brand: 'Kodak',
      name: 'Ektar 100',
      colorType: 'color',
      isoSpeed: 100,
      grainStructure: 'ultra-fine',
      description: "World's finest grain color negative film",
      manufacturerNotes: null,
      reciprocityFailure: null,
      discontinued: false,
      staticImageUrl: null,
      aliases: [],
      baseFilmSlug: null,
      dateAdded: '2023-01-01',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
  ];

  describe('createFilmSearcher', () => {
    it('should create a searcher bound to the supplied films', () => {
      const searcher = createFilmSearcher(mockFilms);

      const results = searcher.search('ilford');
      expect(results.map((result) => result.item.slug)).toContain('hp5-plus');
    });

    it('should create searcher with empty film list', () => {
      const searcher = createFilmSearcher([]);

      expect(searcher).toBeDefined();
      const results = searcher.search('kodak');
      expect(results).toHaveLength(0);
    });

    it('should allow reusing searcher for multiple queries', () => {
      const searcher = createFilmSearcher(mockFilms);

      const results1 = searcher.search('kodak');
      const results2 = searcher.search('ilford');

      expect(results1.length).toBeGreaterThan(0);
      expect(results2.length).toBeGreaterThan(0);
      // Verify different results
      expect(results1[0].item.brand).toBe('Kodak');
      expect(results2[0].item.brand).toBe('Ilford');
    });
  });

  describe('searchFilms', () => {
    describe('Brand search', () => {
      it('should return results for matching brand (Kodak)', () => {
        const results = searchFilms(mockFilms, 'kodak');

        expect(results.length).toBeGreaterThan(0);
        // All results should be Kodak films
        results.forEach((result) => {
          expect(result.item.brand).toBe('Kodak');
        });
      });

      it('should return results for matching brand (Ilford)', () => {
        const results = searchFilms(mockFilms, 'ilford');

        expect(results.length).toBeGreaterThan(0);
        results.forEach((result) => {
          expect(result.item.brand).toBe('Ilford');
        });
      });

      it('should be case insensitive for brand search', () => {
        const resultsLower = searchFilms(mockFilms, 'kodak');
        const resultsUpper = searchFilms(mockFilms, 'KODAK');
        const resultsMixed = searchFilms(mockFilms, 'KoDaK');

        expect(resultsLower.length).toBeGreaterThan(0);
        expect(resultsUpper.length).toBeGreaterThan(0);
        expect(resultsMixed.length).toBeGreaterThan(0);
        // Should return same films
        expect(resultsLower.length).toBe(resultsUpper.length);
        expect(resultsLower.length).toBe(resultsMixed.length);
      });
    });

    describe('Film name search', () => {
      it('should find film by exact name', () => {
        const results = searchFilms(mockFilms, 'Portra 400');

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].item.name).toBe('Portra 400');
      });

      it('should find film by partial name', () => {
        const results = searchFilms(mockFilms, 'tri-x');

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].item.name).toBe('Tri-X 400');
      });

      it('should find film by name without exact spacing', () => {
        const results = searchFilms(mockFilms, 'hp5');

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].item.name).toBe('HP5 Plus');
      });
    });

    describe('Color type search', () => {
      it('should find black and white films', () => {
        const results = searchFilms(mockFilms, 'bw');

        expect(results.length).toBeGreaterThan(0);
        results.forEach((result) => {
          expect(['bw', 'b&w']).toContain(result.item.colorType.toLowerCase());
        });
      });

      it('should find color films', () => {
        const results = searchFilms(mockFilms, 'color');

        expect(results.length).toBeGreaterThan(0);
      });
    });

    describe('Empty and invalid queries', () => {
      it('should return empty array for empty string', () => {
        const results = searchFilms(mockFilms, '');

        expect(results).toEqual([]);
      });

      it('should return empty array for whitespace-only string', () => {
        const results = searchFilms(mockFilms, '   ');

        expect(results).toEqual([]);
      });

      it('should return empty array for non-matching query', () => {
        const results = searchFilms(mockFilms, 'zzzzzznonexistent');

        expect(results).toEqual([]);
      });

      it.each(['!!!', '- -'])(
        'returns every film, in input order, for punctuation-only "%s"',
        (query) => {
          const results = searchFilms(mockFilms, query);
          expect(results.map((r) => r.item.uuid)).toEqual(
            mockFilms.map((f) => f.uuid)
          );
        }
      );
    });

    describe('Fuzzy matching tolerance', () => {
      it('should handle minor typos in brand name', () => {
        const results = searchFilms(mockFilms, 'kodac'); // typo: c instead of k

        // Exactly the three Kodak films, no Ilford
        expect(results.map((r) => r.item.uuid).sort()).toEqual([
          'f2',
          'f3',
          'f5',
        ]);
      });

      it.each([
        ['portrra', 'doubled letter'],
        ['potra', 'dropped letter'],
      ])('should handle a typo in film name: %s (%s)', (query) => {
        const results = searchFilms(mockFilms, query);

        expect(results.map((r) => r.item.name)).toEqual(['Portra 400']);
      });

      it('should not match very different strings', () => {
        const results = searchFilms(mockFilms, 'xyz');

        // No film matches "xyz" - too different
        expect(results).toEqual([]);
      });
    });

    describe('Real-world search scenarios', () => {
      it('should find films when user searches film name with number (tri-x 400)', () => {
        const results = searchFilms(mockFilms, 'tri-x 400');

        expect(results.length).toBeGreaterThan(0);
        // Should match Tri-X 400 by name
        const hasTrix = results.some((r) => r.item.name === 'Tri-X 400');
        expect(hasTrix).toBe(true);
      });

      it('should handle multi-word searches (ilford hp5)', () => {
        const results = searchFilms(mockFilms, 'ilford hp5');

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].item.name).toBe('HP5 Plus');
      });
    });

    describe('Punctuation-only words', () => {
      const uuids = (query: string) =>
        searchFilms(mockFilms, query).map((r) => r.item.uuid);

      it.each([
        ['kodak - portra', 'kodak portra'],
        ['kodak -- portra', 'kodak portra'],
        ['ilford !! hp5', 'ilford hp5'],
        ['- kodak', 'kodak'],
      ])('treats "%s" like "%s"', (query, clean) => {
        const expected = uuids(clean);

        expect(expected.length).toBeGreaterThan(0);
        expect(uuids(query)).toEqual(expected);
      });

      it.each(['!!!', '- -'])(
        'returns every film in input order for "%s"',
        (query) => {
          expect(uuids(query)).toEqual(mockFilms.map((film) => film.uuid));
        }
      );
    });
  });

  describe('alias search', () => {
    const aliasFilm: Film = {
      ...mockFilms[0],
      id: 99,
      uuid: 'f99',
      slug: 'agfa-apx-400',
      brand: 'Agfa',
      name: 'APX 400',
      aliases: [
        { slug: 'agfa-apx-400', name: 'Zebrafoo Classic' },
        { slug: 'agfa-apx-400-b', name: 'Quux-Ultra/Pro' },
      ],
    };
    const films = [...mockFilms, aliasFilm];

    it('returns a film when the query matches an alias name', () => {
      const results = searchFilms(films, 'Zebrafoo');
      expect(results.map((r) => r.item.slug)).toContain('agfa-apx-400');
    });

    it('normalizes punctuation in alias names like other fields', () => {
      const results = searchFilms(films, 'quuxultrapro');
      expect(results.map((r) => r.item.slug)).toContain('agfa-apx-400');
    });
  });

  describe('alias search with real-world alias data', () => {
    const base = mockFilms[0];
    const make = (id: number, name: string, aliasNames: string[]): Film => ({
      ...base,
      id,
      uuid: `r${id}`,
      slug: `kodak-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      brand: 'Kodak',
      name,
      aliases: aliasNames.map((n) => ({ slug: `s${id}`, name: n })),
    });
    // Mirrors the migration shape: brand-prefixed display names and
    // slug-form names on the same model as the current name.
    const withAliases: Film[] = [
      make(201, 'Tri-X 400', ['Kodak Tri-X 400', 'kodak-tri-x-400']),
      make(202, 'T-Max 400', ['Kodak T-Max 400', 'kodak-t-max-400']),
      make(203, 'Portra 400', []),
      make(204, 'UltraMax 400', [
        'Kodak Gold Ultra 400',
        'Kodacolor Gold',
        'kodak-ultramax-400',
      ]),
      make(205, 'Gold 200', ['Kodak Gold 200']),
    ];
    const withoutAliases = withAliases.map((f) => ({ ...f, aliases: [] }));
    const summary = (films: Film[], q: string) =>
      searchFilms(films, q).map((r) => [r.item.uuid, r.score]);

    it('ranks a current-name query first despite redundant aliases', () => {
      const results = searchFilms(withAliases, 'Gold');
      expect(results.map((r) => r.item.uuid)).toEqual(['r205', 'r204']);
    });

    it('gives a redundant alias the same scores as no alias', () => {
      expect(summary(withAliases, 'gold 200')).toEqual(
        summary(withoutAliases, 'gold 200')
      );
    });

    it.each(['400', 'kodak'])(
      'scores "%s" the same with and without aliases',
      (q) => {
        expect(summary(withAliases, q)).toEqual(summary(withoutAliases, q));
      }
    );

    it('finds a film by a former name that adds new information', () => {
      const results = searchFilms(withAliases, 'Kodacolor');
      expect(results.map((r) => r.item.uuid)).toEqual(['r204']);
    });

    it('finds a film by a multi-word former-name query', () => {
      const results = searchFilms(withAliases, 'kodak kodacolor');
      expect(results.map((r) => r.item.uuid)).toContain('r204');
    });

    it('matches brand and former-name words together', () => {
      // "kodak" only matches the brand; "elite chrome" only the alias.
      const ektachrome = make(206, 'Ektachrome E100', [
        'Kodak Elite Chrome 100',
      ]);
      const results = searchFilms(
        [...withAliases, ektachrome],
        'kodak elite chrome'
      );
      expect(results.map((r) => r.item.uuid)).toEqual(['r206']);
    });

    it('still works when films have no aliases', () => {
      const results = searchFilms(withAliases, 'portra');
      expect(results[0].item.uuid).toBe('r203');
    });
  });

  describe('matchesSearchQuery', () => {
    it('matches "tri x" against "Kodak Tri-X 400" (the reported bug)', () => {
      expect(matchesSearchQuery('Kodak Tri-X 400', 'tri x')).toBe(true);
    });

    it('matches "trix" against "Kodak Tri-X 400"', () => {
      expect(matchesSearchQuery('Kodak Tri-X 400', 'trix')).toBe(true);
    });

    it('matches "tri-x" against "Kodak Tri-X 400"', () => {
      expect(matchesSearchQuery('Kodak Tri-X 400', 'tri-x')).toBe(true);
    });

    it('matches "d 76" against "Kodak D-76"', () => {
      expect(matchesSearchQuery('Kodak D-76', 'd 76')).toBe(true);
    });

    it('matches "hp 5" against "Ilford HP5 Plus"', () => {
      expect(matchesSearchQuery('Ilford HP5 Plus', 'hp 5')).toBe(true);
    });

    it('does not match "kodak" against "Ilford HP5 Plus"', () => {
      expect(matchesSearchQuery('Ilford HP5 Plus', 'kodak')).toBe(false);
    });

    it('matches "kodak 400" against "Kodak Tri-X 400" (token AND)', () => {
      expect(matchesSearchQuery('Kodak Tri-X 400', 'kodak 400')).toBe(true);
    });

    it('matches anything for an empty query', () => {
      expect(matchesSearchQuery('anything', '')).toBe(true);
    });

    it('treats tokens that normalize to empty as an empty query (no crash)', () => {
      expect(matchesSearchQuery('Kodak Tri-X 400', '- -')).toBe(true);
    });
  });
});
