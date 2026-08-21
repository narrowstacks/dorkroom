import { describe, expect, it } from 'vitest';
import { deadEndOutcome } from '../use-search-analytics';

/**
 * The hook is handed the query that produced the result set, not the one in the
 * input box. Both browse pages debounce filtering by 300ms, so a live query
 * arrives paired with the previous query's count — and when that previous count
 * was zero, every keystroke on the way to a query that finds something reads as
 * a fresh dead end. What is pinned here is the decision; the pages are
 * responsible for supplying the debounced query it assumes.
 */
describe('deadEndOutcome', () => {
  const state = {
    query: 'xyzzy',
    resultCount: 0,
    isLoading: false,
    lastReported: null,
  };

  it('reports a settled query that found nothing', () => {
    expect(deadEndOutcome(state)).toBe('report');
  });

  it('reports the same dead end only once', () => {
    expect(deadEndOutcome({ ...state, lastReported: 'xyzzy' })).toBe('ignore');
  });

  it('treats a different dead end as its own', () => {
    expect(deadEndOutcome({ ...state, lastReported: 'plugh' })).toBe('report');
  });

  it('clears the memo once results come back', () => {
    expect(deadEndOutcome({ ...state, resultCount: 4 })).toBe('reset');
  });

  it('waits for the data before calling anything a dead end', () => {
    expect(deadEndOutcome({ ...state, isLoading: true })).toBe('ignore');
  });

  it('says nothing about an empty search box', () => {
    expect(deadEndOutcome({ ...state, query: '' })).toBe('ignore');
  });

  it('does not re-report a dead end the user has typed back into', () => {
    // 'portr' dead-ended, 'portra' found matches, and backspacing lands on
    // 'portr' again. The intervening results reset the memo, so this is a new
    // dead end rather than the same one twice.
    expect(deadEndOutcome({ ...state, query: 'portr' })).toBe('report');
    expect(deadEndOutcome({ ...state, query: 'portra', resultCount: 4 })).toBe(
      'reset'
    );
  });
});
