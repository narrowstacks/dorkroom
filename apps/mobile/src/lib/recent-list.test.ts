import { describe, expect, it } from 'vitest';
import { parseRecentIds, recordRecentId } from './recent-list';

describe('recordRecentId', () => {
  it('puts the newest first', () => {
    expect(recordRecentId(['a', 'b'], 'c', 4)).toEqual(['c', 'a', 'b']);
  });

  it('moves a repeat to the front instead of duplicating it', () => {
    expect(recordRecentId(['a', 'b', 'c'], 'c', 4)).toEqual(['c', 'a', 'b']);
  });

  it('drops the oldest past the cap', () => {
    expect(recordRecentId(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b']);
  });
});

describe('parseRecentIds', () => {
  it('reads a stored list', () => {
    expect(parseRecentIds('["a","b"]')).toEqual(['a', 'b']);
  });

  it('is empty when unset, malformed or not a list', () => {
    expect(parseRecentIds(undefined)).toEqual([]);
    expect(parseRecentIds('not json')).toEqual([]);
    expect(parseRecentIds('{"a":1}')).toEqual([]);
  });

  it('keeps the readable entries and drops the rest and repeats', () => {
    expect(parseRecentIds('["a",1,null,"","a","b"]')).toEqual(['a', 'b']);
  });
});
