import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAT_CALCULATOR_DEFAULTS,
  MAT_CALCULATOR_STORAGE_KEY,
} from '../../constants/mat-calculator';
import type { PersistedValue } from '../../hooks/use-local-storage-form-persistence';
import { useMatCalculator } from '../../hooks/use-mat-calculator';
import { convertDisplayToInches } from '../../utils/unit-conversion';

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

  it('reset restores the defaults and drops the persisted snapshot', () => {
    window.localStorage.setItem(
      MAT_CALCULATOR_STORAGE_KEY,
      JSON.stringify({ outerW: '11', bottomWeight: true })
    );
    const { result } = renderHook(() => useMatCalculator());
    expect(result.current.values.outerW).toBe('11');

    act(() => result.current.reset());

    expect(result.current.values).toEqual(MAT_CALCULATOR_DEFAULTS);
    expect(window.localStorage.getItem(MAT_CALCULATOR_STORAGE_KEY)).toBeNull();
  });
});

describe('best fit never trips the reveal-mismatch warning (issue #341)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  type Setup = {
    outerW: string;
    outerH: string;
    artW: string;
    artH: string;
    reveal: string;
    bottomWeight?: boolean;
  };

  const fit = (setup: Setup, unit?: 'imperial' | 'metric') => {
    const hook = renderHook(() => useMatCalculator({ unit }));
    act(() => {
      const { set } = hook.result.current;
      set('outerW', setup.outerW);
      set('outerH', setup.outerH);
      set('artW', setup.artW);
      set('artH', setup.artH);
      set('reveal', setup.reveal);
      set('bottomWeight', setup.bottomWeight ?? false);
    });
    act(() => hook.result.current.applyBestFit());
    return hook.result.current;
  };

  it('imperial repro: 16×20 outer, 8 1/16×10 art, 1/4 reveal', () => {
    const calc = fit({
      outerW: '16',
      outerH: '20',
      artW: '8 1/16',
      artH: '10',
      reveal: '1/4',
    });

    // True border is 4 7/32 per side; independent 1/16 rounding gave 4 1/4
    // both sides. Floor/ceil keeps the 8 7/16 total, so the window is exact.
    expect(calc.values.borderLeft).toBe('4 3/16');
    expect(calc.values.borderRight).toBe('4 1/4');
    expect(calc.windowW).toBeCloseTo(7.5625, 9);
    expect(calc.hasRevealMismatch).toBe(false);
  });

  it('metric repro: 40×50 cm outer, 20×25 cm art, 0.5 cm reveal', () => {
    const cm = (v: number) => String(v / 2.54);
    const calc = fit(
      {
        outerW: cm(40),
        outerH: cm(50),
        artW: cm(20),
        artH: cm(25),
        reveal: cm(0.5),
      },
      'metric'
    );

    // 40 - 19 = 21cm of border: 10.5cm per side, exactly on the mm grid.
    expect(calc.windowW * 2.54).toBeCloseTo(19, 3);
    expect(calc.windowH * 2.54).toBeCloseTo(24, 3);
    expect(calc.hasRevealMismatch).toBe(false);
    // Stored inch strings read back as whole millimetres in the cm fields.
    for (const key of [
      'borderLeft',
      'borderRight',
      'borderTop',
      'borderBottom',
    ] as const) {
      const mm = parseFloat(calc.values[key]) * 25.4;
      expect(Math.abs(mm - Math.round(mm))).toBeLessThan(1e-3);
    }
  });

  it('metric odd-mm total splits floor/ceil by one mm', () => {
    const calc = fit(
      {
        outerW: String(40 / 2.54),
        outerH: String(50 / 2.54),
        artW: String(20.1 / 2.54),
        artH: String(25 / 2.54),
        reveal: String(0.5 / 2.54),
      },
      'metric'
    );
    const l = parseFloat(calc.values.borderLeft) * 25.4;
    const r = parseFloat(calc.values.borderRight) * 25.4;
    expect(Math.round(r - l)).toBe(1);
    expect(calc.hasRevealMismatch).toBe(false);
  });

  it('keeps bottom weighting', () => {
    const calc = fit({
      outerW: '16',
      outerH: '20',
      artW: '11',
      artH: '14',
      reveal: '1/4',
      bottomWeight: true,
    });
    expect(calc.values.borderTop).toBe('3');
    expect(calc.values.borderBottom).toBe('3 1/2');
    expect(calc.hasRevealMismatch).toBe(false);
  });

  it('previews exactly what it applies', () => {
    const hook = renderHook(() => useMatCalculator());
    act(() => {
      hook.result.current.set('artW', '8 1/16');
      hook.result.current.set('artH', '10');
    });
    const preview = hook.result.current.bestFitPreview;
    act(() => hook.result.current.applyBestFit());
    expect(preview).not.toBeNull();
    expect(hook.result.current.bl).toBeCloseTo(preview?.left ?? NaN, 9);
    expect(hook.result.current.br).toBeCloseTo(preview?.right ?? NaN, 9);
    expect(hook.result.current.bt).toBeCloseTo(preview?.top ?? NaN, 9);
    expect(hook.result.current.bb).toBeCloseTo(preview?.bottom ?? NaN, 9);
  });

  it('still warns for a hand-entered mismatched mat', () => {
    const hook = renderHook(() => useMatCalculator());
    act(() => {
      hook.result.current.set('artW', '8 1/16');
      hook.result.current.set('artH', '10');
      hook.result.current.set('borderLeft', '4 1/4');
      hook.result.current.set('borderRight', '4 1/4');
      hook.result.current.set('borderTop', '5');
      hook.result.current.set('borderBottom', '5');
    });
    // Window 7.5 vs 7.5625 target: 1/16" off, well over the 1/64" tolerance.
    expect(hook.result.current.hasRevealMismatch).toBe(true);

    const metric = renderHook(() => useMatCalculator({ unit: 'metric' }));
    act(() => {
      metric.result.current.set('borderLeft', '2');
      metric.result.current.set('borderRight', '2');
    });
    expect(metric.result.current.hasRevealMismatch).toBe(true);
  });

  it('property: best fit never self-triggers the warning', () => {
    const sixteenths = (n: number) => `${Math.floor(n / 16)} ${n % 16}/16`;
    let checked = 0;
    for (const [ow, oh] of [
      [16, 20],
      [11, 14],
      [8, 10],
      [20, 24],
      [24, 30],
    ]) {
      for (let aw16 = 4 * 16; aw16 < 10 * 16; aw16 += 23) {
        for (const rev of ['0', '1/8', '1/4', '3/16']) {
          for (const bottomWeight of [false, true]) {
            const calc = fit(
              {
                outerW: String(ow),
                outerH: String(oh),
                artW: sixteenths(aw16),
                artH: sixteenths(aw16 + 33),
                reveal: rev,
                bottomWeight,
              },
              'imperial'
            );
            if (!calc.bestFitPreview) continue;
            expect(calc.valid).toBe(true);
            expect(calc.hasRevealMismatch).toBe(false);
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('property: metric best fit, via 3-decimal stored inches, never warns (also after switching to imperial)', () => {
    // Same path as the page: cm typed -> convertDisplayToInches.
    const inches = (cm: number) => String(convertDisplayToInches(cm, 'metric'));
    let checked = 0;
    for (const [ow, oh] of [
      [40, 50],
      [40.6, 50.8],
      [30.5, 40.5],
      [27.9, 35.6],
    ]) {
      for (let mm = 150; mm < 290; mm += 7) {
        for (const revMm of [0, 3, 5, 6.5]) {
          for (const bottomWeight of [false, true]) {
            const setup = {
              outerW: inches(ow),
              outerH: inches(oh),
              artW: inches(mm / 10),
              artH: inches((mm + 35) / 10),
              reveal: inches(revMm / 10),
              bottomWeight,
            };
            const calc = fit(setup, 'metric');
            if (!calc.bestFitPreview) continue;
            expect(calc.hasRevealMismatch).toBe(false);
            checked += 1;

            // Same stored values read by an imperial-unit hook.
            const switched = renderHook(() => useMatCalculator());
            act(() => {
              const { set } = switched.result.current;
              for (const key of [
                'outerW',
                'outerH',
                'artW',
                'artH',
                'reveal',
                'borderTop',
                'borderBottom',
                'borderLeft',
                'borderRight',
              ] as const) {
                set(key, calc.values[key]);
              }
              set('bottomWeight', bottomWeight);
            });
            expect(switched.result.current.hasRevealMismatch).toBe(false);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});
