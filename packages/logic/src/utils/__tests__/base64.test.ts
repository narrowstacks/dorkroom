// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CustomRecipe } from '../../types/custom-recipes';
import { decodeBase64, encodeBase64, fromUrlSafe, toUrlSafe } from '../base64';
import {
  decodeCustomRecipe,
  encodeCustomRecipe,
  MAX_ENCODED_LENGTH,
} from '../recipe-sharing';

const NON_LATIN1_SAMPLES = [
  'Ilford – 1+1',
  '“Stand” dev, don’t agitate',
  'Push it 🎞️📷',
  'Rodinal à 20 °C, café',
];

const recipe: CustomRecipe = {
  id: 'recipe-1',
  name: 'Test Recipe',
  filmId: 'film-1',
  developerId: 'developer-1',
  temperatureF: 68,
  timeMinutes: 8.5,
  shootingIso: 400,
  pushPull: 0,
  agitationSchedule: '',
  notes: '',
  customDilution: '1+1',
  isCustomFilm: false,
  isCustomDeveloper: false,
  isPublic: true,
  dateCreated: '2024-01-01T00:00:00.000Z',
  dateModified: '2024-01-01T00:00:00.000Z',
};

const utf8Length = (text: string): number =>
  new TextEncoder().encode(text).length;

describe('base64 (browser path)', () => {
  it('runs under a DOM with btoa/atob', () => {
    expect(window.btoa).toBeInstanceOf(Function);
    expect(window.atob).toBeInstanceOf(Function);
  });

  it.each(NON_LATIN1_SAMPLES)('round-trips %s', (text) => {
    expect(decodeBase64(fromUrlSafe(toUrlSafe(encodeBase64(text))))).toBe(text);
  });

  it.each(NON_LATIN1_SAMPLES)('matches Node UTF-8 output for %s', (text) => {
    expect(encodeBase64(text)).toBe(
      Buffer.from(text, 'utf8').toString('base64')
    );
  });

  it('keeps ASCII output identical to the old btoa encoding', () => {
    const ascii = '{"name":"HC-110 (B)","notes":"1+31"}';
    expect(encodeBase64(ascii)).toBe(window.btoa(ascii));
  });

  it('decodes old Latin-1 browser links', () => {
    // Before UTF-8 encoding, the browser ran btoa over the raw string, so é
    // and ° went out as single bytes (0xE9, 0xB0), which are not valid UTF-8.
    const legacy = 'Rodinal à 20 °C, café';
    expect(decodeBase64(window.btoa(legacy))).toBe(legacy);
  });
});

describe('recipe sharing with non-Latin-1 text (browser path)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it.each(NON_LATIN1_SAMPLES)('round-trips a recipe named %s', (text) => {
    const encoded = encodeCustomRecipe({ ...recipe, name: text, notes: text });
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);

    const decoded = decodeCustomRecipe(encoded);
    expect(decoded?.name).toBe(text);
    expect(decoded?.notes).toBe(text);
  });

  it('decodes an old-format link containing é', () => {
    const legacyJson = JSON.stringify({
      name: 'Rodinal café',
      filmId: 'film-1',
      developerId: 'developer-1',
      temperatureF: 68,
      timeMinutes: 8.5,
      shootingIso: 400,
      pushPull: 0,
      notes: 'Agitate at 20 °C',
      isCustomFilm: false,
      isCustomDeveloper: false,
      isPublic: true,
      version: 1,
    });
    const legacyLink = toUrlSafe(window.btoa(legacyJson));

    const decoded = decodeCustomRecipe(legacyLink);
    expect(decoded?.name).toBe('Rodinal café');
    expect(decoded?.notes).toBe('Agitate at 20 °C');
  });

  describe('MAX_ENCODED_LENGTH boundary with multi-byte text', () => {
    // Unpadded base64 of n bytes is ceil(4n / 3) chars, so 3000 UTF-8 bytes
    // land exactly on the 4000-char limit and one more byte goes over it.
    const limitBytes = (MAX_ENCODED_LENGTH / 4) * 3;
    const baseBytes = utf8Length(
      decodeBase64(fromUrlSafe(encodeCustomRecipe(recipe)))
    );
    const notesAtLimit = (extra: number): string => {
      const needed = limitBytes - baseBytes + extra;
      const dashes = Math.floor(needed / 3);
      return '–'.repeat(dashes) + 'x'.repeat(needed - dashes * 3);
    };

    it('encodes a payload that is exactly at the limit', () => {
      const notes = notesAtLimit(0);
      const encoded = encodeCustomRecipe({ ...recipe, notes });
      expect(encoded.length).toBe(MAX_ENCODED_LENGTH);
      expect(decodeCustomRecipe(encoded)?.notes).toBe(notes);
    });

    it('rejects a payload one byte over the limit', () => {
      expect(encodeCustomRecipe({ ...recipe, notes: notesAtLimit(1) })).toBe(
        ''
      );
    });

    it('counts multi-byte characters by their UTF-8 size', () => {
      // 1000 emoji are 4000 UTF-8 bytes, well past the 3000-byte budget,
      // even though the string is only 2000 UTF-16 code units.
      expect(encodeCustomRecipe({ ...recipe, notes: '📷'.repeat(1000) })).toBe(
        ''
      );
    });
  });
});

describe('base64 without the Encoding API (legacy bundle)', () => {
  // The Kindle Experimental Browser and the other legacy-bundle targets have
  // no TextEncoder/TextDecoder, and core-js does not polyfill them.
  type Base64Module = typeof import('../base64');
  let legacy: Base64Module;

  const bytesToBase64 = (bytes: number[]): string =>
    Buffer.from(bytes).toString('base64');

  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal('TextEncoder', undefined);
    vi.stubGlobal('TextDecoder', undefined);
    legacy = await import('../base64');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('imports without touching the Encoding API', () => {
    expect(globalThis.TextEncoder).toBeUndefined();
    expect(globalThis.TextDecoder).toBeUndefined();
    expect(legacy.encodeBase64).toBeInstanceOf(Function);
  });

  const SAMPLES = [
    '{"name":"HC-110 (B)","notes":"1+31"}',
    ...NON_LATIN1_SAMPLES,
  ];

  it.each(SAMPLES)('encodes %s exactly like the Encoding API path', (text) => {
    expect(legacy.encodeBase64(text)).toBe(encodeBase64(text));
  });

  it.each(SAMPLES)('round-trips %s', (text) => {
    expect(
      legacy.decodeBase64(fromUrlSafe(toUrlSafe(legacy.encodeBase64(text))))
    ).toBe(text);
  });

  it('encodes lone surrogates as U+FFFD, like TextEncoder', () => {
    const text = 'a\uD800b\uDC00c\uD83D';
    expect(legacy.encodeBase64(text)).toBe(encodeBase64(text));
  });

  it('decodes old Latin-1 browser links', () => {
    const latin1 = 'Rodinal à 20 °C, café';
    expect(legacy.decodeBase64(window.btoa(latin1))).toBe(latin1);
  });

  it.each([
    ['lone continuation byte', [0x41, 0x80, 0x42]],
    ['truncated sequence', [0x41, 0xe2, 0x80]],
    ['overlong encoding', [0xc0, 0xaf]],
    ['overlong three-byte form', [0xe0, 0x80, 0xaf]],
    ['UTF-16 surrogate', [0xed, 0xa0, 0x80]],
    ['code point above U+10FFFF', [0xf4, 0x90, 0x80, 0x80]],
    ['invalid lead byte', [0xff, 0x41]],
  ])(
    'falls back to Latin-1 on invalid UTF-8 (%s), like the Encoding API path',
    (_label, bytes) => {
      const base64 = bytesToBase64(bytes);
      const expected = String.fromCharCode(...bytes);
      expect(legacy.decodeBase64(base64)).toBe(expected);
      expect(decodeBase64(base64)).toBe(expected);
    }
  );

  it('strips a leading byte order mark, like TextDecoder', () => {
    const base64 = bytesToBase64([0xef, 0xbb, 0xbf, 0x68, 0x69]);
    expect(decodeBase64(base64)).toBe('hi');
    expect(legacy.decodeBase64(base64)).toBe('hi');
  });

  it('handles every UTF-8 length boundary like the Encoding API path', () => {
    const text = String.fromCodePoint(
      0x7f,
      0x80,
      0x7ff,
      0x800,
      0xd7ff,
      0xe000,
      0xfffd,
      0xffff,
      0x10000,
      0x10ffff
    );
    const base64 = encodeBase64(text);
    expect(legacy.encodeBase64(text)).toBe(base64);
    expect(legacy.decodeBase64(base64)).toBe(text);
  });
});
