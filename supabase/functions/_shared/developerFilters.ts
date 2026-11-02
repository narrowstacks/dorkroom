import { sanitizeQuery } from './sanitize.ts';

export interface DeveloperFilters {
  orFilter: string | null;
  manufacturerPattern: string | null;
}

/**
 * The `/developers` search term and manufacturer filter, made safe for
 * PostgREST. `query` goes into an `.or()` filter string, where a comma or a
 * parenthesis is syntax and used to make the request fail with a 500 (surfaced
 * as a 502 by the proxy). Both values go through `sanitizeQuery`, like the
 * films and combinations functions, so punctuation is dropped instead.
 *
 * A value that is empty after sanitizing (`,`, `()`) yields `null`, meaning
 * "no filter", so the request behaves as if the param had not been sent.
 */
export function buildDeveloperFilters(params: {
  query: string | null;
  manufacturer: string | null;
}): DeveloperFilters {
  const safeQuery = sanitizeQuery(params.query ?? '').trim();
  const safeManufacturer = sanitizeQuery(params.manufacturer ?? '').trim();
  return {
    orFilter: safeQuery
      ? `name.ilike.%${safeQuery}%,manufacturer.ilike.%${safeQuery}%`
      : null,
    manufacturerPattern: safeManufacturer ? `%${safeManufacturer}%` : null,
  };
}
