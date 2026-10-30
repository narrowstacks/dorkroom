import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalculatorMode } from '../tracked-events';
import {
  resetCalculatorAnalytics,
  useCalculatorAnalytics,
} from '../use-calculator-analytics';

/**
 * `@vercel/analytics`'s `track` only forwards to `window.va`, the queue the
 * real script installs in production. Stubbing that global lets the event
 * travel through the real `trackEvent` -> `track` call chain, so these tests
 * fail if the hook stops sending, not just if its bookkeeping changes.
 */
const va = vi.fn();

/** The exact `window.va` call one `calculator_used` event produces. */
const sent = (mode: CalculatorMode) => [
  'event',
  {
    name: 'calculator_used',
    data: { tool: 'border', mode },
    options: undefined,
  },
];

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
    va.mockReset();
    window.va = va;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.va;
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

    expect(va.mock.calls).toEqual([sent('symmetric')]);
  });

  it('reports nothing until the window has passed', () => {
    render('symmetric');
    act(() => vi.advanceTimersByTime(100));

    expect(va).not.toHaveBeenCalled();
  });

  it('skips the default a hydrated setting replaces', () => {
    // What a visitor with `enableOffset` stored actually renders: the default
    // first, their own mode once the mount effect has hydrated the form.
    const { rerender } = render('symmetric');
    rerender({ mode: 'asymmetric', hasResult: true });
    settle();

    expect(va.mock.calls).toEqual([sent('asymmetric')]);
  });

  it('still reports a mode the visitor switches to later', () => {
    const { rerender } = render('symmetric');
    settle();
    rerender({ mode: 'asymmetric', hasResult: true });
    settle();

    expect(va.mock.calls).toEqual([sent('symmetric'), sent('asymmetric')]);
  });

  it('reports each mode once however often it is returned to', () => {
    const { rerender } = render('symmetric');
    settle();
    rerender({ mode: 'asymmetric', hasResult: true });
    settle();
    rerender({ mode: 'symmetric', hasResult: true });
    settle();

    expect(va.mock.calls).toEqual([sent('symmetric'), sent('asymmetric')]);
  });

  it('does not count a calculator sitting without a result', () => {
    render('symmetric', false);
    settle();

    expect(va).not.toHaveBeenCalled();
  });
});
