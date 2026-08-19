import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type ResponsiveTier, useResponsiveTier } from '../use-responsive-tier';

/**
 * A `(min-width: Npx)` media query list backed by a real `EventTarget`, so the
 * hook subscribes and unsubscribes exactly as it does in a browser. `matches`
 * is recomputed from the fake viewport width on every read.
 */
class FakeMediaQueryList extends EventTarget implements MediaQueryList {
  readonly media: string;
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null =
    null;
  /** Change handlers still subscribed, so tests can assert unmount cleanup. */
  readonly changeHandlers = new Set<EventListenerOrEventListenerObject>();
  private readonly minWidth: number;
  private readonly currentWidth: () => number;

  constructor(media: string, currentWidth: () => number) {
    super();
    this.media = media;
    const minWidth = media.match(/min-width:\s*(\d+)px/);
    this.minWidth = minWidth ? Number.parseInt(minWidth[1], 10) : 0;
    this.currentWidth = currentWidth;
  }

  get matches(): boolean {
    return this.currentWidth() >= this.minWidth;
  }

  override addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean
  ): void {
    if (type === 'change' && callback !== null) {
      this.changeHandlers.add(callback);
    }
    super.addEventListener(type, callback, options);
  }

  override removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void {
    if (type === 'change' && callback !== null) {
      this.changeHandlers.delete(callback);
    }
    super.removeEventListener(type, callback, options);
  }

  // The hook reaches the legacy Safari < 14 pair only when `addEventListener` is
  // missing, which it never is here. Throwing surfaces that branch if it changes.
  addListener(): never {
    throw new Error('FakeMediaQueryList: use addEventListener');
  }

  removeListener(): never {
    throw new Error('FakeMediaQueryList: use removeEventListener');
  }
}

const createMockMatchMedia = (initialWidth: number) => {
  let width = initialWidth;
  const lists: FakeMediaQueryList[] = [];

  return {
    mock: (query: string): MediaQueryList => {
      const list = new FakeMediaQueryList(query, () => width);
      lists.push(list);
      return list;
    },
    triggerChange: (newWidth: number) => {
      width = newWidth;
      Object.defineProperty(window, 'innerWidth', {
        value: newWidth,
        writable: true,
        configurable: true,
      });

      for (const list of lists) {
        list.dispatchEvent(
          new MediaQueryListEvent('change', {
            matches: list.matches,
            media: list.media,
          })
        );
      }
    },
    /** Total change handlers still subscribed across every query. */
    subscribedChangeHandlers: () =>
      lists.reduce((total, list) => total + list.changeHandlers.size, 0),
  };
};

describe('useResponsiveTier', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth,
      writable: true,
      configurable: true,
    });
  });

  describe('tier detection', () => {
    it('returns phone tier for width < 640px', () => {
      const mockMedia = createMockMatchMedia(500);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('phone');
    });

    it('returns tablet tier for width 640-767px', () => {
      const mockMedia = createMockMatchMedia(700);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 700,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('tablet');
    });

    it('returns desktop tier for width 768-1199px', () => {
      const mockMedia = createMockMatchMedia(1000);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 1000,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('desktop');
    });

    it('returns wide tier for width >= 1200px', () => {
      const mockMedia = createMockMatchMedia(1400);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 1400,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('wide');
    });
  });

  describe('breakpoint boundaries', () => {
    it('returns phone tier at 639px (just below sm breakpoint)', () => {
      const mockMedia = createMockMatchMedia(639);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 639,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('phone');
    });

    it('returns tablet tier at 640px (sm breakpoint)', () => {
      const mockMedia = createMockMatchMedia(640);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 640,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('tablet');
    });

    it('returns tablet tier at 767px (just below md breakpoint)', () => {
      const mockMedia = createMockMatchMedia(767);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 767,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('tablet');
    });

    it('returns desktop tier at 768px (md breakpoint)', () => {
      const mockMedia = createMockMatchMedia(768);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 768,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('desktop');
    });

    it('returns desktop tier at 1199px (just below xl breakpoint)', () => {
      const mockMedia = createMockMatchMedia(1199);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 1199,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('desktop');
    });

    it('returns wide tier at 1200px (xl breakpoint)', () => {
      const mockMedia = createMockMatchMedia(1200);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 1200,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('wide');
    });
  });

  describe('boolean flags', () => {
    it('sets isPhone true when tier is phone', () => {
      const mockMedia = createMockMatchMedia(500);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.isPhone).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isWide).toBe(false);
    });

    it('sets isTablet true when tier is tablet', () => {
      const mockMedia = createMockMatchMedia(700);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 700,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.isPhone).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isWide).toBe(false);
    });

    it('sets isDesktop true when tier is desktop', () => {
      const mockMedia = createMockMatchMedia(1000);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 1000,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.isPhone).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isWide).toBe(false);
    });

    it('sets isWide true when tier is wide', () => {
      const mockMedia = createMockMatchMedia(1400);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 1400,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.isPhone).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isWide).toBe(true);
    });

    it('sets isMobile true for phone tier', () => {
      const mockMedia = createMockMatchMedia(500);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.isMobile).toBe(true);
    });

    it('sets isMobile true for tablet tier', () => {
      const mockMedia = createMockMatchMedia(700);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 700,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.isMobile).toBe(true);
    });

    it('sets isMobile false for desktop tier', () => {
      const mockMedia = createMockMatchMedia(1000);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 1000,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.isMobile).toBe(false);
    });

    it('sets isMobile false for wide tier', () => {
      const mockMedia = createMockMatchMedia(1400);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 1400,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.isMobile).toBe(false);
    });
  });

  describe('media query change handling', () => {
    it('updates tier when width changes from phone to tablet', () => {
      const mockMedia = createMockMatchMedia(500);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('phone');

      act(() => {
        mockMedia.triggerChange(700);
      });

      expect(result.current.tier).toBe('tablet');
    });

    it('updates tier when width changes from tablet to desktop', () => {
      const mockMedia = createMockMatchMedia(700);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 700,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('tablet');

      act(() => {
        mockMedia.triggerChange(1000);
      });

      expect(result.current.tier).toBe('desktop');
    });

    it('updates tier when width changes from desktop to wide', () => {
      const mockMedia = createMockMatchMedia(1000);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 1000,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('desktop');

      act(() => {
        mockMedia.triggerChange(1400);
      });

      expect(result.current.tier).toBe('wide');
    });

    it('updates tier when width changes from wide to desktop', () => {
      const mockMedia = createMockMatchMedia(1400);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 1400,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('wide');

      act(() => {
        mockMedia.triggerChange(1000);
      });

      expect(result.current.tier).toBe('desktop');
    });

    it('updates boolean flags when tier changes', () => {
      const mockMedia = createMockMatchMedia(500);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.isPhone).toBe(true);
      expect(result.current.isMobile).toBe(true);

      act(() => {
        mockMedia.triggerChange(1000);
      });

      expect(result.current.isPhone).toBe(false);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);
    });

    it('handles multiple rapid changes', () => {
      const mockMedia = createMockMatchMedia(500);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('phone');

      act(() => {
        mockMedia.triggerChange(700);
        mockMedia.triggerChange(1000);
        mockMedia.triggerChange(1400);
      });

      expect(result.current.tier).toBe('wide');
    });
  });

  describe('SSR and edge cases', () => {
    // Note: SSR test (window is undefined) is not included here because it's
    // difficult to test in jsdom without affecting other tests. The SSR code
    // path is simple and returns 'desktop' tier, which is verified in production.

    it('cleans up event listeners on unmount', () => {
      const mockMedia = createMockMatchMedia(1000);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 1000,
        writable: true,
        configurable: true,
      });

      const { unmount } = renderHook(() => useResponsiveTier());

      // One subscription per breakpoint query (sm, md, xl).
      expect(mockMedia.subscribedChangeHandlers()).toBe(3);

      unmount();

      expect(mockMedia.subscribedChangeHandlers()).toBe(0);
    });

    it('handles extreme viewport widths', () => {
      const mockMedia = createMockMatchMedia(5000);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 5000,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('wide');
    });

    it('handles very small viewport widths', () => {
      const mockMedia = createMockMatchMedia(320);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 320,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current.tier).toBe('phone');
    });
  });

  describe('return value structure', () => {
    it('returns all expected properties', () => {
      const mockMedia = createMockMatchMedia(1000);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 1000,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current).toHaveProperty('tier');
      expect(result.current).toHaveProperty('isPhone');
      expect(result.current).toHaveProperty('isTablet');
      expect(result.current).toHaveProperty('isDesktop');
      expect(result.current).toHaveProperty('isWide');
      expect(result.current).toHaveProperty('isMobile');
    });

    it('exposes exactly the tier flags for the current width', () => {
      const mockMedia = createMockMatchMedia(1000);
      window.matchMedia = mockMedia.mock;
      Object.defineProperty(window, 'innerWidth', {
        value: 1000,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useResponsiveTier());

      expect(result.current).toStrictEqual({
        tier: 'desktop',
        isPhone: false,
        isTablet: false,
        isDesktop: true,
        isWide: false,
        isMobile: false,
      });
    });

    it('ensures only one tier flag is true at a time', () => {
      const tiers: Array<{ width: number; expectedTier: ResponsiveTier }> = [
        { width: 500, expectedTier: 'phone' },
        { width: 700, expectedTier: 'tablet' },
        { width: 1000, expectedTier: 'desktop' },
        { width: 1400, expectedTier: 'wide' },
      ];

      tiers.forEach(({ width, expectedTier }) => {
        const mockMedia = createMockMatchMedia(width);
        window.matchMedia = mockMedia.mock;
        Object.defineProperty(window, 'innerWidth', {
          value: width,
          writable: true,
          configurable: true,
        });

        const { result } = renderHook(() => useResponsiveTier());

        const trueFlags = [
          result.current.isPhone,
          result.current.isTablet,
          result.current.isDesktop,
          result.current.isWide,
        ].filter(Boolean);

        expect(trueFlags).toHaveLength(1);
        expect(result.current.tier).toBe(expectedTier);
      });
    });
  });
});
