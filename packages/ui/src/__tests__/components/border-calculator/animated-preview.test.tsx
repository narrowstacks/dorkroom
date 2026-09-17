import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnimatedPreview } from '../../../components/border-calculator/animated-preview';

/**
 * A `(max-width: 768px)` media query list backed by a real `EventTarget`, so
 * `useIsMobile` subscribes and unsubscribes exactly as it does in a browser.
 * `matches` is recomputed from the fake viewport width on every read.
 */
class FakeMediaQueryList extends EventTarget implements MediaQueryList {
  readonly media: string;
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null =
    null;
  private readonly maxWidth: number;
  private readonly currentWidth: () => number;

  constructor(media: string, currentWidth: () => number) {
    super();
    this.media = media;
    const maxWidth = media.match(/max-width:\s*(\d+)px/);
    this.maxWidth = maxWidth ? Number.parseInt(maxWidth[1], 10) : 0;
    this.currentWidth = currentWidth;
  }

  get matches(): boolean {
    return this.currentWidth() <= this.maxWidth;
  }

  addListener(): never {
    throw new Error('FakeMediaQueryList: use addEventListener');
  }

  removeListener(): never {
    throw new Error('FakeMediaQueryList: use removeEventListener');
  }
}

describe('AnimatedPreview', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let originalInnerWidth: number;
  let width: number;
  let lists: FakeMediaQueryList[];

  const setInnerWidth = (value: number) => {
    width = value;
    Object.defineProperty(window, 'innerWidth', {
      value,
      writable: true,
      configurable: true,
    });
  };

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    originalInnerWidth = window.innerWidth;
    lists = [];

    window.matchMedia = (query: string): MediaQueryList => {
      const list = new FakeMediaQueryList(query, () => width);
      lists.push(list);
      return list;
    };

    setInnerWidth(1024);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth,
      writable: true,
      configurable: true,
    });
  });

  /** Flips the viewport to mobile and notifies every listener that would fire in a browser. */
  const resizeTo = (newWidth: number) => {
    setInnerWidth(newWidth);

    for (const list of lists) {
      const matches = list.matches;
      list.dispatchEvent(
        new MediaQueryListEvent('change', { matches, media: list.media })
      );
    }

    window.dispatchEvent(new Event('resize'));
  };

  it('rescales the preview when the viewport crosses into mobile without a calculation change', () => {
    const { container } = render(<AnimatedPreview calculation={null} />);

    // SAFETY: AnimatedPreview's placeholder branch renders exactly one root
    // element, a <div>, which is always an HTMLElement in the DOM environment.
    const previewEl = container.firstElementChild as HTMLElement;
    expect(previewEl.style.width).toBe('400px');

    act(() => {
      resizeTo(320);
    });

    // Mobile branch: min(320, innerWidth - 80) = min(320, 240) = 240.
    expect(previewEl.style.width).toBe('240px');
  });

  it('keeps the desktop size at exactly 768px and switches at 767px', () => {
    const { container } = render(<AnimatedPreview calculation={null} />);

    // SAFETY: same single-root <div> as above.
    const previewEl = container.firstElementChild as HTMLElement;

    // iPad portrait is 768px wide and was desktop under the original
    // `innerWidth < 768` check; the subscription must not move that boundary.
    act(() => {
      resizeTo(768);
    });
    expect(previewEl.style.width).toBe('400px');

    act(() => {
      resizeTo(767);
    });
    // min(320, 767 - 80) = 320.
    expect(previewEl.style.width).toBe('320px');
  });
});
