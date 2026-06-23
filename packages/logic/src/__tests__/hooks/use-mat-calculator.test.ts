import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMatCalculator } from '../../hooks/use-mat-calculator';

describe('useMatCalculator', () => {
  beforeEach(() => {
    // Start from built-in defaults, not persisted state.
    window.localStorage.clear();
  });

  it('derives the default window opening from a 16×20 board', () => {
    const { result } = renderHook(() => useMatCalculator());

    expect(result.current.valid).toBe(true);
    // 16 − 2¾ − 2¾ = 10½ wide, 20 − 3 − 3½ = 13½ tall.
    expect(result.current.windowW).toBeCloseTo(10.5, 5);
    expect(result.current.windowH).toBeCloseTo(13.5, 5);
    expect(result.current.fmt(result.current.windowW)).toBe('10 1/2"');
    expect(result.current.fmt(result.current.windowH)).toBe('13 1/2"');
  });

  it('recomputes the window when a field changes', () => {
    const { result } = renderHook(() => useMatCalculator());

    act(() => result.current.set('outerW', '20'));

    expect(result.current.windowW).toBeCloseTo(14.5, 5);
    expect(result.current.fmt(result.current.windowW)).toBe('14 1/2"');
  });

  it('marks the layout invalid when borders leave no window', () => {
    const { result } = renderHook(() => useMatCalculator());

    act(() => result.current.set('borderLeft', '20'));

    expect(result.current.valid).toBe(false);
    // Invalid layouts render the placeholder rather than a measurement.
    expect(result.current.fmt(result.current.windowW)).toBe('· · ·');
  });

  it('offers a best-fit preview and applies it to the borders', () => {
    const { result } = renderHook(() => useMatCalculator());

    expect(result.current.bestFitPreview).not.toBeNull();

    act(() => result.current.applyBestFit());

    // 11×14 art at ¼" reveal centered in a 16×20 board:
    // horizontal border (16−10.5)/2 = 2¾, vertical (20−13.5)/2 = 3¼.
    expect(result.current.values.borderLeft).toBe('2 3/4');
    expect(result.current.values.borderRight).toBe('2 3/4');
    expect(result.current.values.borderTop).toBe('3 1/4');
    expect(result.current.values.borderBottom).toBe('3 1/4');
    expect(result.current.valid).toBe(true);
  });

  it('builds four guide-bar cuts', () => {
    const { result } = renderHook(() => useMatCalculator());

    expect(result.current.guideBarCuts).toHaveLength(4);
    expect(result.current.guideBarCuts[0].title).toContain('Cut 01');
    // Cut 01 stop = outer width − right border = 16 − 2¾ = 13¼".
    expect(result.current.guideBarCuts[0].stop).toBe('13 1/4"');
  });
});
