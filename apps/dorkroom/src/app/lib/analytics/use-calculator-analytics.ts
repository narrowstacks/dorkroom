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

/** Exposed for tests; there is no reason to call this from app code. */
export function resetCalculatorAnalytics(): void {
  reported.clear();
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

    reported.add(key);
    trackEvent('calculator_used', { tool, mode });
  }, [tool, mode, hasResult]);
}
