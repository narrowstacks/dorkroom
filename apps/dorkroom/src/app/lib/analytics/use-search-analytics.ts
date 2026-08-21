import { useEffect, useRef } from 'react';
import { type BrowseTool, trackEvent } from './events';

interface SearchDeadEndOptions {
  tool: BrowseTool;
  /** The live query. Used only to detect a *new* dead end; never sent. */
  query: string;
  resultCount: number;
  activeFilterCount: number;
  isLoading: boolean;
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
    if (isLoading || !query) {
      return;
    }

    if (resultCount > 0) {
      // Results came back, so the next empty result is a fresh dead end.
      lastReported.current = null;
      return;
    }

    if (lastReported.current === query) {
      return;
    }

    lastReported.current = query;
    trackEvent('search_no_results', { tool, filters: activeFilterCount });
  }, [tool, query, resultCount, activeFilterCount, isLoading]);
}
