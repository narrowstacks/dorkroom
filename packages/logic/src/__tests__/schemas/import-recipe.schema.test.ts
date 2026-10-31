import { describe, expect, it } from 'vitest';
import { importRecipeSchema } from '../../schemas/import-recipe.schema';
import {
  encodeCustomRecipe,
  MAX_ENCODED_LENGTH,
} from '../../utils/recipe-sharing';

const accepts = (encoded: string) =>
  importRecipeSchema.safeParse({ encoded }).success;

describe('importRecipeSchema', () => {
  it('accepts a filmdev id and a filmdev url', () => {
    expect(accepts('5001')).toBe(true);
    expect(accepts('https://filmdev.org/recipe/show/5001')).toBe(true);
  });

  it('accepts a share code that contains URL-safe base64 "-" and "_"', () => {
    expect(accepts('eyJuYW1lIjoiVGVzdCJ9')).toBe(true);
    expect(accepts('abc-def_ghi')).toBe(true);
  });

  it('accepts the code of a recipe whose text needs multi-byte encoding', () => {
    const code = encodeCustomRecipe({
      id: 'recipe-1',
      name: 'Cafe',
      filmId: 'film',
      developerId: 'dev',
      temperatureF: 68,
      timeMinutes: 7.5,
      shootingIso: 400,
      pushPull: 0,
      isCustomFilm: false,
      isCustomDeveloper: false,
      dateCreated: '2026-01-01T00:00:00.000Z',
      dateModified: '2026-01-01T00:00:00.000Z',
      isPublic: false,
      notes: 'très “bien” – 20° 😀 ???>>>',
    });
    expect(code).toMatch(/[-_]/);
    expect(accepts(code)).toBe(true);
  });

  it('rejects a code longer than the share limit', () => {
    expect(accepts('a'.repeat(MAX_ENCODED_LENGTH))).toBe(true);
    expect(accepts('a'.repeat(MAX_ENCODED_LENGTH + 1))).toBe(false);
  });

  it('rejects empty input and text with spaces or punctuation', () => {
    expect(accepts('')).toBe(false);
    expect(accepts('not a code!')).toBe(false);
  });
});
