import { describe, expect, it } from 'vitest';
import {
  BASE_URL,
  getRouteMetadata,
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
