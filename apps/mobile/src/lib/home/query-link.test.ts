import { describe, expect, it } from 'vitest';
import {
  MAX_LINK_QUERY_LENGTH,
  nextQueryLink,
  normalizeLinkQuery,
} from './query-link';

describe('nextQueryLink', () => {
  it('applies the first link', () => {
    expect(nextQueryLink({ q: 'hp5 at 800 in dd-x' }, null)).toEqual({
      query: 'hp5 at 800 in dd-x',
      key: JSON.stringify(['', 'hp5 at 800 in dd-x']),
    });
  });

  it('leaves the box alone without a usable q', () => {
    for (const params of [
      {},
      { q: undefined },
      { q: '' },
      { q: '   ' },
      { q: [] },
      { q: ['', 'hp5'] },
      { at: '1' },
    ]) {
      expect(nextQueryLink(params, null), JSON.stringify(params)).toBeNull();
    }
  });

  it('takes the first value of a repeated key', () => {
    expect(nextQueryLink({ q: ['hp5', 'tri-x'] }, null)?.query).toBe('hp5');
  });

  it('trims, and caps the length', () => {
    expect(nextQueryLink({ q: '  hp5  ' }, null)?.query).toBe('hp5');
    const long = 'a'.repeat(500);
    expect(nextQueryLink({ q: long }, null)?.query).toBe(
      'a'.repeat(MAX_LINK_QUERY_LENGTH)
    );
    // Cutting must not leave trailing space behind.
    const padded = `${'a'.repeat(MAX_LINK_QUERY_LENGTH - 1)} b`;
    expect(nextQueryLink({ q: padded }, null)?.query).toBe(
      'a'.repeat(MAX_LINK_QUERY_LENGTH - 1)
    );
  });

  it('applies a link once: the same link again is ignored', () => {
    const link = nextQueryLink({ q: 'hp5' }, null);
    expect(link).not.toBeNull();
    expect(nextQueryLink({ q: 'hp5' }, link?.key ?? null)).toBeNull();
    // Whitespace and a repeated key do not change the identity.
    expect(nextQueryLink({ q: [' hp5 ', 'x'] }, link?.key ?? null)).toBeNull();
  });

  it('applies a different query', () => {
    const link = nextQueryLink({ q: 'hp5' }, null);
    expect(nextQueryLink({ q: 'tri-x' }, link?.key ?? null)?.query).toBe(
      'tri-x'
    );
  });

  it('applies the same query again when the at marker differs', () => {
    const one = nextQueryLink({ q: 'hp5', at: '1' }, null);
    expect(nextQueryLink({ q: 'hp5', at: '1' }, one?.key ?? null)).toBeNull();
    const two = nextQueryLink({ q: 'hp5', at: '2' }, one?.key ?? null);
    expect(two?.query).toBe('hp5');
    expect(two?.key).not.toBe(one?.key);
    // A repeated `at` uses its first value.
    expect(
      nextQueryLink({ q: 'hp5', at: ['2', '3'] }, two?.key ?? null)
    ).toBeNull();
  });

  it('an at value cannot collide with the query', () => {
    expect(nextQueryLink({ at: 'a', q: 'b' }, null)?.key).not.toBe(
      nextQueryLink({ at: '', q: 'a:b' }, null)?.key
    );
  });

  it('a link without at differs from one with it', () => {
    const plain = nextQueryLink({ q: 'hp5' }, null);
    expect(
      nextQueryLink({ q: 'hp5', at: '1' }, plain?.key ?? null)
    ).not.toBeNull();
  });
});

describe('normalizeLinkQuery', () => {
  it('is the one normaliser: first value, trimmed, capped', () => {
    expect(normalizeLinkQuery(undefined)).toBe('');
    expect(normalizeLinkQuery(['  hp5 ', 'x'])).toBe('hp5');
    expect(normalizeLinkQuery('a'.repeat(300))).toHaveLength(
      MAX_LINK_QUERY_LENGTH
    );
  });
});
