import { useEffect, useRef, useState } from 'react';

/**
 * How long the inputs must stay still before a result is announced. Long
 * enough that typing "125" announces once rather than three times, short
 * enough that the announcement still feels tied to the edit.
 */
export const RESULT_ANNOUNCEMENT_DELAY_MS = 750;

/**
 * How long the message must stay still after mount before it is taken as the
 * silent baseline. Hydration is synchronous (mount effects plus the renders
 * they trigger), so it settles well inside this.
 */
export const BASELINE_SETTLE_MS = 100;

export interface ResultAnnouncerProps {
  /**
   * A short, human summary of the calculator's primary result, e.g.
   * "New exposure time 20s". An empty string means there is no valid result,
   * and nothing is announced (the page's own validation text covers that).
   */
  message: string;
  /** Override the settle delay. Mostly for tests. */
  delayMs?: number;
}

/**
 * The one screen-reader live region for a calculator page.
 *
 * Renders a visually hidden `<output>` (implicit `role="status"`) that is in
 * the DOM from the first render with empty text, because a live region
 * inserted together with its content is often not announced. Its text is
 * updated only after `message` has been stable for `delayMs`, so rapid typing
 * produces a single announcement instead of a flood.
 *
 * The message on page load is a baseline and is never announced: only later
 * changes are. The baseline is taken once the message has been still for
 * `BASELINE_SETTLE_MS` after mount, so it includes the localStorage / URL
 * hydration that the page's own mount effects apply. Those effects run after
 * this component's (React runs child effects first) and can cascade through a
 * few renders, so capturing on the first commit would announce hydration as a
 * change. The window is far shorter than the announcement delay, so a real
 * edit made soon after load is still announced.
 *
 * Mount exactly one per page; several live regions updating at once race on
 * most screen readers.
 */
export function ResultAnnouncer({
  message,
  delayMs = RESULT_ANNOUNCEMENT_DELAY_MS,
}: ResultAnnouncerProps) {
  const [announcement, setAnnouncement] = useState('');
  // `undefined` until the first settle, which is a baseline, not a change.
  const settledRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const isBaseline = settledRef.current === undefined;
    const timer = setTimeout(
      () => {
        const previous = settledRef.current;
        settledRef.current = message;
        if (previous === undefined || previous === message) return;
        setAnnouncement(message);
      },
      isBaseline ? BASELINE_SETTLE_MS : delayMs
    );
    return () => clearTimeout(timer);
  }, [message, delayMs]);

  return (
    <output aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </output>
  );
}
