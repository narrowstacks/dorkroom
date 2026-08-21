import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalculatorMode } from '../events';
import {
  reportedCalculatorModes,
  resetCalculatorAnalytics,
  useCalculatorAnalytics,
} from '../use-calculator-analytics';

/**
 * The settle window exists because a calculator's first render shows its
 * *default* mode, not the visitor's: the stored form hydrates in a mount effect
 * and a shared preset is applied in another, both after that render. Without
 * the wait, everyone with a saved non-default mode is filed under the default
 * one first, and the default's count quietly absorbs every other mode.
 */
describe('useCalculatorAnalytics', () => {
  beforeEach(() => {
    resetCalculatorAnalytics();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const render = (mode: CalculatorMode, hasResult = true) =>
    renderHook(
      (props: { mode: CalculatorMode; hasResult: boolean }) =>
        useCalculatorAnalytics({ tool: 'border', ...props }),
      { initialProps: { mode, hasResult } }
    );

  const settle = () => act(() => vi.advanceTimersByTime(1000));

  it('reports a mode that holds', () => {
    render('symmetric');
    settle();

    expect(reportedCalculatorModes()).toEqual(['border:symmetric']);
  });

  it('reports nothing until the window has passed', () => {
    render('symmetric');
    act(() => vi.advanceTimersByTime(100));

    expect(reportedCalculatorModes()).toEqual([]);
  });

  it('skips the default a hydrated setting replaces', () => {
    // What a visitor with `enableOffset` stored actually renders: the default
    // first, their own mode once the mount effect has hydrated the form.
    const { rerender } = render('symmetric');
    rerender({ mode: 'asymmetric', hasResult: true });
    settle();

    expect(reportedCalculatorModes()).toEqual(['border:asymmetric']);
  });

  it('still reports a mode the visitor switches to later', () => {
    const { rerender } = render('symmetric');
    settle();
    rerender({ mode: 'asymmetric', hasResult: true });
    settle();

    expect(reportedCalculatorModes()).toEqual([
      'border:symmetric',
      'border:asymmetric',
    ]);
  });

  it('reports each mode once however often it is returned to', () => {
    const { rerender } = render('symmetric');
    settle();
    rerender({ mode: 'asymmetric', hasResult: true });
    settle();
    rerender({ mode: 'symmetric', hasResult: true });
    settle();

    expect(reportedCalculatorModes()).toEqual([
      'border:symmetric',
      'border:asymmetric',
    ]);
  });

  it('does not count a calculator sitting without a result', () => {
    render('symmetric', false);
    settle();

    expect(reportedCalculatorModes()).toEqual([]);
  });
});
