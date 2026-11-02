import { describe, expect, it } from 'vitest';
import { buildDeveloperFilters } from '../../supabase/functions/_shared/developerFilters.ts';
import {
  cleanSearchTerm,
  ilikeCondition,
  quoteFilterValue,
} from '../../supabase/functions/_shared/search.ts';

const filter = (query: string) =>
  buildDeveloperFilters({ query, manufacturer: null }).orFilter;

describe('buildDeveloperFilters', () => {
  it('builds a quoted partial-match filter on name and manufacturer', () => {
    expect(
      buildDeveloperFilters({ query: 'D-76', manufacturer: 'Kodak' })
    ).toEqual({
      orFilter: 'name.ilike."%D-76%",manufacturer.ilike."%D-76%"',
      manufacturerPattern: '%Kodak%',
      invalidQuery: false,
    });
  });

  it.each([
    "Photographers' Formulary",
    'Spürsinn',
    'ADX A+B',
    'Rodinal/Adonal',
  ])('keeps real name %s intact in the pattern', (name) => {
    expect(filter(name)).toBe(
      `name.ilike."%${name}%",manufacturer.ilike."%${name}%"`
    );
  });

  it('quotes commas and parentheses so they are not filter syntax', () => {
    expect(filter('Rodinal, (R09)')).toBe(
      'name.ilike."%Rodinal, (R09)%",manufacturer.ilike."%Rodinal, (R09)%"'
    );
  });

  it('escapes quotes and backslashes inside the quoted value', () => {
    expect(quoteFilterValue('a"b\\c')).toBe('"a\\"b\\\\c"');
    expect(ilikeCondition('name', 'x"y')).toBe('name.ilike."%x\\"y%"');
  });

  it('passes manufacturer through unchanged', () => {
    expect(
      buildDeveloperFilters({ query: null, manufacturer: 'Kod,ak (x)' })
        .manufacturerPattern
    ).toBe('%Kod,ak (x)%');
  });

  it('flags a query without letters or digits as invalid', () => {
    for (const q of [',', '()', ' , ']) {
      expect(
        buildDeveloperFilters({ query: q, manufacturer: null })
      ).toMatchObject({ orFilter: null, invalidQuery: true });
    }
    expect(cleanSearchTerm(',')).toBeNull();
    expect(cleanSearchTerm(' D-76 ')).toBe('D-76');
  });

  it('applies no filter when query is absent', () => {
    expect(buildDeveloperFilters({ query: null, manufacturer: null })).toEqual({
      orFilter: null,
      manufacturerPattern: null,
      invalidQuery: false,
    });
  });
});
