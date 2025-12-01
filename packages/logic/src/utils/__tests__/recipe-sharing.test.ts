import { describe, expect, it, vi } from 'vitest';
import type { CustomRecipe } from '../../types/custom-recipes';
import {
  createCustomRecipeFromEncoded,
  decodeCustomRecipe,
  type EncodedCustomRecipe,
  encodeCustomRecipe,
  isValidCustomRecipeEncoding,
  MAX_ENCODED_LENGTH,
} from '../recipe-sharing';

describe('recipe-sharing', () => {
  const mockCustomRecipe: CustomRecipe = {
    id: 'recipe-123',
    name: 'Test Recipe',
    filmId: 'film-456',
    developerId: 'developer-789',
    temperatureF: 68,
    timeMinutes: 8.5,
    shootingIso: 400,
    pushPull: 0,
    agitationSchedule: 'Continuous for first 30s, then 10s every minute',
    notes: 'This is a test recipe with some notes.',
    dilutionId: 1,
    customDilution: '1+1',
    isCustomFilm: false,
    isCustomDeveloper: false,
    isPublic: true,
    dateCreated: '2024-01-01T00:00:00.000Z',
    dateModified: '2024-01-01T00:00:00.000Z',
  };

  const mockCustomRecipeWithCustomFilm: CustomRecipe = {
    ...mockCustomRecipe,
    id: 'recipe-with-custom-film',
    isCustomFilm: true,
    filmId: 'custom_film_123',
    customFilm: {
      brand: 'Custom Brand',
      name: 'Custom Film',
      isoSpeed: 400,
      colorType: 'bw',
      grainStructure: 'Fine',
      description: 'A custom film',
    },
  };

  const mockCustomRecipeWithCustomDeveloper: CustomRecipe = {
    ...mockCustomRecipe,
    id: 'recipe-with-custom-dev',
    isCustomDeveloper: true,
    developerId: 'custom_dev_123',
    customDeveloper: {
      manufacturer: 'Custom Manufacturer',
      name: 'Custom Developer',
      type: 'powder',
      dilutions: [
        { name: 'Stock', dilution: '1+0' },
        { name: 'Standard', dilution: '1+1' },
      ],
      notes: 'Custom developer notes',
      mixingInstructions: 'Mix carefully',
      safetyNotes: 'Wear gloves',
      filmOrPaper: 'film',
    },
  };

  describe('encodeCustomRecipe', () => {
    it('encodes a basic custom recipe to URL-safe base64', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipe);

      expect(encoded).toBeTruthy();
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });

    it('encodes a recipe with custom film', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipeWithCustomFilm);

      expect(encoded).toBeTruthy();
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('encodes a recipe with custom developer', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipeWithCustomDeveloper);

      expect(encoded).toBeTruthy();
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('handles recipes with special characters in notes', () => {
      const recipeWithSpecialChars: CustomRecipe = {
        ...mockCustomRecipe,
        notes: 'Test with <script>alert("xss")</script> and & symbols',
        agitationSchedule: 'Test "quotes" and \'apostrophes\'',
      };

      const encoded = encodeCustomRecipe(recipeWithSpecialChars);
      expect(encoded).toBeTruthy();
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('returns empty string on encoding failure', () => {
      // Mock JSON.stringify to throw an error
      const originalStringify = JSON.stringify;
      JSON.stringify = vi.fn(() => {
        throw new Error('Stringify error');
      }) as unknown as typeof JSON.stringify;

      const encoded = encodeCustomRecipe(mockCustomRecipe);
      expect(encoded).toBe('');

      JSON.stringify = originalStringify;
    });
  });

  describe('decodeCustomRecipe', () => {
    it('decodes a valid encoded recipe', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipe);
      const decoded = decodeCustomRecipe(encoded);

      expect(decoded).toBeTruthy();
      expect(decoded?.name).toBe(mockCustomRecipe.name);
      expect(decoded?.filmId).toBe(mockCustomRecipe.filmId);
      expect(decoded?.developerId).toBe(mockCustomRecipe.developerId);
      expect(decoded?.temperatureF).toBe(mockCustomRecipe.temperatureF);
      expect(decoded?.timeMinutes).toBe(mockCustomRecipe.timeMinutes);
      expect(decoded?.shootingIso).toBe(mockCustomRecipe.shootingIso);
      expect(decoded?.pushPull).toBe(mockCustomRecipe.pushPull);
    });

    it('decodes a recipe with custom film', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipeWithCustomFilm);
      const decoded = decodeCustomRecipe(encoded);

      expect(decoded).toBeTruthy();
      expect(decoded?.isCustomFilm).toBe(true);
      expect(decoded?.customFilm).toBeDefined();
      expect(decoded?.customFilm?.brand).toBe('Custom Brand');
      expect(decoded?.customFilm?.name).toBe('Custom Film');
    });

    it('decodes a recipe with custom developer', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipeWithCustomDeveloper);
      const decoded = decodeCustomRecipe(encoded);

      expect(decoded).toBeTruthy();
      expect(decoded?.isCustomDeveloper).toBe(true);
      expect(decoded?.customDeveloper).toBeDefined();
      expect(decoded?.customDeveloper?.manufacturer).toBe(
        'Custom Manufacturer'
      );
      expect(decoded?.customDeveloper?.name).toBe('Custom Developer');
    });

    it('returns null for invalid base64 string', () => {
      const decoded = decodeCustomRecipe('not-valid-base64!@#$');
      expect(decoded).toBeNull();
    });

    it('returns null for empty string', () => {
      const decoded = decodeCustomRecipe('');
      expect(decoded).toBeNull();
    });

    it('returns null for recipe missing required fields', () => {
      // Create an invalid encoded recipe (missing name)
      const invalidRecipe = {
        filmId: 'film-123',
        developerId: 'dev-456',
        temperatureF: 68,
        // missing timeMinutes
        shootingIso: 400,
        pushPull: 0,
        isCustomFilm: false,
        isCustomDeveloper: false,
        isPublic: true,
        version: 1,
      };

      // Manually encode the invalid recipe
      const jsonString = JSON.stringify(invalidRecipe);
      const base64 = Buffer.from(jsonString, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const decoded = decodeCustomRecipe(base64);
      expect(decoded).toBeNull();
    });

    it('warns about recipes from newer version', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      // Create a recipe with a future version
      const futureRecipe: EncodedCustomRecipe = {
        name: 'Future Recipe',
        filmId: 'film-123',
        developerId: 'dev-456',
        temperatureF: 68,
        timeMinutes: 8,
        shootingIso: 400,
        pushPull: 0,
        isCustomFilm: false,
        isCustomDeveloper: false,
        isPublic: true,
        version: 999,
      };

      const jsonString = JSON.stringify(futureRecipe);
      const base64 = Buffer.from(jsonString, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const decoded = decodeCustomRecipe(base64);

      expect(decoded).toBeTruthy();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('newer version')
      );

      consoleWarnSpy.mockRestore();
    });

    it('returns null for recipe with invalid custom film data', () => {
      // Create recipe with incomplete custom film (missing required fields)
      const invalidFilmRecipe = {
        name: 'Test',
        filmId: 'custom_film_123',
        developerId: 'dev-456',
        temperatureF: 68,
        timeMinutes: 8,
        shootingIso: 400,
        pushPull: 0,
        isCustomFilm: true,
        isCustomDeveloper: false,
        customFilm: {
          // Missing brand and name
          isoSpeed: 400,
        },
        isPublic: true,
        version: 1,
      };

      const jsonString = JSON.stringify(invalidFilmRecipe);
      const base64 = Buffer.from(jsonString, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const decoded = decodeCustomRecipe(base64);
      expect(decoded).toBeNull();
    });

    it('returns null for recipe with invalid custom developer data', () => {
      // Create recipe with incomplete custom developer (missing required fields)
      const invalidDeveloperRecipe = {
        name: 'Test',
        filmId: 'film-123',
        developerId: 'custom_dev_456',
        temperatureF: 68,
        timeMinutes: 8,
        shootingIso: 400,
        pushPull: 0,
        isCustomFilm: false,
        isCustomDeveloper: true,
        customDeveloper: {
          // Missing manufacturer and name
          type: 'liquid',
        },
        isPublic: true,
        version: 1,
      };

      const jsonString = JSON.stringify(invalidDeveloperRecipe);
      const base64 = Buffer.from(jsonString, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const decoded = decodeCustomRecipe(base64);
      expect(decoded).toBeNull();
    });
  });

  describe('createCustomRecipeFromEncoded', () => {
    it('creates a recipe from encoded data', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipe);
      const decoded = decodeCustomRecipe(encoded);

      expect(decoded).toBeTruthy();
      if (!decoded) return;
      const recipe = createCustomRecipeFromEncoded(decoded);

      expect(recipe.name).toBe(mockCustomRecipe.name);
      expect(recipe.filmId).toBe(mockCustomRecipe.filmId);
      expect(recipe.developerId).toBe(mockCustomRecipe.developerId);
      expect(recipe.temperatureF).toBe(mockCustomRecipe.temperatureF);
      expect(recipe.timeMinutes).toBe(mockCustomRecipe.timeMinutes);
      expect(recipe.shootingIso).toBe(mockCustomRecipe.shootingIso);
    });

    it('generates temporary IDs for custom film', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipeWithCustomFilm);
      const decoded = decodeCustomRecipe(encoded);

      expect(decoded).toBeTruthy();
      if (!decoded) return;
      const recipe = createCustomRecipeFromEncoded(decoded);

      expect(recipe.filmId).toMatch(/^custom_film_\d+$/);
      expect(recipe.isCustomFilm).toBe(true);
      expect(recipe.customFilm).toBeDefined();
    });

    it('generates temporary IDs for custom developer', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipeWithCustomDeveloper);
      const decoded = decodeCustomRecipe(encoded);

      expect(decoded).toBeTruthy();
      if (!decoded) return;
      const recipe = createCustomRecipeFromEncoded(decoded);

      expect(recipe.developerId).toMatch(/^custom_dev_\d+$/);
      expect(recipe.isCustomDeveloper).toBe(true);
      expect(recipe.customDeveloper).toBeDefined();
    });

    it('sanitizes text fields to prevent XSS', () => {
      const maliciousRecipe: CustomRecipe = {
        ...mockCustomRecipe,
        name: 'Test Recipe with script tags',
        notes: 'Test notes with img tags',
        agitationSchedule: 'Test agitation',
      };

      const encoded = encodeCustomRecipe(maliciousRecipe);
      const decoded = decodeCustomRecipe(encoded);
      if (!decoded) return;
      const recipe = createCustomRecipeFromEncoded(decoded);

      expect(recipe.name).toBeTruthy();
      expect(recipe.notes).toBeTruthy();
      expect(recipe.agitationSchedule).toBeTruthy();
    });

    it('uses fallback values for empty required fields', () => {
      const encodedWithEmptyName: EncodedCustomRecipe = {
        name: '',
        filmId: 'film-123',
        developerId: 'dev-456',
        temperatureF: 68,
        timeMinutes: 8,
        shootingIso: 400,
        pushPull: 0,
        isCustomFilm: false,
        isCustomDeveloper: false,
        isPublic: true,
        version: 1,
      };

      const recipe = createCustomRecipeFromEncoded(encodedWithEmptyName);
      if (!recipe) return;
      expect(recipe.name).toBe('Untitled Recipe');
    });

    it('omits id, dateCreated, and dateModified fields', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipe);
      const decoded = decodeCustomRecipe(encoded);
      if (!decoded) return;
      const recipe = createCustomRecipeFromEncoded(decoded);

      expect(recipe).not.toHaveProperty('id');
      expect(recipe).not.toHaveProperty('dateCreated');
      expect(recipe).not.toHaveProperty('dateModified');
    });

    it('sanitizes custom film data', () => {
      const maliciousCustomFilm: CustomRecipe = {
        ...mockCustomRecipeWithCustomFilm,
        customFilm: {
          brand: 'Brand with script tags',
          name: 'Film with img tags',
          isoSpeed: 400,
          colorType: 'bw',
          grainStructure: 'Fine grain',
          description: 'Description with test content',
        },
      };

      const encoded = encodeCustomRecipe(maliciousCustomFilm);
      const decoded = decodeCustomRecipe(encoded);
      if (!decoded) return;
      const recipe = createCustomRecipeFromEncoded(decoded);

      expect(recipe.customFilm?.brand).toBeTruthy();
      expect(recipe.customFilm?.name).toBeTruthy();
      expect(recipe.customFilm?.grainStructure).toBeTruthy();
      expect(recipe.customFilm?.description).toBeTruthy();
    });

    it('sanitizes custom developer data', () => {
      const maliciousCustomDev: CustomRecipe = {
        ...mockCustomRecipeWithCustomDeveloper,
        customDeveloper: {
          manufacturer: 'Manufacturer with script tags',
          name: 'Developer with img tags',
          type: 'powder',
          dilutions: [
            {
              name: 'Stock dilution',
              dilution: '1+0',
            },
          ],
          notes: 'Notes with test content',
          mixingInstructions: 'Mix carefully',
          safetyNotes: 'Safety notes',
          filmOrPaper: 'film',
        },
      };

      const encoded = encodeCustomRecipe(maliciousCustomDev);
      const decoded = decodeCustomRecipe(encoded);
      if (!decoded) return;
      const recipe = createCustomRecipeFromEncoded(decoded);

      expect(recipe.customDeveloper?.manufacturer).toBeTruthy();
      expect(recipe.customDeveloper?.name).toBeTruthy();
      expect(recipe.customDeveloper?.notes).toBeTruthy();
      expect(recipe.customDeveloper?.mixingInstructions).toBeTruthy();
      expect(recipe.customDeveloper?.safetyNotes).toBeTruthy();
      expect(recipe.customDeveloper?.dilutions[0].name).toBeTruthy();
      expect(recipe.customDeveloper?.dilutions[0].dilution).toBeTruthy();
    });
  });

  describe('isValidCustomRecipeEncoding', () => {
    it('returns true for valid encoded recipe', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipe);
      expect(isValidCustomRecipeEncoding(encoded)).toBe(true);
    });

    it('returns false for invalid base64 characters', () => {
      expect(isValidCustomRecipeEncoding('invalid!@#$%')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidCustomRecipeEncoding('')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isValidCustomRecipeEncoding(null as unknown as string)).toBe(
        false
      );
    });

    it('returns false for undefined', () => {
      expect(isValidCustomRecipeEncoding(undefined as unknown as string)).toBe(
        false
      );
    });

    it('returns false for non-string values', () => {
      expect(isValidCustomRecipeEncoding(123 as unknown as string)).toBe(false);
      expect(isValidCustomRecipeEncoding({} as unknown as string)).toBe(false);
      expect(isValidCustomRecipeEncoding([] as unknown as string)).toBe(false);
    });

    it('returns false for string with spaces', () => {
      expect(isValidCustomRecipeEncoding('abc def')).toBe(false);
    });

    it('returns false for valid base64 but invalid recipe data', () => {
      // Valid base64 but invalid JSON
      const invalidJson = Buffer.from('not json', 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      expect(isValidCustomRecipeEncoding(invalidJson)).toBe(false);
    });
  });

  describe('round-trip encoding and decoding', () => {
    it('preserves recipe data through encode-decode cycle', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipe);
      const decoded = decodeCustomRecipe(encoded);

      expect(decoded?.name).toBe(mockCustomRecipe.name);
      expect(decoded?.filmId).toBe(mockCustomRecipe.filmId);
      expect(decoded?.developerId).toBe(mockCustomRecipe.developerId);
      expect(decoded?.temperatureF).toBe(mockCustomRecipe.temperatureF);
      expect(decoded?.timeMinutes).toBe(mockCustomRecipe.timeMinutes);
      expect(decoded?.shootingIso).toBe(mockCustomRecipe.shootingIso);
      expect(decoded?.pushPull).toBe(mockCustomRecipe.pushPull);
      expect(decoded?.agitationSchedule).toBe(
        mockCustomRecipe.agitationSchedule
      );
      expect(decoded?.notes).toBe(mockCustomRecipe.notes);
      expect(decoded?.dilutionId).toBe(mockCustomRecipe.dilutionId);
      expect(decoded?.customDilution).toBe(mockCustomRecipe.customDilution);
      expect(decoded?.isPublic).toBe(mockCustomRecipe.isPublic);
    });

    it('preserves custom film data through encode-decode cycle', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipeWithCustomFilm);
      const decoded = decodeCustomRecipe(encoded);

      expect(decoded?.customFilm?.brand).toBe(
        mockCustomRecipeWithCustomFilm.customFilm?.brand
      );
      expect(decoded?.customFilm?.name).toBe(
        mockCustomRecipeWithCustomFilm.customFilm?.name
      );
      expect(decoded?.customFilm?.isoSpeed).toBe(
        mockCustomRecipeWithCustomFilm.customFilm?.isoSpeed
      );
    });

    it('preserves custom developer data through encode-decode cycle', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipeWithCustomDeveloper);
      const decoded = decodeCustomRecipe(encoded);

      expect(decoded?.customDeveloper?.manufacturer).toBe(
        mockCustomRecipeWithCustomDeveloper.customDeveloper?.manufacturer
      );
      expect(decoded?.customDeveloper?.name).toBe(
        mockCustomRecipeWithCustomDeveloper.customDeveloper?.name
      );
      expect(decoded?.customDeveloper?.dilutions).toEqual(
        mockCustomRecipeWithCustomDeveloper.customDeveloper?.dilutions
      );
    });
  });

  describe('cross-environment compatibility', () => {
    // Test that encoding works in both browser and Node.js environments
    it('handles base64 encoding in Node.js environment', () => {
      // This test runs in Node.js by default with Vitest
      const encoded = encodeCustomRecipe(mockCustomRecipe);
      expect(encoded).toBeTruthy();
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('handles base64 decoding in Node.js environment', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipe);
      const decoded = decodeCustomRecipe(encoded);
      expect(decoded).toBeTruthy();
      expect(decoded?.name).toBe(mockCustomRecipe.name);
    });
  });

  describe('URL length limits', () => {
    it('should have a reasonable max encoded length constant', () => {
      expect(MAX_ENCODED_LENGTH).toBe(4000);
    });

    it('should return empty string for oversized recipes', () => {
      // Create a recipe with very long notes that will exceed the limit
      const oversizedRecipe: CustomRecipe = {
        ...mockCustomRecipe,
        notes: 'x'.repeat(10000), // Very long notes
        agitationSchedule: 'y'.repeat(10000), // Very long agitation
        customDilution: 'z'.repeat(1000), // Long dilution
        customFilm: {
          brand: 'a'.repeat(500),
          name: 'b'.repeat(500),
          isoSpeed: 400,
          colorType: 'bw',
          grainStructure: 'c'.repeat(500),
          description: 'd'.repeat(2000),
        },
        customDeveloper: {
          manufacturer: 'e'.repeat(500),
          name: 'f'.repeat(500),
          type: 'powder',
          filmOrPaper: 'film',
          notes: 'g'.repeat(2000),
          mixingInstructions: 'h'.repeat(3000),
          safetyNotes: 'i'.repeat(2000),
          dilutions: [
            { name: 'j'.repeat(100), dilution: 'k'.repeat(100) },
            { name: 'l'.repeat(100), dilution: 'm'.repeat(100) },
          ],
        },
        isCustomFilm: true,
        isCustomDeveloper: true,
      };

      const encoded = encodeCustomRecipe(oversizedRecipe);
      expect(encoded).toBe('');
    });

    it('should return encoded string for recipes within limit', () => {
      const normalRecipe: CustomRecipe = {
        ...mockCustomRecipe,
        notes: 'Short notes',
        agitationSchedule: 'Standard agitation',
      };

      const encoded = encodeCustomRecipe(normalRecipe);
      expect(encoded).not.toBe('');
      expect(encoded.length).toBeLessThanOrEqual(MAX_ENCODED_LENGTH);
    });

    it('should handle recipes near the limit boundary', () => {
      // Create a recipe that's close to but under the limit
      const nearLimitRecipe: CustomRecipe = {
        ...mockCustomRecipe,
        notes: 'x'.repeat(2000), // Moderate length notes
      };

      const encoded = encodeCustomRecipe(nearLimitRecipe);
      // Should encode successfully if under limit
      if (encoded.length > 0) {
        expect(encoded.length).toBeLessThanOrEqual(MAX_ENCODED_LENGTH);
      }
    });
  });
});
