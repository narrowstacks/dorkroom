import { DEFAULT_BORDER_PRESETS } from '@dorkroom/logic';
import { MeasurementProvider } from '@dorkroom/ui';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBorderCalculatorController } from '../use-border-calculator-controller';

function wrapper({ children }: { children: ReactNode }) {
  return <MeasurementProvider>{children}</MeasurementProvider>;
}

/**
 * `@vercel/analytics`'s `track` only forwards to `window.va`, the queue the
 * real script installs in production. Stubbing that global lets the event
 * travel through the real `trackEvent` -> `track` call chain.
 */
describe('useBorderCalculatorController preset analytics', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.va = vi.fn();
  });

  afterEach(() => {
    delete window.va;
  });

  it('tracks preset_applied with the built-in preset index', () => {
    const { result } = renderHook(() => useBorderCalculatorController(), {
      wrapper,
    });

    act(() => {
      result.current.handleSelectPreset(DEFAULT_BORDER_PRESETS[0].id);
    });

    expect(window.va).toHaveBeenCalledWith('event', {
      name: 'preset_applied',
      data: { tool: 'border', preset: 0 },
      options: undefined,
    });
    expect(result.current.formValues.paperSize).toBe(
      DEFAULT_BORDER_PRESETS[0].settings.paperSize
    );
  });

  it('never tracks a preset the user saved themselves', () => {
    const { result } = renderHook(() => useBorderCalculatorController(), {
      wrapper,
    });

    act(() => {
      result.current.handleSelectPreset('user-preset-not-built-in');
    });

    expect(window.va).not.toHaveBeenCalled();
  });
});
