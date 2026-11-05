import { SHARED_LINK_MARKER } from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import { parseSearch, stringifySearch } from '../search-params';
import {
  developmentSearchSchema,
  filmColorFilterSchema,
  filmsSearchSchema,
} from '../search-schemas';

/**
 * Regression cover for silently-dropped deep-link filters.
 *
 * TanStack Router's default parser JSON-parses each search value, so `?iso=400`
 * became the number `400` and `?favorites=true` the boolean `true`. Both then
 * failed the routes' `z.string()` schemas, whose `.catch(undefined)` swallowed
 * the failure — the params were dropped and stripped from the URL, so a shared
 * link lost its ISO and favourites filters. We now round-trip search values as
 * plain strings.
 */
describe('search param parsing', () => {
  it('keeps a numeric value as a string rather than a number', () => {
    expect(parseSearch('?iso=400')).toEqual({ iso: '400' });
  });

  it('keeps a boolean-looking value as a string rather than a boolean', () => {
    expect(parseSearch('?favorites=true')).toEqual({ favorites: 'true' });
  });

  it('parses a full shared-recipe deep link as strings', () => {
    expect(
      parseSearch(
        '?recipe=f1db6057-2775-48f5-978b-d2093d3145e4&source=share&film=rollei-retro-400s&iso=400&favorites=true'
      )
    ).toEqual({
      recipe: 'f1db6057-2775-48f5-978b-d2093d3145e4',
      source: 'share',
      film: 'rollei-retro-400s',
      iso: '400',
      favorites: 'true',
    });
  });

  it('round-trips without quoting numeric or boolean-looking strings', () => {
    // The default serializer would emit ?iso=%22400%22 to preserve string-ness,
    // which breaks the raw URLSearchParams reader on the recipes page.
    const search = stringifySearch({ iso: '400', favorites: 'true' });
    expect(search).toContain('iso=400');
    expect(search).toContain('favorites=true');
    expect(search).not.toContain('%22');
    expect(parseSearch(search)).toEqual({ iso: '400', favorites: 'true' });
  });
});

describe('developmentSearchSchema', () => {
  it('preserves every param of a shared-recipe deep link', () => {
    const parsed = parseSearch(
      '?recipe=f1db6057-2775-48f5-978b-d2093d3145e4&source=share&film=rollei-retro-400s&iso=400&favorites=true&developerType=powder'
    );

    expect(developmentSearchSchema.parse(parsed)).toEqual({
      recipe: 'f1db6057-2775-48f5-978b-d2093d3145e4',
      source: 'share',
      film: 'rollei-retro-400s',
      iso: '400',
      favorites: 'true',
      developerType: 'powder',
    });
  });

  it('keeps a non-numeric ISO', () => {
    expect(developmentSearchSchema.parse(parseSearch('?iso=boxspeed'))).toEqual(
      {
        iso: 'boxspeed',
      }
    );
  });

  it('keeps the legacy view enum', () => {
    expect(
      developmentSearchSchema.parse(parseSearch('?view=favorites'))
    ).toEqual({ view: 'favorites' });
  });

  it('omits params that are absent', () => {
    expect(developmentSearchSchema.parse({})).toEqual({});
  });

  // The page's URL writes start from this parsed search, so a param it does
  // not manage must survive parsing to survive the write.
  it('keeps params it does not declare, as strings', () => {
    expect(
      developmentSearchSchema.parse(parseSearch('?film=hp5&utm_source=forum'))
    ).toEqual({ film: 'hp5', utm_source: 'forum' });
  });

  // The schemas are plain validators, not zod (issue #352), so these pin the
  // recover-to-undefined behaviour the zod `.catch(undefined)` schemas had.
  it('recovers an unknown view to undefined', () => {
    const parsed = developmentSearchSchema.parse({ view: 'all', film: 'hp5' });
    expect(parsed).toEqual({ film: 'hp5' });
    expect(Object.hasOwn(parsed, 'view')).toBe(true);
    expect(parsed.view).toBeUndefined();
  });

  it('recovers a non-string value from untyped code to undefined', () => {
    // JSON.parse is untyped, standing in for a caller outside the type system.
    const parsed = developmentSearchSchema.parse(
      JSON.parse('{"iso":400,"utm_source":true,"film":"hp5"}')
    );
    expect(parsed).toEqual({ film: 'hp5' });
    expect(parsed.iso).toBeUndefined();
    expect(parsed.utm_source).toBeUndefined();
  });
});

describe('filmsSearchSchema', () => {
  it('preserves a numeric ISO deep link', () => {
    expect(
      filmsSearchSchema.parse(parseSearch('?iso=400&brand=ilford&color=bw'))
    ).toEqual({ iso: '400', brand: 'ilford', color: 'bw' });
  });

  it('preserves a numeric free-text search', () => {
    expect(filmsSearchSchema.parse(parseSearch('?search=400'))).toEqual({
      search: '400',
    });
  });

  it('drops params it does not declare', () => {
    expect(
      filmsSearchSchema.parse(parseSearch('?brand=kodak&utm_source=forum'))
    ).toEqual({ brand: 'kodak' });
  });

  it('recovers an unknown colour or status filter to undefined', () => {
    expect(
      filmsSearchSchema.parse(parseSearch('?color=infrared&status=old&iso=50'))
    ).toEqual({ color: undefined, status: undefined, iso: '50' });
  });

  it('keeps a known sort and recovers anything else to undefined', () => {
    expect(filmsSearchSchema.parse(parseSearch('?sort=recipes'))).toEqual({
      sort: 'recipes',
    });
    expect(filmsSearchSchema.parse(parseSearch('?sort=iso'))).toEqual({
      sort: 'iso',
    });
    expect(filmsSearchSchema.parse(parseSearch('?sort=bogus'))).toEqual({
      sort: undefined,
    });
  });

  it('keeps only the shared-link marker as source', () => {
    expect(
      filmsSearchSchema.parse({ source: SHARED_LINK_MARKER.value })
    ).toEqual({ source: SHARED_LINK_MARKER.value });
    expect(filmsSearchSchema.parse({ source: 'newsletter' }).source).toBe(
      undefined
    );
  });
});

describe('filmColorFilterSchema', () => {
  it('accepts a known filter and recovers anything else to undefined', () => {
    expect(filmColorFilterSchema.parse('slide')).toBe('slide');
    expect(filmColorFilterSchema.parse('all')).toBeUndefined();
    expect(filmColorFilterSchema.parse(undefined)).toBeUndefined();
  });
});
