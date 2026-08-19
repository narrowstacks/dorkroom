import { useEffect, useState } from 'react';
import { type AnyMediaQueryList, hasGlobal, matchMediaQuery } from '../lib/dom';

/** Responsive tier corresponding to the 4-tier breakpoint system */
export type ResponsiveTier = 'phone' | 'tablet' | 'desktop' | 'wide';

/** Breakpoints for the project's 4-tier responsive system (xl differs from Tailwind's 1280px default) */
const BREAKPOINTS = {
  /** sm – phone → tablet transition */
  sm: 640,
  /** md – tablet → desktop transition */
  md: 768,
  /** xl – desktop → wide transition */
  xl: 1200,
} as const;

function getTier(width: number): ResponsiveTier {
  if (width < BREAKPOINTS.sm) return 'phone';
  if (width < BREAKPOINTS.md) return 'tablet';
  if (width < BREAKPOINTS.xl) return 'desktop';
  return 'wide';
}

export interface ResponsiveTierResult {
  tier: ResponsiveTier;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  /** phone or tablet — backward compatible with useIsMobile */
  isMobile: boolean;
}

/**
 * Detects the current responsive tier based on viewport width.
 *
 * Tiers:
 * - phone:   < 640px
 * - tablet:  640–767px
 * - desktop: 768–1199px
 * - wide:    1200px+
 */
export function useResponsiveTier(): ResponsiveTierResult {
  const [tier, setTier] = useState<ResponsiveTier>(() => {
    if (!hasGlobal('window')) return 'desktop';
    return getTier(window.innerWidth);
  });

  // Both subscribe paths below return a cleanup (removeEventListener / removeListener);
  // the rule is thrown by the browser-environment guard, whose early return subscribes to
  // nothing. Suppressed as a false positive rather than "fixed".
  // eslint-disable-next-line react-doctor/effect-needs-cleanup -- see above
  useEffect(() => {
    if (!hasGlobal('window')) return;

    const smQuery = matchMediaQuery(`(min-width: ${BREAKPOINTS.sm}px)`);
    const mdQuery = matchMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`);
    const xlQuery = matchMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`);

    const update = () => setTier(getTier(window.innerWidth));

    const queries: AnyMediaQueryList[] = [smQuery, mdQuery, xlQuery];

    // Safari <14 and the legacy bundle's WebKit only have `addListener`.
    if (smQuery.addEventListener === undefined) {
      for (const q of queries) {
        if (q.addEventListener === undefined) q.addListener(update);
      }

      update();

      return () => {
        for (const q of queries) {
          if (q.addEventListener === undefined) q.removeListener(update);
        }
      };
    }

    for (const q of queries) {
      q.addEventListener?.('change', update);
    }

    // Initial sync after listeners are attached
    update();

    return () => {
      for (const q of queries) {
        q.removeEventListener?.('change', update);
      }
    };
  }, []);

  return {
    tier,
    isPhone: tier === 'phone',
    isTablet: tier === 'tablet',
    isDesktop: tier === 'desktop',
    isWide: tier === 'wide',
    isMobile: tier === 'phone' || tier === 'tablet',
  };
}
