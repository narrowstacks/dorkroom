import type { Film } from '@dorkroom/api';
import { describe, expect, it } from 'vitest';
import type { FilmdevRecipe } from '../../services/filmdev-api';
import {
  findBestFilmMatch,
  mapFilmdevRecipeToFormData,
} from '../filmdev-mapper';

// Mock film data matching real database structure
const createMockFilm = (overrides: Partial<Film>): Film => ({
  id: 1,
  uuid: 'test-uuid',
  slug: 'test-film',
  brand: 'Test',
  name: 'Film',
  colorType: 'bw',
  isoSpeed: 400,
  grainStructure: 'classic',
  description: '',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: null,
  dateAdded: '2024-01-01',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('findBestFilmMatch', () => {
  describe('ISO disambiguation', () => {
    const kentmereFilms: Film[] = [
      createMockFilm({
        id: 1,
        uuid: 'kentmere-100',
        brand: 'Kentmere',
        name: 'Pan 100',
        isoSpeed: 100,
      }),
      createMockFilm({
        id: 2,
        uuid: 'kentmere-400',
        brand: 'Kentmere',
        name: 'Pan 400',
        isoSpeed: 400,
      }),
    ];

    it('should match Kentmere Pan 400 to the correct film, not Pan 100', () => {
      const result = findBestFilmMatch('Kentmere Pan 400', kentmereFilms);
      expect(result?.uuid).toBe('kentmere-400');
    });

    it('should match Kentmere Pan 100 to the correct film', () => {
      const result = findBestFilmMatch('Kentmere Pan 100', kentmereFilms);
      expect(result?.uuid).toBe('kentmere-100');
    });

    it('should match regardless of array order', () => {
      const reversedFilms = [...kentmereFilms].reverse();
      const result = findBestFilmMatch('Kentmere Pan 400', reversedFilms);
      expect(result?.uuid).toBe('kentmere-400');
    });
  });

  describe('Ilford HP5 vs HP5 Plus', () => {
    const ilfordFilms: Film[] = [
      createMockFilm({
        id: 1,
        uuid: 'hp5-plus',
        brand: 'Ilford',
        name: 'HP5 Plus',
        isoSpeed: 400,
      }),
      createMockFilm({
        id: 2,
        uuid: 'fp4-plus',
        brand: 'Ilford',
        name: 'FP4 Plus',
        isoSpeed: 125,
      }),
    ];

    it('should match "Ilford HP5+" to HP5 Plus', () => {
      const result = findBestFilmMatch('Ilford HP5+', ilfordFilms);
      expect(result?.uuid).toBe('hp5-plus');
    });

    it('should match "HP5 Plus 400" to HP5 Plus', () => {
      const result = findBestFilmMatch('HP5 Plus 400', ilfordFilms);
      expect(result?.uuid).toBe('hp5-plus');
    });
  });

  describe('Kodak Tri-X variations', () => {
    const kodakFilms: Film[] = [
      createMockFilm({
        id: 1,
        uuid: 'tri-x-400',
        brand: 'Kodak',
        name: 'Tri-X 400',
        isoSpeed: 400,
      }),
      createMockFilm({
        id: 2,
        uuid: 'tmax-400',
        brand: 'Kodak',
        name: 'T-Max 400',
        isoSpeed: 400,
      }),
      createMockFilm({
        id: 3,
        uuid: 'tmax-100',
        brand: 'Kodak',
        name: 'T-Max 100',
        isoSpeed: 100,
      }),
    ];

    it('should match "TRI-X 400" (caps) to Tri-X 400', () => {
      const result = findBestFilmMatch('TRI-X 400', kodakFilms);
      expect(result?.uuid).toBe('tri-x-400');
    });

    it('should match "Kodak TMax 400" to T-Max 400', () => {
      const result = findBestFilmMatch('Kodak TMax 400', kodakFilms);
      expect(result?.uuid).toBe('tmax-400');
    });

    it('should match "T-Max 100" to T-Max 100, not T-Max 400', () => {
      const result = findBestFilmMatch('T-Max 100', kodakFilms);
      expect(result?.uuid).toBe('tmax-100');
    });
  });

  describe('exact matches', () => {
    const films: Film[] = [
      createMockFilm({
        id: 1,
        uuid: 'portra-400',
        brand: 'Kodak',
        name: 'Portra 400',
        isoSpeed: 400,
        colorType: 'color',
      }),
    ];

    it('should match exact full name', () => {
      const result = findBestFilmMatch('Kodak Portra 400', films);
      expect(result?.uuid).toBe('portra-400');
    });

    it('should match exact name without brand', () => {
      const result = findBestFilmMatch('Portra 400', films);
      expect(result?.uuid).toBe('portra-400');
    });
  });

  describe('edge cases', () => {
    const films: Film[] = [
      createMockFilm({
        id: 1,
        uuid: 'delta-3200',
        brand: 'Ilford',
        name: 'Delta 3200',
        isoSpeed: 3200,
      }),
    ];

    it('should return null for empty string', () => {
      const result = findBestFilmMatch('', films);
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      const result = findBestFilmMatch('   ', films);
      expect(result).toBeNull();
    });

    it('should return null for empty film array', () => {
      const result = findBestFilmMatch('Kodak Tri-X', []);
      expect(result).toBeNull();
    });

    it('should return null for no reasonable match', () => {
      const result = findBestFilmMatch('Totally Unknown Film XYZ', films);
      expect(result).toBeNull();
    });

    it('should match high ISO films correctly', () => {
      const result = findBestFilmMatch('Ilford Delta 3200', films);
      expect(result?.uuid).toBe('delta-3200');
    });
  });

  describe('filmdev.org real-world cases', () => {
    const realFilms: Film[] = [
      createMockFilm({
        id: 1,
        uuid: 'kentmere-100',
        brand: 'Kentmere',
        name: 'Pan 100',
        isoSpeed: 100,
      }),
      createMockFilm({
        id: 2,
        uuid: 'kentmere-400',
        brand: 'Kentmere',
        name: 'Pan 400',
        isoSpeed: 400,
      }),
      createMockFilm({
        id: 3,
        uuid: 'foma-100',
        brand: 'Fomapan',
        name: '100 Classic',
        isoSpeed: 100,
      }),
      createMockFilm({
        id: 4,
        uuid: 'foma-400',
        brand: 'Fomapan',
        name: '400 Action',
        isoSpeed: 400,
      }),
    ];

    it('should correctly match "Kentmere Pan 400" from filmdev.org recipe 13339', () => {
      // This is the actual test case that was failing
      const result = findBestFilmMatch('Kentmere Pan 400', realFilms);
      expect(result?.uuid).toBe('kentmere-400');
      expect(result?.name).toBe('Pan 400');
    });

    it('should match Fomapan 400 correctly', () => {
      const result = findBestFilmMatch('Fomapan 400', realFilms);
      expect(result?.uuid).toBe('foma-400');
    });

    it('should match Fomapan 100 correctly, not 400', () => {
      const result = findBestFilmMatch('Fomapan 100', realFilms);
      expect(result?.uuid).toBe('foma-100');
    });
  });
});

// Helper to create mock FilmdevRecipe
const createMockFilmdevRecipe = (
  overrides: Partial<FilmdevRecipe>
): FilmdevRecipe => ({
  id: 1,
  film: 'Test Film 400',
  developer: 'Test Developer',
  dilution_ratio: '1:50',
  celcius: '20.0',
  fahrenheit: '68.0',
  duration_hours: 0,
  duration_minutes: 10,
  duration_seconds: 0,
  notes: 'Test notes',
  created: '01-Jan-2024',
  user: 'test_user',
  recipe_link: 'https://filmdev.org/recipe/show/1',
  recipe_name: 'Test Recipe',
  profile_link: 'https://flickr.com/people/test',
  photos_link: 'https://flickr.com/photos/test',
  format: '35mm',
  developed_at: null,
  ...overrides,
});

describe('mapFilmdevRecipeToFormData', () => {
  describe('shooting ISO from developed_at', () => {
    it('should use developed_at as shooting ISO when provided', () => {
      const recipe = createMockFilmdevRecipe({
        film: 'Kentmere Photographic Kentmere 400',
        developed_at: 800,
      });

      const result = mapFilmdevRecipeToFormData(recipe, null, null);

      expect(result.shootingIso).toBe(800);
    });

    it('should default to 400 when developed_at is null', () => {
      const recipe = createMockFilmdevRecipe({
        film: 'Test Film',
        developed_at: null,
      });

      const result = mapFilmdevRecipeToFormData(recipe, null, null);

      expect(result.shootingIso).toBe(400);
    });

    it('should handle filmdev.org recipe 13339 correctly (Kentmere 400 shot at 800)', () => {
      // Real data from filmdev.org API
      const recipe = createMockFilmdevRecipe({
        id: 13339,
        film: 'Kentmere Photographic Kentmere 400',
        developer: 'Rodinal',
        dilution_ratio: '1:50',
        developed_at: 800,
        duration_minutes: 19,
        recipe_name:
          'Kentmere Photographic Kentmere 400 at 800 in Rodinal 1:50',
      });

      const matchedFilm = createMockFilm({
        uuid: 'kentmere-400',
        brand: 'Kentmere',
        name: 'Pan 400',
        isoSpeed: 400,
      });

      const result = mapFilmdevRecipeToFormData(recipe, matchedFilm, null);

      expect(result.shootingIso).toBe(800);
      expect(result.pushPull).toBe(1); // 800/400 = 2x = 1 stop push
    });
  });

  describe('push/pull calculation', () => {
    it('should calculate 1 stop push (400 -> 800)', () => {
      const recipe = createMockFilmdevRecipe({
        film: 'Ilford HP5 Plus',
        developed_at: 800,
      });

      const matchedFilm = createMockFilm({
        brand: 'Ilford',
        name: 'HP5 Plus',
        isoSpeed: 400,
      });

      const result = mapFilmdevRecipeToFormData(recipe, matchedFilm, null);

      expect(result.shootingIso).toBe(800);
      expect(result.pushPull).toBe(1);
    });

    it('should calculate 2 stop push (400 -> 1600)', () => {
      const recipe = createMockFilmdevRecipe({
        film: 'Ilford HP5 Plus',
        developed_at: 1600,
      });

      const matchedFilm = createMockFilm({
        brand: 'Ilford',
        name: 'HP5 Plus',
        isoSpeed: 400,
      });

      const result = mapFilmdevRecipeToFormData(recipe, matchedFilm, null);

      expect(result.shootingIso).toBe(1600);
      expect(result.pushPull).toBe(2);
    });

    it('should calculate 1 stop pull (400 -> 200)', () => {
      const recipe = createMockFilmdevRecipe({
        film: 'Kodak Tri-X 400',
        developed_at: 200,
      });

      const matchedFilm = createMockFilm({
        brand: 'Kodak',
        name: 'Tri-X 400',
        isoSpeed: 400,
      });

      const result = mapFilmdevRecipeToFormData(recipe, matchedFilm, null);

      expect(result.shootingIso).toBe(200);
      expect(result.pushPull).toBe(-1);
    });

    it('should calculate 0 for normal development (no push/pull)', () => {
      const recipe = createMockFilmdevRecipe({
        film: 'Kodak Tri-X 400',
        developed_at: 400,
      });

      const matchedFilm = createMockFilm({
        brand: 'Kodak',
        name: 'Tri-X 400',
        isoSpeed: 400,
      });

      const result = mapFilmdevRecipeToFormData(recipe, matchedFilm, null);

      expect(result.shootingIso).toBe(400);
      expect(result.pushPull).toBe(0);
    });

    it('should extract box speed from film name when no matched film', () => {
      const recipe = createMockFilmdevRecipe({
        film: 'Kentmere Photographic Kentmere 400',
        developed_at: 800,
      });

      // No matched film - should extract 400 from film name
      const result = mapFilmdevRecipeToFormData(recipe, null, null);

      expect(result.shootingIso).toBe(800);
      expect(result.pushPull).toBe(1); // 800/400 = 1 stop push
    });

    it('should handle 3 stop push (100 -> 800)', () => {
      const recipe = createMockFilmdevRecipe({
        film: 'Kodak T-Max 100',
        developed_at: 800,
      });

      const matchedFilm = createMockFilm({
        brand: 'Kodak',
        name: 'T-Max 100',
        isoSpeed: 100,
      });

      const result = mapFilmdevRecipeToFormData(recipe, matchedFilm, null);

      expect(result.shootingIso).toBe(800);
      expect(result.pushPull).toBe(3);
    });
  });

  describe('source URL', () => {
    it('should use recipe_link as sourceUrl when provided', () => {
      const recipe = createMockFilmdevRecipe({
        id: 13339,
        recipe_link: 'https://filmdev.org/recipe/show/13339',
      });

      const result = mapFilmdevRecipeToFormData(recipe, null, null);

      expect(result.sourceUrl).toBe('https://filmdev.org/recipe/show/13339');
    });

    it('should construct sourceUrl from recipe ID if recipe_link is empty', () => {
      const recipe = createMockFilmdevRecipe({
        id: 12345,
        recipe_link: '',
      });

      const result = mapFilmdevRecipeToFormData(recipe, null, null);

      expect(result.sourceUrl).toBe('https://filmdev.org/recipe/show/12345');
    });

    it('should include sourceUrl in filmdev.org recipe 13339 mapping', () => {
      const recipe = createMockFilmdevRecipe({
        id: 13339,
        film: 'Kentmere Photographic Kentmere 400',
        developer: 'Rodinal',
        recipe_link: 'https://filmdev.org/recipe/show/13339',
        developed_at: 800,
      });

      const matchedFilm = createMockFilm({
        uuid: 'kentmere-400',
        brand: 'Kentmere',
        name: 'Pan 400',
        isoSpeed: 400,
      });

      const result = mapFilmdevRecipeToFormData(recipe, matchedFilm, null);

      expect(result.sourceUrl).toBe('https://filmdev.org/recipe/show/13339');
      expect(result.shootingIso).toBe(800);
      expect(result.pushPull).toBe(1);
    });
  });
});
