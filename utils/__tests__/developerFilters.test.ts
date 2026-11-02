import { describe, expect, it } from 'vitest';
import { buildDeveloperFilters } from '../../supabase/functions/_shared/developerFilters.ts';

describe('buildDeveloperFilters', () => {
  it('builds a partial-match filter on name and manufacturer', () => {
    expect(
      buildDeveloperFilters({ query: 'D-76', manufacturer: 'Kodak' })
    ).toEqual({
      orFilter: 'name.ilike.%D-76%,manufacturer.ilike.%D-76%',
      manufacturerPattern: '%Kodak%',
    });
  });

  it('drops commas and parentheses that would break the .or() filter', () => {
    const { orFilter, manufacturerPattern } = buildDeveloperFilters({
      query: 'Rodinal (R09), classic',
      manufacturer: 'Agfa, Gevaert (old)',
    });
    expect(orFilter).toBe(
      'name.ilike.%Rodinal R09 classic%,manufacturer.ilike.%Rodinal R09 classic%'
    );
    expect(manufacturerPattern).toBe('%Agfa Gevaert old%');
    // Only the one separator comma between the two conditions survives.
    expect(orFilter?.match(/,/g)).toHaveLength(1);
    expect(orFilter).not.toMatch(/[()]/);
  });

  it('treats values that are empty after sanitizing as no filter', () => {
    expect(
      buildDeveloperFilters({ query: ',()', manufacturer: ' , ' })
    ).toEqual({ orFilter: null, manufacturerPattern: null });
    expect(buildDeveloperFilters({ query: null, manufacturer: null })).toEqual({
      orFilter: null,
      manufacturerPattern: null,
    });
  });
});
