import { useCallback, useEffect, useRef } from 'react';
import { type ShareMethod, type ShareTool, trackEvent } from './tracked-events';

/**
 * Reports `share` once per link for as long as the calling page is mounted.
 *
 * Pressing Share twice on the same inputs hands over the same link twice, and
 * counting both would inflate the share side of the share/share_opened pair.
 * The link itself is the identity: change an input and the next share is a
 * new link, so it counts. The links stay in this component's memory and are
 * never sent; the event carries only the tool and the method.
 *
 * @returns `trackShare(link, tool, method)`, which sends `share` the first
 *   time it sees `link` and does nothing after that.
 */
export function useShareTracker(): (
  link: string,
  tool: ShareTool,
  method: ShareMethod
) => void {
  const sentLinks = useRef<Set<string> | null>(null);

  return useCallback((link, tool, method) => {
    sentLinks.current ??= new Set();
    if (sentLinks.current.has(link)) return;
    sentLinks.current.add(link);
    trackEvent('share', { tool, method });
  }, []);
}

/**
 * Reports `share_opened` once per arrival on a shared link.
 *
 * `arrival` identifies the arrival (any value that changes when another
 * shared link lands while the page is open), or is `null` when the page was
 * not opened from one. Each distinct non-null value is reported once, so a
 * re-render, the marker's own strip, or React's dev-mode effect replay never
 * counts the same arrival twice. Going back to `null` forgets it, so the same
 * link opened again later counts again.
 */
export function useShareOpened(
  tool: ShareTool,
  arrival: string | number | null
): void {
  const reported = useRef<string | number | null>(null);

  useEffect(() => {
    if (arrival === null) {
      reported.current = null;
      return;
    }
    if (reported.current === arrival) return;
    reported.current = arrival;
    trackEvent('share_opened', { tool });
  }, [tool, arrival]);
}
