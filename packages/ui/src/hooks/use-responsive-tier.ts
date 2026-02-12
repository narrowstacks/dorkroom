import { useEffect, useState } from 'react';

/** Responsive tier corresponding to the 4-tier breakpoint system */
export type ResponsiveTier = 'phone' | 'tablet' | 'desktop' | 'wide';

/** Breakpoints aligned with Tailwind's defaults */
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
    if (typeof window === 'undefined') return 'desktop';
    return getTier(window.innerWidth);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const smQuery = window.matchMedia(`(min-width: ${BREAKPOINTS.sm}px)`);
    const mdQuery = window.matchMedia(`(min-width: ${BREAKPOINTS.md}px)`);
    const xlQuery = window.matchMedia(`(min-width: ${BREAKPOINTS.xl}px)`);

    const update = () => setTier(getTier(window.innerWidth));

    // Initial sync
    update();

    const queries = [smQuery, mdQuery, xlQuery];
    for (const q of queries) {
      q.addEventListener('change', update);
    }

    return () => {
      for (const q of queries) {
        q.removeEventListener('change', update);
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
