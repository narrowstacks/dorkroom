import { describe, expect, it } from 'vitest';
import {
  extractImportRecipeCode,
  importRecipeSchema,
} from '../../schemas/import-recipe.schema';
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

  it('accepts a full Dorkroom share link and a recipe= fragment', () => {
    expect(
      accepts(
        'https://dorkroom.art/development?recipe=abc-def_ghi&source=share'
      )
    ).toBe(true);
    expect(accepts('dorkroom.art/development/?recipe=abc123')).toBe(true);
    expect(accepts('recipe=abc-def_ghi')).toBe(true);
    expect(accepts('?recipe=abc-def_ghi')).toBe(true);
  });

  it('rejects share links without a usable recipe code', () => {
    expect(accepts('https://dorkroom.art/development')).toBe(false);
    expect(accepts('https://dorkroom.art/development?recipe=')).toBe(false);
    expect(accepts('https://dorkroom.art/border?recipe=abc')).toBe(false);
    expect(accepts('recipe=not a code!')).toBe(false);
  });

  it('rejects garbage', () => {
    expect(accepts('zzzz zzzz')).toBe(false);
    expect(accepts('https://example.com/whatever')).toBe(false);
  });

  it('bounds the extracted code before it is decoded', () => {
    const ok = 'a'.repeat(MAX_ENCODED_LENGTH);
    const tooLong = 'a'.repeat(MAX_ENCODED_LENGTH + 1);
    expect(accepts(`https://dorkroom.art/development?recipe=${ok}`)).toBe(true);
    expect(accepts(`https://dorkroom.art/development?recipe=${tooLong}`)).toBe(
      false
    );
    expect(accepts(`recipe=${tooLong}`)).toBe(false);
  });
});

describe('extractImportRecipeCode', () => {
  it('returns the code from a link, a fragment, or the bare input', () => {
    expect(
      extractImportRecipeCode(
        ' https://dorkroom.art/development?recipe=abc_1&source=share '
      )
    ).toBe('abc_1');
    expect(extractImportRecipeCode('recipe=abc_1')).toBe('abc_1');
    expect(extractImportRecipeCode(' abc_1 ')).toBe('abc_1');
  });

  it('leaves filmdev urls and ids untouched', () => {
    const url = 'https://filmdev.org/recipe/show/5001';
    expect(extractImportRecipeCode(url)).toBe(url);
    expect(extractImportRecipeCode('5001')).toBe('5001');
  });
});
