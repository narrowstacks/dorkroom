import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MAT_CALCULATOR_STORAGE_KEY } from '../../constants/mat-calculator';
import type { PersistedValue } from '../../hooks/use-local-storage-form-persistence';
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

  it('renders every derived string through an injected formatter', () => {
    const cm = (inches: number) => `${(inches * 2.54).toFixed(1)}cm`;
    const { result } = renderHook(() => useMatCalculator({ formatValue: cm }));

    // Form state and the math stay in inches; only the strings change unit.
    expect(result.current.values.outerW).toBe('16');
    expect(result.current.windowW).toBeCloseTo(10.5, 5);
    expect(result.current.fmt(result.current.windowW)).toBe('26.7cm');
    // The guide-bar cards and dimension rows are built with the same fmt.
    expect(result.current.guideBarCuts[0].offset).toBe('7.6cm');
    expect(result.current.dimensionRows[0][1]).toBe('40.6cm × 50.8cm');
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

  describe('reveal-mode gap (issue #342)', () => {
    // 16×20 board with the default borders keeps a 10½"×13½" window. Art
    // smaller than that window (8×10 at a ¼" reveal) makes the mat's window
    // larger than the art — a gap, not an overlap — so overlapLeft/Top go
    // negative.
    it('reports negative overlapLeft/overlapTop when the window is larger than the art', () => {
      const { result } = renderHook(() => useMatCalculator());
      act(() => result.current.set('artW', '8'));
      act(() => result.current.set('artH', '10'));

      expect(result.current.overlapLeft).toBeCloseTo(-1.25, 5);
      expect(result.current.overlapTop).toBeCloseTo(-1.75, 5);
      expect(result.current.hasRevealMismatch).toBe(true);
    });

    it('renders the gap as a signed value in the "Actual reveal" row instead of blanking it', () => {
      const { result } = renderHook(() => useMatCalculator());
      act(() => result.current.set('artW', '8'));
      act(() => result.current.set('artH', '10'));

      const revealRow = result.current.dimensionRows.find(
        ([label]) => label === 'Actual reveal'
      );
      expect(revealRow).toBeDefined();
      expect(revealRow?.[1]).toBe('-1 1/4" L/R · -1 3/4" T/B');
    });

    it('renders the gap through an injected metric formatter too', () => {
      const cm = (inches: number) => `${(inches * 2.54).toFixed(1)}cm`;
      const { result } = renderHook(() =>
        useMatCalculator({ formatValue: cm })
      );
      act(() => result.current.set('artW', '8'));
      act(() => result.current.set('artH', '10'));

      const revealRow = result.current.dimensionRows.find(
        ([label]) => label === 'Actual reveal'
      );
      expect(revealRow?.[1]).toBe('-3.2cm L/R · -4.4cm T/B');
    });
  });

  describe('hydration validation (issue #239)', () => {
    const seed = (payload: Record<string, PersistedValue>) => {
      window.localStorage.setItem(
        MAT_CALCULATOR_STORAGE_KEY,
        JSON.stringify(payload)
      );
    };

    it('hydrates valid stored strings unchanged', () => {
      seed({ outerW: '20', borderTop: '3 1/4', bottomWeight: true });

      const { result } = renderHook(() => useMatCalculator());

      expect(result.current.values.outerW).toBe('20');
      expect(result.current.values.borderTop).toBe('3 1/4');
      expect(result.current.values.bottomWeight).toBe(true);
    });

    it('falls back to defaults for wrong-typed fields', () => {
      seed({ outerW: 20, artW: null, bottomWeight: 'yes', outerH: '18' });

      const { result } = renderHook(() => useMatCalculator());

      // Wrong types are skipped; the valid string still hydrates.
      expect(result.current.values.outerW).toBe('16');
      expect(result.current.values.artW).toBe('11');
      expect(result.current.values.bottomWeight).toBe(false);
      expect(result.current.values.outerH).toBe('18');
    });
  });
});
