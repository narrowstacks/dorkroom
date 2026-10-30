import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deadEndOutcome,
  useSearchDeadEndAnalytics,
} from '../use-search-analytics';

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
});

/**
 * `@vercel/analytics`'s `track` only forwards to `window.va`, the queue the
 * real script installs in production. Stubbing it lets these count what the
 * hook actually sends through the real `trackEvent` -> `track` chain, across
 * renders, which is where the memo of the last dead end lives.
 */
describe('useSearchDeadEndAnalytics', () => {
  const va = vi.fn();

  beforeEach(() => {
    va.mockReset();
    window.va = va;
  });

  afterEach(() => {
    delete window.va;
  });

  interface Props {
    query: string;
    resultCount: number;
    activeFilterCount?: number;
  }

  const render = (query: string, resultCount: number) => {
    const initialProps: Props = { query, resultCount };
    return renderHook(
      ({ activeFilterCount = 1, ...props }: Props) =>
        useSearchDeadEndAnalytics({
          tool: 'films',
          activeFilterCount,
          isLoading: false,
          ...props,
        }),
      { initialProps }
    );
  };

  it('reports a dead end the user has typed back into after results came back', () => {
    // 'portr' dead-ends, 'portra' finds matches, and backspacing lands on
    // 'portr' again. The intervening results reset the memo, so this is a new
    // dead end rather than the same one twice.
    const { rerender } = render('portr', 0);
    rerender({ query: 'portra', resultCount: 4 });
    rerender({ query: 'portr', resultCount: 0 });

    expect(va).toHaveBeenCalledTimes(2);
    expect(va).toHaveBeenLastCalledWith('event', {
      name: 'search_no_results',
      data: { tool: 'films', filters: 1 },
      options: undefined,
    });
  });

  it('does not re-report the same dead end when the effect re-runs', () => {
    // Toggling a filter re-runs the effect without changing the query; the
    // memo is what keeps that from counting as a second dead end.
    const { rerender } = render('portr', 0);
    rerender({ query: 'portr', resultCount: 0, activeFilterCount: 2 });

    expect(va).toHaveBeenCalledTimes(1);
  });
});
