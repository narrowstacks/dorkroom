import type { HomeSearchResult } from '@dorkroom/logic';
import { useEffect, useRef } from 'react';
import { type AnalyticsEvents, trackEvent } from './tracked-events';

/** How long a query has to sit unchanged before it counts as a search. */
export const HOME_SEARCH_SETTLE_MS = 1500;

/** The closed label and count a search result reports. Never the query. */
export function homeSearchEvent(
  result: HomeSearchResult
): AnalyticsEvents['home_search'] {
  const { answer, count } = result;
  if (answer) return { result: answer.kind, count };
  return { result: count > 0 ? 'list' : 'none', count };
}

/**
 * Report a home search once it settles: the query has sat unchanged for
 * `HOME_SEARCH_SETTLE_MS` and the result no longer waits on data (or the
 * data failed to load, so it never will). Each
 * distinct query reports once, so typing costs one event, not one per key,
 * and the example shown in an empty box is never reported.
 *
 * The query is only compared here to tell one search from the next; it is
 * never sent.
 */
export function useHomeSearchAnalytics(
  query: string,
  result: HomeSearchResult,
  loadFailed: boolean
): void {
  const lastReported = useRef<string | null>(null);
  const settled = query.trim();
  const { result: outcome, count } = homeSearchEvent(result);
  const pending = result.pending && !loadFailed;

  useEffect(() => {
    if (!settled || pending || lastReported.current === settled) return;
    const timer = window.setTimeout(() => {
      lastReported.current = settled;
      trackEvent('home_search', { result: outcome, count });
    }, HOME_SEARCH_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [settled, pending, outcome, count]);
}
