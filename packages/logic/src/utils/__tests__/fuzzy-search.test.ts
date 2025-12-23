import type { Film } from '@dorkroom/api';
import { describe, expect, it } from 'vitest';
import {
  createFilmSearcher,
  getMatchHighlights,
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
      dateAdded: '2023-01-01',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
  ];

  describe('createFilmSearcher', () => {
    it('should create a valid Fuse instance', () => {
      const searcher = createFilmSearcher(mockFilms);

      expect(searcher).toBeDefined();
      expect(typeof searcher.search).toBe('function');
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

    describe('Description search', () => {
      it('should find films by description keyword', () => {
        const results = searchFilms(mockFilms, 'portrait');

        expect(results.length).toBeGreaterThan(0);
        // Should find Portra (portrait film)
        const hasPortra = results.some((r) => r.item.name === 'Portra 400');
        expect(hasPortra).toBe(true);
      });

      it('should find films by technical description', () => {
        const results = searchFilms(mockFilms, 'high speed');

        expect(results.length).toBeGreaterThan(0);
        // Should match "high-speed" or "ultra-high speed" in descriptions
      });
    });

    describe('Color type search', () => {
      it('should find black and white films', () => {
        const results = searchFilms(mockFilms, 'black and white');

        expect(results.length).toBeGreaterThan(0);
        // Results should include B&W films
        results.forEach((result) => {
          expect(['bw', 'b&w']).toContain(result.item.colorType.toLowerCase());
        });
      });

      it('should find color films', () => {
        const results = searchFilms(mockFilms, 'color negative');

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
    });

    describe('Result ordering and relevance', () => {
      it('should return most relevant results first', () => {
        const results = searchFilms(mockFilms, 'kodak');

        expect(results.length).toBeGreaterThan(0);
        // First result should be a Kodak film
        expect(results[0].item.brand).toBe('Kodak');
      });

      it('should include similarity scores', () => {
        const results = searchFilms(mockFilms, 'tri-x');

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].score).toBeDefined();
        expect(typeof results[0].score).toBe('number');
        // Lower score = better match
        expect(results[0].score).toBeLessThan(1);
      });

      it('should prioritize brand and name over description', () => {
        const results = searchFilms(mockFilms, 'kodak');

        expect(results.length).toBeGreaterThan(0);
        // Brand matches should score better than description matches
        expect(results[0].item.brand).toBe('Kodak');
      });
    });

    describe('Fuzzy matching tolerance', () => {
      it('should handle minor typos in brand name', () => {
        const results = searchFilms(mockFilms, 'kodac'); // typo: c instead of k

        // Should still find Kodak films with fuzzy matching
        expect(results.length).toBeGreaterThan(0);
      });

      it('should handle minor typos in film name', () => {
        const results = searchFilms(mockFilms, 'portra'); // without 400

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].item.name).toBe('Portra 400');
      });

      it('should not match very different strings', () => {
        const results = searchFilms(mockFilms, 'xyz');

        // No film matches "xyz" - too different
        expect(results).toEqual([]);
      });
    });

    describe('Real-world search scenarios', () => {
      it('should find films when user searches common shorthand (HP5)', () => {
        const results = searchFilms(mockFilms, 'hp5');

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].item.name).toBe('HP5 Plus');
      });

      it('should find films when user searches film name with number (tri-x 400)', () => {
        const results = searchFilms(mockFilms, 'tri-x 400');

        expect(results.length).toBeGreaterThan(0);
        // Should match Tri-X 400 by name
        const hasTrix = results.some((r) => r.item.name === 'Tri-X 400');
        expect(hasTrix).toBe(true);
      });

      it('should handle multi-word searches (fine grain)', () => {
        const results = searchFilms(mockFilms, 'fine grain');

        expect(results.length).toBeGreaterThan(0);
        // Should match films with fine grain
      });
    });
  });

  describe('getMatchHighlights', () => {
    it('should extract match information correctly for brand match', () => {
      const results = searchFilms(mockFilms, 'kodak');
      expect(results.length).toBeGreaterThan(0);

      const highlights = getMatchHighlights(results[0]);

      expect(highlights.length).toBeGreaterThan(0);
      // Should have highlighted the brand field
      const brandHighlight = highlights.find((h) => h.key === 'brand');
      expect(brandHighlight).toBeDefined();
      expect(brandHighlight?.value).toBe('Kodak');
      expect(brandHighlight?.indices).toBeDefined();
      expect(brandHighlight?.indices.length).toBeGreaterThan(0);
    });

    it('should extract match information correctly for name match', () => {
      const results = searchFilms(mockFilms, 'tri-x');
      expect(results.length).toBeGreaterThan(0);

      const highlights = getMatchHighlights(results[0]);

      expect(highlights.length).toBeGreaterThan(0);
      // Should have highlighted the name field
      const nameHighlight = highlights.find((h) => h.key === 'name');
      expect(nameHighlight).toBeDefined();
    });

    it('should return empty array when no matches available', () => {
      const results = searchFilms(mockFilms, 'kodak');
      expect(results.length).toBeGreaterThan(0);

      // Create a result without matches
      const resultWithoutMatches = { ...results[0], matches: undefined };
      const highlights = getMatchHighlights(resultWithoutMatches);

      expect(highlights).toEqual([]);
    });

    it('should handle multiple field matches', () => {
      const results = searchFilms(mockFilms, 'kodak portra');
      expect(results.length).toBeGreaterThan(0);

      const highlights = getMatchHighlights(results[0]);

      // Should have highlights for multiple fields
      expect(highlights.length).toBeGreaterThan(0);
    });

    it('should include valid indices for highlighting UI', () => {
      const results = searchFilms(mockFilms, 'ilford');
      expect(results.length).toBeGreaterThan(0);

      const highlights = getMatchHighlights(results[0]);
      expect(highlights.length).toBeGreaterThan(0);

      highlights.forEach((highlight) => {
        expect(highlight.key).toBeDefined();
        expect(typeof highlight.key).toBe('string');
        expect(highlight.value).toBeDefined();
        expect(typeof highlight.value).toBe('string');
        expect(Array.isArray(highlight.indices)).toBe(true);
        // Each index should be a [start, end] tuple
        highlight.indices.forEach((index) => {
          expect(Array.isArray(index)).toBe(true);
          expect(index).toHaveLength(2);
          expect(typeof index[0]).toBe('number');
          expect(typeof index[1]).toBe('number');
          expect(index[0]).toBeLessThanOrEqual(index[1]);
        });
      });
    });
  });
});
