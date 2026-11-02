import { cleanSearchTerm, ilikeCondition } from './search.ts';

export interface DeveloperFilters {
  /** `.or()` filter string for `query`, or null when there is no query. */
  orFilter: string | null;
  /** `%manufacturer%` pattern for `.ilike()`, or null when absent. */
  manufacturerPattern: string | null;
  /** True when `query` was sent but holds no letter or digit (answer 400). */
  invalidQuery: boolean;
}

/**
 * The `/developers` search term and manufacturer filter. `query` goes into an
 * `.or()` filter string, so it is double-quoted (commas and parentheses were
 * syntax there and used to fail with a 500, surfaced as 502). `manufacturer`
 * goes through `.ilike()`, whose value is not parsed as a filter list, so it
 * passes through unchanged.
 */
export function buildDeveloperFilters(params: {
  query: string | null;
  manufacturer: string | null;
}): DeveloperFilters {
  const hasQuery = Boolean(params.query?.trim());
  const term = hasQuery ? cleanSearchTerm(params.query ?? '') : null;
  const manufacturer = params.manufacturer?.trim();
  return {
    orFilter: term
      ? `${ilikeCondition('name', term)},${ilikeCondition('manufacturer', term)}`
      : null,
    manufacturerPattern: manufacturer ? `%${manufacturer}%` : null,
    invalidQuery: hasQuery && term === null,
  };
}
