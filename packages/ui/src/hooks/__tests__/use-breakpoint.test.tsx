import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  breakpointQuery,
  MOBILE_MEDIA_QUERY,
  useBreakpoint,
  useIsMobile,
} from '../use-breakpoint';

/**
 * A `min-width` / `max-width` media query list backed by a real `EventTarget`,
 * so the hooks subscribe and unsubscribe exactly as they do in a browser.
 * `matches` is recomputed from the fake viewport width on every read.
 */
class FakeMediaQueryList extends EventTarget implements MediaQueryList {
  readonly media: string;
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null =
    null;
  private readonly test: (width: number) => boolean;
  private readonly currentWidth: () => number;

  constructor(media: string, currentWidth: () => number) {
    super();
    this.media = media;
    this.currentWidth = currentWidth;
    const min = media.match(/min-width:\s*(\d+)px/);
    const max = media.match(/max-width:\s*(\d+)px/);
    if (min) {
      const px = Number.parseInt(min[1], 10);
      this.test = (width) => width >= px;
    } else if (max) {
      const px = Number.parseInt(max[1], 10);
      this.test = (width) => width <= px;
    } else {
      throw new Error(`FakeMediaQueryList: unsupported query ${media}`);
    }
  }

  get matches(): boolean {
    return this.test(this.currentWidth());
  }

  addListener(): never {
    throw new Error('FakeMediaQueryList: use addEventListener');
  }

  removeListener(): never {
    throw new Error('FakeMediaQueryList: use removeEventListener');
  }

  listenerCount = 0;

  override addEventListener(
    ...args: Parameters<EventTarget['addEventListener']>
  ): void {
    this.listenerCount += 1;
    super.addEventListener(...args);
  }

  override removeEventListener(
    ...args: Parameters<EventTarget['removeEventListener']>
  ): void {
    this.listenerCount -= 1;
    super.removeEventListener(...args);
  }
}

describe('use-breakpoint', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let width: number;
  let lists: FakeMediaQueryList[];

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    lists = [];
    width = 1024;
    window.matchMedia = (query: string): MediaQueryList => {
      const list = new FakeMediaQueryList(query, () => width);
      lists.push(list);
      return list;
    };
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  const resizeTo = (newWidth: number) => {
    act(() => {
      width = newWidth;
      for (const list of lists) {
        list.dispatchEvent(
          new MediaQueryListEvent('change', {
            matches: list.matches,
            media: list.media,
          })
        );
      }
    });
  };

  it('builds Tailwind min-width queries', () => {
    expect(breakpointQuery('sm')).toBe('(min-width: 640px)');
    expect(breakpointQuery('md')).toBe('(min-width: 768px)');
    expect(breakpointQuery('xl')).toBe('(min-width: 1280px)');
    expect(MOBILE_MEDIA_QUERY).toBe('(max-width: 768px)');
  });

  describe('useIsMobile', () => {
    it.each([
      [767, true],
      [768, true],
      [769, false],
    ])('at %ipx -> %s on first render', (initial, expected) => {
      width = initial;
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(expected);
    });

    it('follows the viewport across 768/769px', () => {
      width = 1024;
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(false);

      resizeTo(769);
      expect(result.current).toBe(false);

      resizeTo(768);
      expect(result.current).toBe(true);

      resizeTo(767);
      expect(result.current).toBe(true);

      resizeTo(769);
      expect(result.current).toBe(false);
    });

    it('unsubscribes on unmount', () => {
      const { unmount } = renderHook(() => useIsMobile());
      const subscribed = lists.filter((list) => list.listenerCount > 0);
      expect(subscribed).toHaveLength(1);

      unmount();
      expect(subscribed[0].listenerCount).toBe(0);
    });
  });

  describe('useBreakpoint', () => {
    it.each([
      ['sm', 639, false],
      ['sm', 640, true],
      ['md', 767, false],
      ['md', 768, true],
      ['md', 769, true],
      ['lg', 1023, false],
      ['lg', 1024, true],
    ] as const)('%s at %ipx -> %s', (name, initial, expected) => {
      width = initial;
      const { result } = renderHook(() => useBreakpoint(name));
      expect(result.current).toBe(expected);
    });

    it('follows the viewport across the sm boundary', () => {
      width = 600;
      const { result } = renderHook(() => useBreakpoint('sm'));
      expect(result.current).toBe(false);

      resizeTo(640);
      expect(result.current).toBe(true);

      resizeTo(639);
      expect(result.current).toBe(false);
    });

    it('subscribes once across re-renders', () => {
      const { rerender } = renderHook(() => useBreakpoint('md'));
      rerender();
      rerender();
      const subscriptions = lists.reduce(
        (total, list) => total + list.listenerCount,
        0
      );
      expect(subscriptions).toBe(1);
    });
  });
});
