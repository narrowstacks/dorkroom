/* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- Test file requires type assertions for mocking ResizeObserver */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Breakpoint constants (matching the component)
const BREAKPOINT_XL = 1280;
const BREAKPOINT_LG = 1024;
const BREAKPOINT_SM = 640;

// Mock ResizeObserver for testing
type ResizeCallback = ResizeObserverCallback;

class MockResizeObserver {
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
    const entries: ResizeObserverEntry[] = Array.from(
      this.observedElements
    ).map((element) => ({
      target: element,
      contentRect: { width, height: 600 } as DOMRectReadOnly,
      borderBoxSize: [
        { blockSize: 600, inlineSize: width },
      ] as ResizeObserverSize[],
      contentBoxSize: [
        { blockSize: 600, inlineSize: width },
      ] as ResizeObserverSize[],
      devicePixelContentBoxSize: [
        { blockSize: 600, inlineSize: width },
      ] as ResizeObserverSize[],
    }));
    this.callback(entries, this);
  }

  static reset() {
    MockResizeObserver.instances = [];
  }

  static getLatest(): MockResizeObserver | undefined {
    return MockResizeObserver.instances[
      MockResizeObserver.instances.length - 1
    ];
  }
}

// Hook implementation extracted for testing
function useResponsiveColumnCount(
  containerRef: React.RefObject<HTMLDivElement | null>,
  isMobile: boolean
): number {
  const { useState, useEffect } = require('react');
  const [columnCount, setColumnCount] = useState(isMobile ? 2 : 3);

  useEffect(() => {
    if (isMobile) {
      setColumnCount(2);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const calculateColumns = (width: number): number => {
      if (width >= BREAKPOINT_XL) return 4;
      if (width >= BREAKPOINT_LG) return 3;
      if (width >= BREAKPOINT_SM) return 2;
      return 1;
    };

    let isMounted = true;

    const observer = new ResizeObserver((entries) => {
      if (!isMounted) return;

      for (const entry of entries) {
        const width = entry.contentRect.width;
        setColumnCount(calculateColumns(width));
      }
    });

    observer.observe(container);
    setColumnCount(calculateColumns(container.clientWidth));

    return () => {
      isMounted = false;
      observer.disconnect();
    };
  }, [containerRef, isMobile]);

  return columnCount;
}

describe('useResponsiveColumnCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockResizeObserver.reset();
    global.ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    MockResizeObserver.reset();
  });

  describe('initial column count', () => {
    it('returns 2 columns for mobile layout', () => {
      const containerRef = { current: document.createElement('div') };

      const { result } = renderHook(() =>
        useResponsiveColumnCount(containerRef, true)
      );

      expect(result.current).toBe(2);
    });

    it('returns 3 columns for desktop layout as default', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1100 });
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useResponsiveColumnCount(containerRef, false)
      );

      // Should calculate based on container width (1100px = lg breakpoint = 3 columns)
      expect(result.current).toBe(3);
    });
  });

  describe('breakpoint calculations', () => {
    it('returns 1 column for width < 640px (xs breakpoint)', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 500 });
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useResponsiveColumnCount(containerRef, false)
      );

      expect(result.current).toBe(1);
    });

    it('returns 2 columns for width >= 640px and < 1024px (sm breakpoint)', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 800 });
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useResponsiveColumnCount(containerRef, false)
      );

      expect(result.current).toBe(2);
    });

    it('returns 3 columns for width >= 1024px and < 1280px (lg breakpoint)', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1100 });
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useResponsiveColumnCount(containerRef, false)
      );

      expect(result.current).toBe(3);
    });

    it('returns 4 columns for width >= 1280px (xl breakpoint)', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1400 });
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useResponsiveColumnCount(containerRef, false)
      );

      expect(result.current).toBe(4);
    });

    it('returns exactly 2 columns at sm breakpoint boundary (640px)', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: BREAKPOINT_SM });
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useResponsiveColumnCount(containerRef, false)
      );

      expect(result.current).toBe(2);
    });

    it('returns exactly 3 columns at lg breakpoint boundary (1024px)', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: BREAKPOINT_LG });
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useResponsiveColumnCount(containerRef, false)
      );

      expect(result.current).toBe(3);
    });

    it('returns exactly 4 columns at xl breakpoint boundary (1280px)', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: BREAKPOINT_XL });
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useResponsiveColumnCount(containerRef, false)
      );

      expect(result.current).toBe(4);
    });
  });

  describe('ResizeObserver behavior', () => {
    it('creates a ResizeObserver when not in mobile mode', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1000 });
      const containerRef = { current: container };

      renderHook(() => useResponsiveColumnCount(containerRef, false));

      expect(MockResizeObserver.instances.length).toBe(1);
    });

    it('does not create ResizeObserver in mobile mode', () => {
      const containerRef = { current: document.createElement('div') };

      renderHook(() => useResponsiveColumnCount(containerRef, true));

      // No ResizeObserver should be created for mobile
      expect(MockResizeObserver.instances.length).toBe(0);
    });

    it('updates column count when container is resized', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1100 });
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useResponsiveColumnCount(containerRef, false)
      );

      expect(result.current).toBe(3); // lg breakpoint

      // Simulate resize to xl breakpoint
      act(() => {
        const observer = MockResizeObserver.getLatest();
        observer?.simulateResize(1400);
      });

      expect(result.current).toBe(4);
    });

    it('updates column count from xl to sm on resize', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1400 });
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useResponsiveColumnCount(containerRef, false)
      );

      expect(result.current).toBe(4); // xl breakpoint

      // Simulate resize to sm breakpoint
      act(() => {
        const observer = MockResizeObserver.getLatest();
        observer?.simulateResize(700);
      });

      expect(result.current).toBe(2);
    });

    it('disconnects ResizeObserver on unmount', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1000 });
      const containerRef = { current: container };

      const { unmount } = renderHook(() =>
        useResponsiveColumnCount(containerRef, false)
      );

      const observer = MockResizeObserver.getLatest();
      expect(observer).toBeDefined();
      const disconnectSpy = vi.spyOn(
        observer as MockResizeObserver,
        'disconnect'
      );

      unmount();

      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('observes the container element', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1000 });
      const containerRef = { current: container };

      renderHook(() => useResponsiveColumnCount(containerRef, false));

      const observer = MockResizeObserver.getLatest();
      expect(observer?.observedElements.has(container)).toBe(true);
    });
  });

  describe('mobile/desktop mode switching', () => {
    it('always returns 2 columns in mobile mode regardless of container width', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1400 }); // xl width
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useResponsiveColumnCount(containerRef, true)
      );

      expect(result.current).toBe(2);
    });

    it('switches from responsive to fixed columns when isMobile changes to true', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1400 });
      const containerRef = { current: container };

      const { result, rerender } = renderHook(
        ({ isMobile }) => useResponsiveColumnCount(containerRef, isMobile),
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
        ({ isMobile }) => useResponsiveColumnCount(containerRef, isMobile),
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

      const { result } = renderHook(() =>
        useResponsiveColumnCount(containerRef, false)
      );

      // Should use default (3 columns for non-mobile)
      expect(result.current).toBe(3);
    });

    it('handles container with zero width', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 0 });
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useResponsiveColumnCount(containerRef, false)
      );

      expect(result.current).toBe(1); // Below sm breakpoint
    });

    it('does not update state after unmount', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 1100 });
      const containerRef = { current: container };

      const { result, unmount } = renderHook(() =>
        useResponsiveColumnCount(containerRef, false)
      );

      const initialValue = result.current;
      unmount();

      // Simulate resize after unmount
      act(() => {
        const observer = MockResizeObserver.getLatest();
        observer?.simulateResize(1400);
      });

      // Value should not have changed (component is unmounted)
      expect(result.current).toBe(initialValue);
    });
  });
});
