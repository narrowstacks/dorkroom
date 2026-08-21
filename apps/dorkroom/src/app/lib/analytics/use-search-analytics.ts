import { useEffect, useRef } from 'react';
import { type BrowseTool, trackEvent } from './events';

interface SearchState {
  /**
   * The query that produced `resultCount`, i.e. the debounced one where the
   * search is debounced. Used only to detect a *new* dead end; never sent.
   * Passing the live query instead pairs a fresh query with a stale count and
   * reports a dead end for every keystroke.
   */
  query: string;
  resultCount: number;
  isLoading: boolean;
  /** The query already counted as a dead end, or `null` for none. */
  lastReported: string | null;
}

interface SearchDeadEndOptions extends Omit<SearchState, 'lastReported'> {
  tool: BrowseTool;
  activeFilterCount: number;
}

/**
 * What the current search state means for reporting.
 *
 * `reset` clears the memo of the last dead end, so the next empty result counts
 * as a fresh one rather than a repeat. `ignore` covers a query still loading,
 * an empty box, and a dead end already reported.
 */
export type DeadEndOutcome = 'report' | 'reset' | 'ignore';

export function deadEndOutcome({
  query,
  resultCount,
  isLoading,
  lastReported,
}: SearchState): DeadEndOutcome {
  if (isLoading || !query) {
    return 'ignore';
  }
  if (resultCount > 0) {
    return 'reset';
  }
  return lastReported === query ? 'ignore' : 'report';
}

/**
 * Report a search that returned nothing.
 *
 * The query itself is deliberately never sent: it is free text the user typed,
 * and as a property value it would also blow up cardinality in the dashboard.
 * What ships is the tool and how many filters were narrowing the result, which
 * is enough to tell "the database is missing this film" apart from "they had
 * four filters on at once".
 *
 * Fires once per distinct dead end rather than on every keystroke, so a user
 * backspacing through a long query costs one event, not twenty.
 */
export function useSearchDeadEndAnalytics({
  tool,
  query,
  resultCount,
  activeFilterCount,
  isLoading,
}: SearchDeadEndOptions): void {
  const lastReported = useRef<string | null>(null);

  useEffect(() => {
    const outcome = deadEndOutcome({
      query,
      resultCount,
      isLoading,
      lastReported: lastReported.current,
    });

    if (outcome === 'reset') {
      lastReported.current = null;
      return;
    }
    if (outcome === 'ignore') {
      return;
    }

    lastReported.current = query;
    trackEvent('search_no_results', { tool, filters: activeFilterCount });
  }, [tool, query, resultCount, activeFilterCount, isLoading]);
}
