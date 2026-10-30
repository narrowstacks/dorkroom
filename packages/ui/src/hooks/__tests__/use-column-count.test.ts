import { BREAKPOINTS } from '@dorkroom/logic';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RESIZE_DEBOUNCE_MS } from '../../lib/resize-debounce';
import { useColumnCount } from '../use-column-count';

const BREAKPOINT_XL = BREAKPOINTS.xl;
const BREAKPOINT_LG = BREAKPOINTS.lg;
const BREAKPOINT_SM = BREAKPOINTS.sm;

// In-memory ResizeObserver: records what it observes and lets a test push a
// width through the real callback contract.
type ResizeCallback = ResizeObserverCallback;

class MockResizeObserver implements ResizeObserver {
  static instances: MockResizeObserver[] = [];
  callback: ResizeCallback;
  observedElements: Set<Element> = new Set();

  constructor(callback: ResizeCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observedElements.add(target);
  }

  unobserve(target: Element) {
    this.observedElements.delete(target);
  }

  disconnect() {
    this.observedElements.clear();
  }

  // Helper to simulate resize
  simulateResize(width: number) {
    const size: ResizeObserverSize = { blockSize: 600, inlineSize: width };
    const entries: ResizeObserverEntry[] = Array.from(
      this.observedElements
    ).map((element) => ({
      target: element,
      contentRect: DOMRectReadOnly.fromRect({ width, height: 600 }),
      borderBoxSize: [size],
      contentBoxSize: [size],
      devicePixelContentBoxSize: [size],
    }));
    this.callback(entries, this);
  }

  static reset() {
    MockResizeObserver.instances = [];
  }

  /** The observer the hook under test just constructed. */
  static getLatest(): MockResizeObserver {
    const observer = MockResizeObserver.instances.at(-1);
    if (observer === undefined) {
      throw new Error('the hook constructed no ResizeObserver');
    }
    return observer;
  }
}

/** The films grid: a fixed two columns on mobile. */
function useFixedMobileColumnCount(
  containerRef: React.RefObject<HTMLDivElement | null>,
  isMobile: boolean
): number {
  return useColumnCount(containerRef, isMobile, { mobileColumns: 2 });
}

/** Pushes a resize through the observer and past the debounce. */
function resizeTo(width: number) {
  act(() => {
    MockResizeObserver.getLatest().simulateResize(width);
    vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS);
  });
}

function containerOf(width: number) {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: width });
  return { current: container };
}

describe('useColumnCount', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    MockResizeObserver.reset();
    global.ResizeObserver = MockResizeObserver;
  });

  afterEach(() => {
    vi.useRealTimers();
    MockResizeObserver.reset();
  });

  describe('initial column count', () => {
    it('returns 2 columns for mobile layout', () => {
      const containerRef = { current: document.createElement('div') };

      const { result } = renderHook(() =>
        useFixedMobileColumnCount(containerRef, true)
      );

      expect(result.current).toBe(2);
    });

    it('returns 3 columns for desktop layout as default', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1100 });
      const containerRef = { current: container };

      const { result } = renderHook(() => useColumnCount(containerRef, false));

      // Should calculate based on container width (1100px = lg breakpoint = 3 columns)
      expect(result.current).toBe(3);
    });
  });

  describe('breakpoint calculations', () => {
    it('returns 1 column for width < 640px (xs breakpoint)', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 500 });
      const containerRef = { current: container };

      const { result } = renderHook(() => useColumnCount(containerRef, false));

      expect(result.current).toBe(1);
    });

    it('returns 2 columns for width >= 640px and < 1024px (sm breakpoint)', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 800 });
      const containerRef = { current: container };

      const { result } = renderHook(() => useColumnCount(containerRef, false));

      expect(result.current).toBe(2);
    });

    it('returns 3 columns for width >= 1024px and < 1280px (lg breakpoint)', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1100 });
      const containerRef = { current: container };

      const { result } = renderHook(() => useColumnCount(containerRef, false));

      expect(result.current).toBe(3);
    });

    it('returns 4 columns for width >= 1280px (xl breakpoint)', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1400 });
      const containerRef = { current: container };

      const { result } = renderHook(() => useColumnCount(containerRef, false));

      expect(result.current).toBe(4);
    });

    it('returns exactly 2 columns at sm breakpoint boundary (640px)', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: BREAKPOINT_SM });
      const containerRef = { current: container };

      const { result } = renderHook(() => useColumnCount(containerRef, false));

      expect(result.current).toBe(2);
    });

    it('returns exactly 3 columns at lg breakpoint boundary (1024px)', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: BREAKPOINT_LG });
      const containerRef = { current: container };

      const { result } = renderHook(() => useColumnCount(containerRef, false));

      expect(result.current).toBe(3);
    });

    it('returns exactly 4 columns at xl breakpoint boundary (1280px)', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: BREAKPOINT_XL });
      const containerRef = { current: container };

      const { result } = renderHook(() => useColumnCount(containerRef, false));

      expect(result.current).toBe(4);
    });
  });

  describe('ResizeObserver behavior', () => {
    it('creates a ResizeObserver when not in mobile mode', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1000 });
      const containerRef = { current: container };

      renderHook(() => useColumnCount(containerRef, false));

      expect(MockResizeObserver.instances.length).toBe(1);
    });

    it('does not create ResizeObserver in mobile mode', () => {
      const containerRef = { current: document.createElement('div') };

      renderHook(() => useFixedMobileColumnCount(containerRef, true));

      // No ResizeObserver should be created for mobile
      expect(MockResizeObserver.instances.length).toBe(0);
    });

    it('updates column count when container is resized', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1100 });
      const containerRef = { current: container };

      const { result } = renderHook(() => useColumnCount(containerRef, false));

      expect(result.current).toBe(3); // lg breakpoint

      // Simulate resize to xl breakpoint
      resizeTo(1400);

      expect(result.current).toBe(4);
    });

    it('updates column count from xl to sm on resize', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1400 });
      const containerRef = { current: container };

      const { result } = renderHook(() => useColumnCount(containerRef, false));

      expect(result.current).toBe(4); // xl breakpoint

      // Simulate resize to sm breakpoint
      resizeTo(700);

      expect(result.current).toBe(2);
    });

    it('disconnects ResizeObserver on unmount', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1000 });
      const containerRef = { current: container };

      const { unmount } = renderHook(() => useColumnCount(containerRef, false));

      const disconnectSpy = vi.spyOn(
        MockResizeObserver.getLatest(),
        'disconnect'
      );

      unmount();

      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('observes the container element', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1000 });
      const containerRef = { current: container };

      renderHook(() => useColumnCount(containerRef, false));

      expect(
        MockResizeObserver.getLatest().observedElements.has(container)
      ).toBe(true);
    });
  });

  describe('mobile/desktop mode switching', () => {
    it('always returns 2 columns in mobile mode regardless of container width', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1400 }); // xl width
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useFixedMobileColumnCount(containerRef, true)
      );

      expect(result.current).toBe(2);
    });

    it('switches from responsive to fixed columns when isMobile changes to true', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1400 });
      const containerRef = { current: container };

      const { result, rerender } = renderHook(
        ({ isMobile }) => useFixedMobileColumnCount(containerRef, isMobile),
        { initialProps: { isMobile: false } }
      );

      expect(result.current).toBe(4); // xl breakpoint

      rerender({ isMobile: true });

      expect(result.current).toBe(2); // Fixed mobile columns
    });

    it('switches from fixed to responsive columns when isMobile changes to false', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1400 });
      const containerRef = { current: container };

      const { result, rerender } = renderHook(
        ({ isMobile }) => useFixedMobileColumnCount(containerRef, isMobile),
        { initialProps: { isMobile: true } }
      );

      expect(result.current).toBe(2); // Fixed mobile columns

      rerender({ isMobile: false });

      expect(result.current).toBe(4); // xl breakpoint based on container width
    });
  });

  describe('edge cases', () => {
    it('handles null container ref gracefully', () => {
      const containerRef = { current: null };

      const { result } = renderHook(() => useColumnCount(containerRef, false));

      // Should use default (3 columns for non-mobile)
      expect(result.current).toBe(3);
    });

    it('handles container with zero width', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 0 });
      const containerRef = { current: container };

      const { result } = renderHook(() => useColumnCount(containerRef, false));

      expect(result.current).toBe(1); // Below sm breakpoint
    });

    it('does not update state after unmount', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1100 });
      const containerRef = { current: container };

      const { result, unmount } = renderHook(() =>
        useColumnCount(containerRef, false)
      );

      const initialValue = result.current;
      unmount();

      // Simulate resize after unmount
      resizeTo(1400);

      // Value should not have changed (component is unmounted)
      expect(result.current).toBe(initialValue);
    });
  });

  describe('boundary widths (#457)', () => {
    it.each([
      [639, 1],
      [640, 2],
      [641, 2],
      [767, 2],
      [768, 2],
      [769, 2],
      [1023, 2],
      [1024, 3],
      [1279, 3],
      [1280, 4],
    ])('desktop container %ipx -> %i columns', (width, columns) => {
      const containerRef = containerOf(width);
      const { result } = renderHook(() => useColumnCount(containerRef, false));
      expect(result.current).toBe(columns);
    });

    it.each([
      [479, 1],
      [480, 2],
      [481, 2],
      [768, 2],
    ])('fluid mobile container %ipx -> %i columns', (width, columns) => {
      const containerRef = containerOf(width);
      const { result } = renderHook(() => useColumnCount(containerRef, true));
      expect(result.current).toBe(columns);
    });

    it('fixed mobile columns ignore the container width', () => {
      const containerRef = containerOf(320);
      const { result } = renderHook(() =>
        useFixedMobileColumnCount(containerRef, true)
      );
      expect(result.current).toBe(2);
    });

    it('fluid mobile follows resizes across 480px', () => {
      const containerRef = containerOf(600);
      const { result } = renderHook(() => useColumnCount(containerRef, true));
      expect(result.current).toBe(2);

      resizeTo(479);
      expect(result.current).toBe(1);

      resizeTo(480);
      expect(result.current).toBe(2);
    });

    it('debounces resizes', () => {
      const containerRef = containerOf(1100);
      const { result } = renderHook(() => useColumnCount(containerRef, false));

      act(() => {
        MockResizeObserver.getLatest().simulateResize(1400);
      });
      expect(result.current).toBe(3);

      act(() => {
        vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS);
      });
      expect(result.current).toBe(4);
    });
  });
});
