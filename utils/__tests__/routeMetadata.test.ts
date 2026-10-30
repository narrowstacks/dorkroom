import {
  ASPECT_RATIOS,
  BORDER_CALCULATOR_DEFAULTS,
  type BorderPresetSettings,
  encodePreset,
  PAPER_SIZES,
} from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import {
  BASE_URL,
  buildFilmFilterParts,
  decodeBorderPreset,
  getRouteMetadata,
  isKnownRoutePath,
  prettifySlug,
  ROUTE_DESCRIPTIONS,
  ROUTE_TITLES,
  SITE_NAME,
} from '../routeMetadata';

describe('routeMetadata constants', () => {
  it('exports expected SITE_NAME', () => {
    expect(SITE_NAME).toBe('Dorkroom');
  });

  it('exports expected BASE_URL', () => {
    expect(BASE_URL).toBe('https://dorkroom.art');
  });

  it('has matching keys in ROUTE_TITLES and ROUTE_DESCRIPTIONS', () => {
    expect(Object.keys(ROUTE_TITLES).sort()).toEqual(
      Object.keys(ROUTE_DESCRIPTIONS).sort()
    );
  });
});

describe('prettifySlug', () => {
  it('capitalizes hyphenated words', () => {
    expect(prettifySlug('kodak-tri-x-400')).toBe('Kodak Tri X 400');
  });

  it('handles single word', () => {
    expect(prettifySlug('rodinal')).toBe('Rodinal');
  });

  it('handles brand-name-number patterns', () => {
    expect(prettifySlug('ilford-hp5-plus')).toBe('Ilford Hp5 Plus');
  });

  it('handles long slugs', () => {
    expect(prettifySlug('cinestill-bwxx-double-x')).toBe(
      'Cinestill Bwxx Double X'
    );
  });
});

describe('getRouteMetadata', () => {
  it('returns home metadata for /', () => {
    const meta = getRouteMetadata('/');
    expect(meta.title).toBe('Dorkroom - Photography Calculators and Resources');
    expect(meta.description).toContain('Film photography calculators');
    expect(meta.url).toBe('https://dorkroom.art');
    expect(meta.ogImageUrl).toContain('route=%2F');
  });

  it('returns correct metadata for /border', () => {
    const meta = getRouteMetadata('/border');
    expect(meta.title).toBe('Border Calculator | Dorkroom');
    expect(meta.description).toContain('easel blades');
    expect(meta.url).toBe('https://dorkroom.art/border');
  });

  it('normalizes trailing slashes', () => {
    const withSlash = getRouteMetadata('/border/');
    const without = getRouteMetadata('/border');
    expect(withSlash).toEqual(without);
  });

  it('normalizes multiple trailing slashes', () => {
    const multi = getRouteMetadata('/stops///');
    const clean = getRouteMetadata('/stops');
    expect(multi).toEqual(clean);
  });

  it('returns fallback metadata for unknown routes', () => {
    const meta = getRouteMetadata('/nonexistent-page');
    expect(meta.title).toBe('Dorkroom');
    expect(meta.description).toBe(
      'Film photography calculators and resources for analog photographers.'
    );
  });

  it('returns all known routes with proper format', () => {
    for (const route of Object.keys(ROUTE_TITLES)) {
      const meta = getRouteMetadata(route);
      expect(meta.title).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(meta.url).toMatch(/^https:\/\/dorkroom\.art/);
      expect(meta.ogImageUrl).toMatch(
        /^https:\/\/dorkroom\.art\/api\/og\?route=/
      );
    }
  });
});

describe('getRouteMetadata with query params', () => {
  it('generates dynamic title for /films with film slug', () => {
    const meta = getRouteMetadata('/films', { film: 'adox-chs-100-ii' });
    expect(meta.title).toBe('Adox Chs 100 Ii | Dorkroom');
    expect(meta.description).toContain('Adox Chs 100 Ii');
    expect(meta.url).toContain('film=adox-chs-100-ii');
    expect(meta.ogImageUrl).toContain('film=adox-chs-100-ii');
  });

  it('generates dynamic title for /development with film only', () => {
    const meta = getRouteMetadata('/development', {
      film: 'kodak-tri-x-400',
    });
    expect(meta.title).toBe('Kodak Tri X 400 Recipes | Dorkroom');
    expect(meta.description).toContain('Kodak Tri X 400');
  });

  it('generates dynamic title for /development with film and developer', () => {
    const meta = getRouteMetadata('/development', {
      film: 'kodak-tri-x-400',
      developer: 'ilford-perceptol',
    });
    expect(meta.title).toBe('Kodak Tri X 400 in Ilford Perceptol | Dorkroom');
    expect(meta.description).toContain('Kodak Tri X 400');
    expect(meta.description).toContain('Ilford Perceptol');
  });

  it('includes recipe UUID in OG image URL', () => {
    const meta = getRouteMetadata('/development', {
      film: 'kodak-tri-x-400',
      developer: 'ilford-perceptol',
      recipe: 'ece4fc48-24ba-4e16-813b-334e6e76a9b6',
    });
    expect(meta.ogImageUrl).toContain(
      'recipe=ece4fc48-24ba-4e16-813b-334e6e76a9b6'
    );
  });

  it('falls back to static metadata for /development without film', () => {
    const meta = getRouteMetadata('/development');
    expect(meta.title).toBe('Development Recipes | Dorkroom');
    expect(meta.description).toContain('Browse film and developer');
  });

  it('falls back to static metadata for /films without film slug', () => {
    const meta = getRouteMetadata('/films');
    expect(meta.title).toBe('Film Database | Dorkroom');
  });

  it('ignores query params on non-dynamic routes', () => {
    const meta = getRouteMetadata('/border', { film: 'anything' });
    expect(meta.title).toBe('Border Calculator | Dorkroom');
  });
});

describe('filter params inherited from Object.prototype', () => {
  // `?color=constructor` once satisfied a `value in COLOR_LABELS` membership
  // test, so the label became the Object constructor and formatting it threw
  // a TypeError out of this endpoint. Every filter lookup is own-key only now.
  const inherited = ['constructor', 'toString', '__proto__', 'hasOwnProperty'];

  it.each(inherited)('treats color=%s as absent', (color) => {
    expect(buildFilmFilterParts({ color })).toBeNull();
  });

  it.each(inherited)('treats status=%s as absent', (status) => {
    expect(buildFilmFilterParts({ status })).toBeNull();
  });

  it.each(inherited)('does not resolve %s as a route', (pathname) => {
    expect(getRouteMetadata(pathname).title).toBe(SITE_NAME);
  });

  it('still resolves real filter values', () => {
    expect(buildFilmFilterParts({ color: 'bw' })?.title).toBe(
      'Black & White Films'
    );
    expect(buildFilmFilterParts({ status: 'discontinued' })?.title).toBe(
      'Discontinued Film Stocks'
    );
  });
});

describe('isKnownRoutePath', () => {
  it('accepts every static route, with or without trailing slashes', () => {
    for (const route of Object.keys(ROUTE_TITLES)) {
      expect(isKnownRoutePath(route)).toBe(true);
      expect(isKnownRoutePath(`${route}/`)).toBe(true);
    }
  });

  it('rejects unknown paths and Object.prototype keys', () => {
    expect(isKnownRoutePath('/nonexistent-page')).toBe(false);
    expect(isKnownRoutePath('/constructor')).toBe(false);
  });
});

// ---- Border preset decoding (parity with @dorkroom/logic encodePreset) ----

/** Base64url-encode a raw preset payload, the way share links carry it. */
function toPresetParam(raw: string): string {
  return Buffer.from(raw, 'utf8').toString('base64url');
}

function presetSettings(
  overrides: Partial<BorderPresetSettings>
): BorderPresetSettings {
  return {
    ...BORDER_CALCULATOR_DEFAULTS,
    hasManuallyFlippedPaper: false,
    isLandscape: false,
    isRatioFlipped: false,
    ...overrides,
  };
}

interface PresetCase {
  label: string;
  name: string;
  settings: Partial<BorderPresetSettings>;
  expected: {
    paperLabel: string;
    aspectLabel: string;
    printW: string;
    printH: string;
  };
}

const PRESET_CASES: PresetCase[] = [
  {
    label: 'standard paper and ratio',
    name: 'Standard',
    settings: { aspectRatio: '3:2', paperSize: '8x10', minBorder: 0.5 },
    expected: {
      paperLabel: '8×10',
      aspectLabel: '35mm',
      printW: '4.7',
      printH: '7',
    },
  },
  {
    label: 'landscape paper',
    name: 'Landscape',
    settings: {
      aspectRatio: '3:2',
      paperSize: '8x10',
      minBorder: 0.5,
      isLandscape: true,
    },
    expected: {
      paperLabel: '8×10',
      aspectLabel: '35mm',
      printW: '6',
      printH: '9',
    },
  },
  {
    label: 'ratio flipped',
    name: 'Flipped',
    settings: {
      aspectRatio: '3:2',
      paperSize: '8x10',
      minBorder: 0.5,
      isRatioFlipped: true,
    },
    expected: {
      paperLabel: '8×10',
      aspectLabel: '35mm',
      printW: '6',
      printH: '9',
    },
  },
  {
    label: 'even borders',
    name: 'Even',
    settings: { aspectRatio: 'even-borders', paperSize: '11x14', minBorder: 1 },
    expected: {
      paperLabel: '11×14',
      aspectLabel: 'Even borders',
      printW: '9',
      printH: '11.5',
    },
  },
  {
    label: 'custom paper',
    name: 'Custom paper',
    settings: {
      aspectRatio: '5:4',
      paperSize: 'custom',
      customPaperWidth: 9.5,
      customPaperHeight: 12,
      minBorder: 0.25,
    },
    expected: {
      paperLabel: '9½×12',
      aspectLabel: '4×5',
      printW: '7.2',
      printH: '9',
    },
  },
  {
    label: 'custom aspect ratio',
    name: 'Custom aspect',
    settings: {
      aspectRatio: 'custom',
      customAspectWidth: 3.5,
      customAspectHeight: 1,
      paperSize: '8x10',
      minBorder: 1,
    },
    expected: {
      paperLabel: '8×10',
      aspectLabel: 'Custom',
      printW: '1.7',
      printH: '6',
    },
  },
  {
    label: 'custom aspect ratio on custom landscape paper',
    name: 'Both custom',
    settings: {
      aspectRatio: 'custom',
      customAspectWidth: 2,
      customAspectHeight: 1,
      paperSize: 'custom',
      customPaperWidth: 6,
      customPaperHeight: 9,
      minBorder: 0.5,
      isLandscape: true,
    },
    expected: {
      paperLabel: '6×9',
      aspectLabel: 'Custom',
      printW: '4',
      printH: '8',
    },
  },
  {
    label: 'negative offsets',
    name: 'Offset',
    settings: {
      aspectRatio: '3:2',
      paperSize: '8x10',
      minBorder: 0.5,
      enableOffset: true,
      horizontalOffset: -0.5,
      verticalOffset: -1.25,
      isLandscape: true,
    },
    expected: {
      paperLabel: '8×10',
      aspectLabel: '35mm',
      printW: '6',
      printH: '9',
    },
  },
  {
    label: 'name with delimiter, hyphens and unicode',
    name: 'A|B - C--D 100% 日本 ✓ é',
    settings: { aspectRatio: '1:1', paperSize: '16x20', minBorder: 1 },
    expected: {
      paperLabel: '16×20',
      aspectLabel: 'Square',
      printW: '14',
      printH: '14',
    },
  },
];

describe('decodeBorderPreset parity with encodePreset (v2)', () => {
  it.each(PRESET_CASES)('decodes $label', ({ name, settings, expected }) => {
    const encoded = encodePreset({ name, settings: presetSettings(settings) });
    expect(encoded).not.toBe('');
    expect(decodeBorderPreset(encoded)).toEqual({ name, ...expected });
  });

  it('decodes every aspect ratio and paper size the app can encode', () => {
    for (const ratio of ASPECT_RATIOS) {
      for (const paper of PAPER_SIZES) {
        const encoded = encodePreset({
          name: `${ratio.value} on ${paper.value}`,
          settings: presetSettings({
            aspectRatio: ratio.value,
            paperSize: paper.value,
          }),
        });
        expect(
          decodeBorderPreset(encoded),
          `${ratio.value} on ${paper.value}`
        ).not.toBeNull();
      }
    }
  });

  it('decodes the share link from issue #430', () => {
    // 2|Flipped|0|6|50|0|0|69|1100|1700 — custom 11×17 portrait paper.
    // Mask 69 = 64 | 4 | 1: bit 64 (PR #429's manual paper flip) is set and
    // must be ignored; landscape (8) and ratio flip (16) are not.
    expect(
      decodeBorderPreset('MnxGbGlwcGVkfDB8Nnw1MHwwfDB8Njl8MTEwMHwxNzAw')
    ).toEqual({
      name: 'Flipped',
      paperLabel: '11×17',
      aspectLabel: '35mm',
      printW: '6.7',
      printH: '10',
    });
  });

  it('ignores bitmask bits it does not read (e.g. bit 64)', () => {
    // 72 = 64 | 8 (landscape)
    expect(decodeBorderPreset(toPresetParam('2|Bits|0|2|50|0|0|72'))).toEqual({
      name: 'Bits',
      paperLabel: '8×10',
      aspectLabel: '35mm',
      printW: '6',
      printH: '9',
    });
  });
});

describe('decodeBorderPreset legacy (v1) links', () => {
  it('decodes a v1 link', () => {
    // 35mm on 8x10, landscape, minBorder 0.5 (fixture from og.test.ts)
    expect(
      decodeBorderPreset(
        'MzVtbSUyMG9uJTIwOHgxMCUyQyUyMDZ4OWluLTAtMi01MC0wLTEwMDAwLTg'
      )
    ).toEqual({
      name: '35mm on 8x10, 6x9in',
      paperLabel: '8×10',
      aspectLabel: '35mm',
      printW: '6',
      printH: '9',
    });
  });

  it('decodes a v1 custom-paper link', () => {
    expect(
      decodeBorderPreset(toPresetParam('Old-6-6-25-0-10000-0-950-1200'))
    ).toEqual({
      name: 'Old',
      paperLabel: '9½×12',
      aspectLabel: '4×5',
      printW: '7.2',
      printH: '9',
    });
  });

  it('repairs the v1 double hyphen left by a negative horizontal offset', () => {
    // horizontalOffset -1.00 encoded raw → "--100"; mask 8 = landscape
    expect(
      decodeBorderPreset(toPresetParam('Neg-0-2-50--100-10000-8'))
    ).toEqual({
      name: 'Neg',
      paperLabel: '8×10',
      aspectLabel: '35mm',
      printW: '6',
      printH: '9',
    });
  });
});

describe('decodeBorderPreset rejects malformed input', () => {
  it.each([
    ['empty string', ''],
    ['too-short base64', 'AAAA'],
    ['non-base64 characters', '!!!!'],
    ['unknown version marker', toPresetParam('3|Future|0|2|50|0|0|0')],
    ['truncated v2 payload', toPresetParam('2|Short|0|2|50')],
    ['non-numeric v2 part', toPresetParam('2|NaN|0|2|abc|0|0|0')],
    ['out-of-range aspect index', toPresetParam('2|Idx|99|2|50|0|0|0')],
    ['out-of-range paper index', toPresetParam('2|Idx|0|99|50|0|0|0')],
    ['negative index', toPresetParam('2|Idx|-1|2|50|0|0|0')],
    ['malformed URI escape in name', toPresetParam('2|%E0%A4%A|0|2|50|0|0|0')],
    ['custom paper without dimensions', toPresetParam('2|C|0|6|50|0|0|0')],
    ['border larger than paper', toPresetParam('2|Big|0|2|600|0|0|0')],
    ['oversized payload', 'A'.repeat(4000)],
  ])('returns null for %s', (_label, encoded) => {
    expect(() => decodeBorderPreset(encoded)).not.toThrow();
    expect(decodeBorderPreset(encoded)).toBeNull();
  });
});

describe('getRouteMetadata for a v2 border preset link', () => {
  it('uses the preset title and description', () => {
    const preset = encodePreset({
      name: 'Portfolio 8x10',
      settings: presetSettings({
        aspectRatio: '3:2',
        paperSize: '8x10',
        minBorder: 0.5,
        isLandscape: true,
      }),
    });
    const meta = getRouteMetadata('/border', { preset });
    expect(meta.title).toBe('Portfolio 8x10 | Dorkroom');
    expect(meta.description).toBe(
      '35mm on 8×10 paper — 6×9in print area. Borders, blade readings, and easel setup.'
    );
    expect(meta.ogImageUrl).toContain(`preset=${preset}`);
  });
});
