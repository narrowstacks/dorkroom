import {
  ASPECT_RATIOS,
  BORDER_CALCULATOR_DEFAULTS,
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_MIN,
  PAPER_SIZES,
  SLIDER_MIN_BORDER,
} from '@dorkroom/logic';
import { MeasurementProvider } from '@dorkroom/ui';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBorderCalculatorController } from '../use-border-calculator-controller';

/**
 * Builds a v2 share payload from raw parts. `encodePreset` cannot produce the
 * out-of-range values this file is about, and a share link is hand-editable,
 * so the test writes the payload the way an attacker would.
 */
function encodeRawV2(name: string, ...parts: (string | number)[]): string {
  const raw = ['2', encodeURIComponent(name), ...parts].join('|');
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const indexOfAspectRatio = (value: string) =>
  ASPECT_RATIOS.findIndex((option) => option.value === value);
const indexOfPaperSize = (value: string) =>
  PAPER_SIZES.findIndex((option) => option.value === value);

/** Bit 0 | bit 2: offsets enabled and blades shown. */
const OFFSETS_AND_BLADES = 5;

function wrapper({ children }: { children: ReactNode }) {
  return <MeasurementProvider>{children}</MeasurementProvider>;
}

function renderControllerWithPreset(encoded: string) {
  window.history.replaceState(null, '', `/border?preset=${encoded}`);
  return renderHook(() => useBorderCalculatorController(), { wrapper });
}

describe('useBorderCalculatorController preset application', () => {
  // A rejected link is reported through debugLog/debugError by design
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/border');
    consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    consoleLogSpy = vi
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('clamps an out-of-bounds share link before it reaches form state', () => {
    const { result, rerender } = renderControllerWithPreset(
      encodeRawV2(
        'Hostile',
        indexOfAspectRatio('3:2'),
        indexOfPaperSize('8x10'),
        -500,
        999_900,
        -999_900,
        OFFSETS_AND_BLADES
      )
    );

    // Re-rendering matters: TanStack Form's `useForm` calls `form.update` on
    // every render, which would revert the applied values if `reset` had been
    // allowed to redefine the form's defaults.
    rerender();

    expect(result.current.formValues.minBorder).toBe(SLIDER_MIN_BORDER);
    expect(result.current.formValues.horizontalOffset).toBe(OFFSET_SLIDER_MAX);
    expect(result.current.formValues.verticalOffset).toBe(OFFSET_SLIDER_MIN);
    expect(result.current.formValues.lastValidMinBorder).toBe(
      SLIDER_MIN_BORDER
    );
  });

  it('applies an in-range share link unchanged', () => {
    const { result } = renderControllerWithPreset(
      encodeRawV2(
        'Friendly',
        indexOfAspectRatio('4:3'),
        indexOfPaperSize('11x14'),
        75,
        -125,
        50,
        OFFSETS_AND_BLADES
      )
    );

    expect(result.current.formValues).toMatchObject({
      aspectRatio: '4:3',
      paperSize: '11x14',
      minBorder: 0.75,
      horizontalOffset: -1.25,
      verticalOffset: 0.5,
      enableOffset: true,
    });
    expect(result.current.presetName).toBe('Friendly');
  });

  it('rejects a malformed share link and keeps the defaults', () => {
    const { result } = renderControllerWithPreset('not-a-real-payload');

    expect(result.current.loadedPreset).toBeNull();
    expect(result.current.formValues.minBorder).toBe(
      BORDER_CALCULATOR_DEFAULTS.minBorder
    );
    expect(result.current.formValues.aspectRatio).toBe(
      BORDER_CALCULATOR_DEFAULTS.aspectRatio
    );
  });

  it('leaves the form defaults intact so a later reset still restores them', () => {
    const { result } = renderHook(() => useBorderCalculatorController(), {
      wrapper,
    });

    act(() => {
      result.current.applyPresetSettings({
        ...BORDER_CALCULATOR_DEFAULTS,
        aspectRatio: '1:1',
        paperSize: '16x20',
        minBorder: 1.25,
        hasManuallyFlippedPaper: false,
      });
    });

    expect(result.current.formValues.minBorder).toBe(1.25);
    expect(result.current.formValues.paperSize).toBe('16x20');

    act(() => {
      result.current.resetToDefaults();
    });

    expect(result.current.formValues.minBorder).toBe(
      BORDER_CALCULATOR_DEFAULTS.minBorder
    );
    expect(result.current.formValues.paperSize).toBe(
      BORDER_CALCULATOR_DEFAULTS.paperSize
    );
    expect(result.current.formValues.aspectRatio).toBe(
      BORDER_CALCULATOR_DEFAULTS.aspectRatio
    );
  });
});
