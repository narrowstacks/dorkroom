import {
  ASPECT_RATIOS,
  BORDER_CALCULATOR_DEFAULTS,
  BORDER_CALCULATOR_STORAGE_KEY,
  encodePreset,
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_MIN,
  PAPER_SIZES,
  type PersistedBorderCalculatorState,
  SLIDER_MIN_BORDER,
} from '@dorkroom/logic';
import {
  MeasurementProvider,
  ToastProvider,
  useMeasurement,
} from '@dorkroom/ui';
import { act, renderHook, screen } from '@testing-library/react';
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

describe('useBorderCalculatorController unit-aware messages (#343)', () => {
  function toastWrapper({ children }: { children: ReactNode }) {
    return (
      <MeasurementProvider>
        <ToastProvider>{children}</ToastProvider>
      </MeasurementProvider>
    );
  }

  function renderInUnit(unit: 'imperial' | 'metric') {
    window.localStorage.clear();
    window.localStorage.setItem('dorkroom-measurement-unit', unit);
    window.history.replaceState(null, '', '/border');
    return renderHook(() => useBorderCalculatorController(), {
      wrapper: toastWrapper,
    });
  }

  function setCustomPaper(
    result: { current: ReturnType<typeof useBorderCalculatorController> },
    width: string,
    height: string
  ) {
    act(() => {
      result.current.form.setFieldValue('paperSize', 'custom');
    });
    act(() => {
      result.current.handlePaperWidthChange(width);
    });
    act(() => {
      result.current.handlePaperWidthBlur();
    });
    act(() => {
      result.current.handlePaperHeightChange(height);
    });
    act(() => {
      result.current.handlePaperHeightBlur();
    });
  }

  afterEach(() => {
    window.localStorage.clear();
  });

  it('prints the oversized custom paper warning in centimetres', () => {
    const { result } = renderInUnit('metric');
    setCustomPaper(result, '60', '80');

    expect(result.current.paperSizeWarning).toBe(
      'Custom paper (60×80cm) exceeds largest standard easel (50.8×61cm).'
    );
  });

  it('shows a typed cm paper size back unchanged after blur', () => {
    const { result } = renderInUnit('metric');
    setCustomPaper(result, '25', '30.3');

    expect(result.current.paperWidthInput).toBe('25');
    expect(result.current.paperHeightInput).toBe('30.3');
  });

  // Blurring a field shown in cm must not re-round an inch-entered size
  it('keeps imperial-stored 8.125in when its field is blurred in metric', () => {
    window.localStorage.clear();
    window.localStorage.setItem('dorkroom-measurement-unit', 'imperial');
    const { result } = renderHook(
      () => ({
        controller: useBorderCalculatorController(),
        measurement: useMeasurement(),
      }),
      { wrapper: toastWrapper }
    );
    const controller = {
      get current() {
        return result.current.controller;
      },
    };
    setCustomPaper(controller, '8.125', '10.125');
    expect(result.current.controller.formValues.customPaperWidth).toBe(8.125);

    act(() => {
      result.current.measurement.setUnit('metric');
    });
    expect(result.current.controller.paperWidthInput).toBe('20.638');

    // Click in and out without typing
    act(() => {
      result.current.controller.handlePaperWidthBlur();
    });
    expect(result.current.controller.formValues.customPaperWidth).toBe(8.125);

    // Re-commit the shown text explicitly
    act(() => {
      result.current.controller.handlePaperWidthChange('20.638');
    });
    act(() => {
      result.current.controller.handlePaperWidthBlur();
    });
    expect(result.current.controller.formValues.customPaperWidth).toBe(8.125);

    act(() => {
      result.current.measurement.setUnit('imperial');
    });
    expect(result.current.controller.paperWidthInput).toBe('8.125');
  });

  it('prints the oversized custom paper warning with inch marks', () => {
    const { result } = renderInUnit('imperial');
    setCustomPaper(result, '21', '25.5');

    expect(result.current.paperSizeWarning).toBe(
      'Custom paper (21×25.5") exceeds largest standard easel (20×24").'
    );
  });

  it('announces a clamped min border in centimetres', async () => {
    const { result } = renderInUnit('metric');
    act(() => {
      result.current.form.setFieldValue('minBorder', 2);
    });
    setCustomPaper(result, '5', '5');

    expect(
      await screen.findByText('Border reduced to 2.2cm to fit paper size')
    ).toBeTruthy();
  });

  it('announces a clamped min border in inches', async () => {
    const { result } = renderInUnit('imperial');
    act(() => {
      result.current.form.setFieldValue('minBorder', 2);
    });
    setCustomPaper(result, '2', '2');

    expect(
      await screen.findByText('Border reduced to 0.88" to fit paper size')
    ).toBeTruthy();
  });
});

// Issue #339: a manual Flip Paper on custom paper must survive a reload and a
// share link. 10x13 and 11x17 custom paper auto-orient to isLandscape: true
// (width < height), so isLandscape: false here can only come from a flip.
describe('useBorderCalculatorController manual paper flip', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/border');
    consoleLogSpy = vi
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  function persist(values: PersistedBorderCalculatorState) {
    window.localStorage.setItem(
      BORDER_CALCULATOR_STORAGE_KEY,
      JSON.stringify(values)
    );
  }

  it('keeps a manually flipped custom paper orientation across a reload', () => {
    persist({
      paperSize: 'custom',
      customPaperWidth: 10,
      customPaperHeight: 13,
      isLandscape: false,
      hasManuallyFlippedPaper: true,
    });

    const { result, rerender } = renderHook(
      () => useBorderCalculatorController(),
      { wrapper }
    );
    rerender();

    expect(result.current.formValues.paperSize).toBe('custom');
    expect(result.current.formValues.hasManuallyFlippedPaper).toBe(true);
    expect(result.current.formValues.isLandscape).toBe(false);
  });

  it('still derives orientation on reload when the paper was never flipped', () => {
    persist({
      paperSize: 'custom',
      customPaperWidth: 10,
      customPaperHeight: 13,
      isLandscape: false,
      hasManuallyFlippedPaper: false,
    });

    const { result, rerender } = renderHook(
      () => useBorderCalculatorController(),
      { wrapper }
    );
    rerender();

    expect(result.current.formValues.isLandscape).toBe(true);
  });

  it('keeps a manually flipped custom paper orientation from a share link', () => {
    const encoded = encodePreset({
      name: 'Flipped 11x17',
      settings: {
        ...BORDER_CALCULATOR_DEFAULTS,
        paperSize: 'custom',
        customPaperWidth: 11,
        customPaperHeight: 17,
        isLandscape: false,
        hasManuallyFlippedPaper: true,
      },
    });

    const { result, rerender } = renderControllerWithPreset(encoded);
    rerender();

    expect(result.current.formValues).toMatchObject({
      paperSize: 'custom',
      customPaperWidth: 11,
      customPaperHeight: 17,
      isLandscape: false,
      hasManuallyFlippedPaper: true,
    });
  });
});
