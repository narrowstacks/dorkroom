import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CustomRecipe } from '../../types/custom-recipes';
import {
  createCustomRecipeFromEncoded,
  decodeCustomRecipe,
  encodeCustomRecipe,
  type EncodedCustomRecipe,
  isValidCustomRecipeEncoding,
  MAX_ENCODED_LENGTH,
} from '../recipe-sharing';

/** Encode a payload the way a shared link does: base64, then URL-safe. */
const toUrlSafeBase64 = (payload: string): string =>
  Buffer.from(payload, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** Decode a link, failing the test (rather than silently passing) on null. */
const decodeOrFail = (encoded: string): EncodedCustomRecipe => {
  const decoded = decodeCustomRecipe(encoded);
  expect(decoded).not.toBeNull();
  if (!decoded) throw new Error('decodeCustomRecipe returned null');
  return decoded;
};

describe('recipe-sharing', () => {
  // Suppress expected console.error/warn from debugError/debugWarn in error-path tests
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

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
    dilutionId: '1',
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

    it('round-trips HTML and quote characters in text fields', () => {
      // Encoding is lossless; sanitizing is createCustomRecipeFromEncoded's job.
      const recipeWithSpecialChars: CustomRecipe = {
        ...mockCustomRecipe,
        notes: 'Test with <script>alert("xss")</script> and & symbols',
        agitationSchedule: 'Test "quotes" and \'apostrophes\' ?/+=',
      };

      const encoded = encodeCustomRecipe(recipeWithSpecialChars);
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);

      const decoded = decodeOrFail(encoded);
      expect(decoded.notes).toBe(recipeWithSpecialChars.notes);
      expect(decoded.agitationSchedule).toBe(
        recipeWithSpecialChars.agitationSchedule
      );
    });

    it('returns empty string on encoding failure', () => {
      const stringifySpy = vi
        .spyOn(JSON, 'stringify')
        .mockImplementation(() => {
          throw new Error('Stringify error');
        });

      const encoded = encodeCustomRecipe(mockCustomRecipe);
      expect(encoded).toBe('');

      stringifySpy.mockRestore();
    });
  });

  describe('decodeCustomRecipe', () => {
    it('round-trips a UUID dilution id (#322)', () => {
      const uuid = '69affee4-6a3f-44d2-8ec3-1dc83eca7449';
      const decoded = decodeCustomRecipe(
        encodeCustomRecipe({ ...mockCustomRecipe, dilutionId: uuid })
      );

      expect(decoded?.dilutionId).toBe(uuid);
    });

    it('reads a numeric dilution id from an older link as a string', () => {
      const decoded = decodeCustomRecipe(
        toUrlSafeBase64(JSON.stringify({ ...mockCustomRecipe, dilutionId: 2 }))
      );

      expect(decoded?.dilutionId).toBe('2');
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

      const base64 = toUrlSafeBase64(JSON.stringify(invalidRecipe));

      const decoded = decodeCustomRecipe(base64);
      expect(decoded).toBeNull();
    });

    // Regression for #323: out-of-range numbers used to decode as valid and
    // then throw during render.
    it.each([
      ['temperature above boiling', { temperatureF: 250 }],
      ['temperature below freezing', { temperatureF: 20 }],
      ['zero development time', { timeMinutes: 0 }],
      ['negative development time', { timeMinutes: -3 }],
      ['zero shooting ISO', { shootingIso: 0 }],
      ['push beyond +5 stops', { pushPull: 9 }],
      ['pull beyond -2 stops', { pushPull: -3 }],
    ])('returns null for a recipe with %s', (_label, override) => {
      const outOfRange = {
        name: 'x',
        filmId: 'a',
        developerId: 'b',
        temperatureF: 68,
        timeMinutes: 8,
        shootingIso: 400,
        pushPull: 0,
        isCustomFilm: false,
        isCustomDeveloper: false,
        isPublic: false,
        ...override,
      };
      const encoded = toUrlSafeBase64(JSON.stringify(outOfRange));

      expect(decodeCustomRecipe(encoded)).toBeNull();
      expect(isValidCustomRecipeEncoding(encoded)).toBe(false);
    });

    it('accepts values on the edges of the allowed ranges', () => {
      const edge = {
        name: 'x',
        filmId: 'a',
        developerId: 'b',
        temperatureF: 212,
        timeMinutes: 0.5,
        shootingIso: 400,
        pushPull: 5,
        isCustomFilm: false,
        isCustomDeveloper: false,
        isPublic: false,
      };

      expect(
        decodeCustomRecipe(toUrlSafeBase64(JSON.stringify(edge)))
      ).not.toBeNull();
      expect(
        decodeCustomRecipe(
          toUrlSafeBase64(
            JSON.stringify({ ...edge, temperatureF: 32, pushPull: -2 })
          )
        )
      ).not.toBeNull();
    });

    it('warns about recipes from newer version', () => {
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

      const base64 = toUrlSafeBase64(JSON.stringify(futureRecipe));

      const decoded = decodeCustomRecipe(base64);

      expect(decoded).toBeTruthy();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('newer version')
      );
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

      const base64 = toUrlSafeBase64(JSON.stringify(invalidFilmRecipe));

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

      const base64 = toUrlSafeBase64(JSON.stringify(invalidDeveloperRecipe));

      const decoded = decodeCustomRecipe(base64);
      expect(decoded).toBeNull();
    });
  });

  describe('createCustomRecipeFromEncoded', () => {
    it('creates a recipe from encoded data', () => {
      const decoded = decodeOrFail(encodeCustomRecipe(mockCustomRecipe));
      const recipe = createCustomRecipeFromEncoded(decoded);

      expect(recipe.name).toBe(mockCustomRecipe.name);
      expect(recipe.filmId).toBe(mockCustomRecipe.filmId);
      expect(recipe.developerId).toBe(mockCustomRecipe.developerId);
      expect(recipe.temperatureF).toBe(mockCustomRecipe.temperatureF);
      expect(recipe.timeMinutes).toBe(mockCustomRecipe.timeMinutes);
      expect(recipe.shootingIso).toBe(mockCustomRecipe.shootingIso);
    });

    it('generates temporary IDs for custom film', () => {
      const decoded = decodeOrFail(
        encodeCustomRecipe(mockCustomRecipeWithCustomFilm)
      );
      const recipe = createCustomRecipeFromEncoded(decoded);

      expect(recipe.filmId).toMatch(/^custom_film_\d+$/);
      expect(recipe.isCustomFilm).toBe(true);
      expect(recipe.customFilm).toEqual(
        mockCustomRecipeWithCustomFilm.customFilm
      );
    });

    it('generates temporary IDs for custom developer', () => {
      const decoded = decodeOrFail(
        encodeCustomRecipe(mockCustomRecipeWithCustomDeveloper)
      );
      const recipe = createCustomRecipeFromEncoded(decoded);

      expect(recipe.developerId).toMatch(/^custom_dev_\d+$/);
      expect(recipe.isCustomDeveloper).toBe(true);
      expect(recipe.customDeveloper).toEqual(
        mockCustomRecipeWithCustomDeveloper.customDeveloper
      );
    });

    it('sanitizes text fields to prevent XSS', () => {
      const maliciousRecipe: CustomRecipe = {
        ...mockCustomRecipe,
        name: 'Rodinal <script>alert("xss")</script> 1+50',
        notes: 'Stand <a href="javascript:alert(1)">develop</a> 1 hour',
        agitationSchedule: 'Agitate <img src=x onerror=alert(1)> every 30s',
        customDilution: '1+1 <svg onload=alert(1)>',
      };

      const decoded = decodeOrFail(encodeCustomRecipe(maliciousRecipe));
      const recipe = createCustomRecipeFromEncoded(decoded);

      // Tags are stripped; the recipe-name pass also drops `"` and `+`.
      expect(recipe.name).toBe('Rodinal alert(xss) 150');
      expect(recipe.notes).toBe('Stand develop 1 hour');
      expect(recipe.agitationSchedule).toBe('Agitate  every 30s');
      expect(recipe.customDilution).toBe('1+1');
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
      expect(recipe.name).toBe('Untitled Recipe');
    });

    it('omits id, dateCreated, and dateModified fields', () => {
      const decoded = decodeOrFail(encodeCustomRecipe(mockCustomRecipe));
      const recipe = createCustomRecipeFromEncoded(decoded);

      expect(recipe).not.toHaveProperty('id');
      expect(recipe).not.toHaveProperty('dateCreated');
      expect(recipe).not.toHaveProperty('dateModified');
    });

    it('sanitizes custom film data', () => {
      const maliciousCustomFilm: CustomRecipe = {
        ...mockCustomRecipeWithCustomFilm,
        customFilm: {
          brand: 'Ilford<script>steal()</script>',
          name: 'HP5 <img src=x onerror=alert(1)>Plus',
          isoSpeed: 400,
          colorType: 'bw',
          grainStructure: '<b>Fine</b> grain',
          description: 'Classic onmouseover=alert(1) stock',
        },
      };

      const decoded = decodeOrFail(encodeCustomRecipe(maliciousCustomFilm));
      const recipe = createCustomRecipeFromEncoded(decoded);

      expect(recipe.customFilm).toEqual({
        brand: 'Ilfordsteal()',
        name: 'HP5 Plus',
        isoSpeed: 400,
        colorType: 'bw',
        grainStructure: 'Fine grain',
        description: 'Classic alert(1) stock',
      });
    });

    it('sanitizes custom developer data', () => {
      const maliciousCustomDev: CustomRecipe = {
        ...mockCustomRecipeWithCustomDeveloper,
        customDeveloper: {
          manufacturer: 'Kodak<script>alert(1)</script>',
          name: 'D-76 <img src=x onerror=alert(1)>',
          type: 'powder',
          dilutions: [
            {
              name: '<b>Stock</b>',
              dilution: '1+0 onclick=alert(1)',
            },
          ],
          notes: 'Notes <iframe src="//evil"></iframe>here',
          mixingInstructions: 'Mix at <a href="javascript:void(0)">50C</a>',
          safetyNotes: 'Wear gloves <svg onload=alert(1)>',
          filmOrPaper: 'film',
        },
      };

      const decoded = decodeOrFail(encodeCustomRecipe(maliciousCustomDev));
      const recipe = createCustomRecipeFromEncoded(decoded);

      expect(recipe.customDeveloper).toEqual({
        manufacturer: 'Kodakalert(1)',
        name: 'D-76',
        type: 'powder',
        dilutions: [{ name: 'Stock', dilution: '1+0 alert(1)' }],
        notes: 'Notes here',
        mixingInstructions: 'Mix at 50C',
        safetyNotes: 'Wear gloves',
        filmOrPaper: 'film',
      });
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
      expect(isValidCustomRecipeEncoding(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isValidCustomRecipeEncoding(undefined)).toBe(false);
    });

    it('returns false for base64 that decodes to non-recipe JSON', () => {
      expect(isValidCustomRecipeEncoding(toUrlSafeBase64('123'))).toBe(false);
      expect(isValidCustomRecipeEncoding(toUrlSafeBase64('{}'))).toBe(false);
      expect(isValidCustomRecipeEncoding(toUrlSafeBase64('[]'))).toBe(false);
    });

    it('returns false for string with spaces', () => {
      expect(isValidCustomRecipeEncoding('abc def')).toBe(false);
    });

    it('returns false for valid base64 but invalid recipe data', () => {
      const invalidJson = toUrlSafeBase64('not json');
      expect(isValidCustomRecipeEncoding(invalidJson)).toBe(false);
    });
  });

  describe('round-trip encoding and decoding', () => {
    it('preserves recipe data through encode-decode cycle', () => {
      const decoded = decodeOrFail(encodeCustomRecipe(mockCustomRecipe));

      expect(decoded.name).toBe(mockCustomRecipe.name);
      expect(decoded.filmId).toBe(mockCustomRecipe.filmId);
      expect(decoded.developerId).toBe(mockCustomRecipe.developerId);
      expect(decoded.temperatureF).toBe(mockCustomRecipe.temperatureF);
      expect(decoded.timeMinutes).toBe(mockCustomRecipe.timeMinutes);
      expect(decoded.shootingIso).toBe(mockCustomRecipe.shootingIso);
      expect(decoded.pushPull).toBe(mockCustomRecipe.pushPull);
      expect(decoded.agitationSchedule).toBe(
        mockCustomRecipe.agitationSchedule
      );
      expect(decoded.notes).toBe(mockCustomRecipe.notes);
      expect(decoded.dilutionId).toBe(mockCustomRecipe.dilutionId);
      expect(decoded.customDilution).toBe(mockCustomRecipe.customDilution);
      expect(decoded.isPublic).toBe(mockCustomRecipe.isPublic);
    });

    it('preserves custom film data through encode-decode cycle', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipeWithCustomFilm);
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
      const decoded = decodeOrFail(encoded);

      expect(decoded.isCustomFilm).toBe(true);
      expect(decoded.filmId).toBe(mockCustomRecipeWithCustomFilm.filmId);
      expect(decoded.customFilm).toEqual(
        mockCustomRecipeWithCustomFilm.customFilm
      );
    });

    it('preserves custom developer data through encode-decode cycle', () => {
      const encoded = encodeCustomRecipe(mockCustomRecipeWithCustomDeveloper);
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
      const decoded = decodeOrFail(encoded);

      expect(decoded.isCustomDeveloper).toBe(true);
      expect(decoded.developerId).toBe(
        mockCustomRecipeWithCustomDeveloper.developerId
      );
      expect(decoded.customDeveloper).toEqual(
        mockCustomRecipeWithCustomDeveloper.customDeveloper
      );
    });
  });

  describe('URL length limits', () => {
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

    // Size the notes so the payload encodes to exactly MAX_ENCODED_LENGTH:
    // unpadded base64 is 4 chars per 3 bytes, so the limit holds
    // MAX_ENCODED_LENGTH * 3 / 4 bytes of JSON. Subtract the JSON size of the
    // same recipe with empty notes (each ASCII notes char adds one byte).
    const notesLengthAtLimit = () => {
      expect(MAX_ENCODED_LENGTH % 4).toBe(0);
      const emptyNotes = encodeCustomRecipe({ ...mockCustomRecipe, notes: '' });
      expect(emptyNotes).not.toBe('');
      const baseJsonBytes = Buffer.from(emptyNotes, 'base64url').length;
      return (MAX_ENCODED_LENGTH * 3) / 4 - baseJsonBytes;
    };

    it('should encode a recipe that lands exactly on the limit', () => {
      const atLimit = encodeCustomRecipe({
        ...mockCustomRecipe,
        notes: 'x'.repeat(notesLengthAtLimit()),
      });

      expect(atLimit).toHaveLength(MAX_ENCODED_LENGTH);
    });

    it('should reject a recipe one character over the limit', () => {
      const overLimit = encodeCustomRecipe({
        ...mockCustomRecipe,
        notes: 'x'.repeat(notesLengthAtLimit() + 1),
      });

      expect(overLimit).toBe('');
    });
  });
});
