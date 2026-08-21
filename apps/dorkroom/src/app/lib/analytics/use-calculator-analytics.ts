import { useEffect } from 'react';
import { type CalculatorMode, type CalculatorTool, trackEvent } from './events';

/**
 * Tool + mode combinations already reported during this page load.
 *
 * Calculators recompute on every keystroke, and Vercel bills custom events per
 * thousand with no included allowance on Pro. Reporting each combination once
 * per session answers the question that matters (which tools and which modes
 * get used) at a fixed cost per visitor rather than one scaled by how much they
 * typed.
 */
const reported = new Set<string>();

/**
 * How long a mode must hold before it counts as the one in use.
 *
 * The first render of a calculator shows its *default* mode, not the visitor's.
 * `useLocalStorageFormPersistence` hydrates the stored form in a mount effect
 * and `useUrlPresetLoader` applies a shared preset in another, both of which
 * land after that first render. Reporting immediately therefore files everyone
 * with a saved non-default mode under the default one first and their real mode
 * second, which is worse than not splitting at all: the default's count silently
 * absorbs every other mode.
 *
 * Waiting instead of reading a hydration flag keeps this working for any source
 * of a late mode — the two above, a shared link, anything added later — without
 * every calculator having to thread a "settled" signal through to analytics.
 */
const SETTLE_MS = 600;

/** Exposed for tests; there is no reason to call this from app code. */
export function resetCalculatorAnalytics(): void {
  reported.clear();
}

/** Exposed for tests, so they can assert what shipped without a mocked wire. */
export function reportedCalculatorModes(): readonly string[] {
  return Array.from(reported);
}

interface CalculatorAnalyticsOptions {
  tool: CalculatorTool;
  mode?: CalculatorMode;
  /**
   * Whether the calculator has actually produced a result. Defaults to true for
   * calculators that always show one; pass a real value where the page can sit
   * empty so a bounce is not counted as use.
   */
  hasResult?: boolean;
}

export function useCalculatorAnalytics({
  tool,
  mode = 'default',
  hasResult = true,
}: CalculatorAnalyticsOptions): void {
  useEffect(() => {
    if (!hasResult) {
      return;
    }

    const key = `${tool}:${mode}`;
    if (reported.has(key)) {
      return;
    }

    // A mode that changes inside the window cancels this on cleanup, so a
    // hydrated or shared setting reports once, as itself.
    const timer = setTimeout(() => {
      reported.add(key);
      trackEvent('calculator_used', { tool, mode });
    }, SETTLE_MS);

    return () => clearTimeout(timer);
  }, [tool, mode, hasResult]);
}
