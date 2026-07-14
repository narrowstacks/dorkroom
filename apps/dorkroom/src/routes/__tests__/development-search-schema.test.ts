import { describe, expect, it } from 'vitest';
import { parseSearch, stringifySearch } from '../search-params';
import { developmentSearchSchema, filmsSearchSchema } from '../search-schemas';

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
});
