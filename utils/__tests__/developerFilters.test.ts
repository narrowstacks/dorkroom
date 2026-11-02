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
    ["Photographers' Formulary", 'Photographers% Formulary'],
    ['Spürsinn', 'Spürsinn'],
    ['ADX A+B', 'ADX A%B'],
    ['Rodinal/Adonal', 'Rodinal%Adonal'],
    ['HP5+', 'HP5%'],
    ['Delta 100,', 'Delta 100%'],
    ['D-76, 1+1', 'D-76% 1%1'],
    ['Rodinal, (R09)', 'Rodinal% %R09%'],
  ])('turns %s into the pattern %s', (name, pattern) => {
    expect(cleanSearchTerm(name)).toBe(pattern);
    expect(filter(name)).toBe(
      `name.ilike."%${pattern}%",manufacturer.ilike."%${pattern}%"`
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
    expect(
      buildDeveloperFilters({ query: null, manufacturer: '   ' })
        .manufacturerPattern
    ).toBeNull();
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
