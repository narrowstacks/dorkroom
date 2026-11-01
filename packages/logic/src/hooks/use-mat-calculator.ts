import { useCallback, useState } from 'react';
import {
  bestFitBorders,
  calculateMatLayout,
  formatSignedMatValue,
  makeMatFormatter,
  MAT_CALCULATOR_DEFAULTS,
  type MatBorders,
  matBorderToInput,
  type MatCalculatorState,
  matRevealTolerance,
  matSnapStep,
} from '../constants/mat-calculator';
import { matCalculatorPersistence } from '../schemas/mat-calculator.schema';
import type { MeasurementUnit } from '../utils/unit-conversion';
import { usePersistedCalculator } from './use-persisted-calculator';

/** A single guide-bar cut card for the mat cutter. */
export interface MatGuideBarCut {
  title: string;
  offset: string;
  plunge: string;
  stop: string;
  setup: string;
}

/** A row in the "All dimensions" summary: [label, value, note]. */
export type MatDimensionRow = [string, string, string];

export interface UseMatCalculatorReturn {
  /** Current form values (fraction-friendly strings + bottomWeight flag). */
  values: MatCalculatorState;
  /** Update a single field. */
  set: (key: keyof MatCalculatorState, value: string | boolean) => void;
  /** Restore the default inputs and drop the persisted snapshot. */
  reset: () => void;
  /** Snap the borders to a centered best fit around the artwork. */
  applyBestFit: () => void;
  /** Preview of the best-fit borders, or null when the art cannot fit. */
  bestFitPreview: MatBorders | null;
  /** Formatter for a measurement in inches (nearest-1/16 fraction by default, placeholder when invalid). */
  fmt: (value: number) => string;
  /** Whether the outer mat and borders leave a positive window on both axes. */
  valid: boolean;
  /** Whether the artwork inputs are valid (enables reveal-based fitting). */
  revealMode: boolean;
  ow: number;
  oh: number;
  bt: number;
  bb: number;
  bl: number;
  br: number;
  aw: number;
  ah: number;
  windowW: number;
  windowH: number;
  revVal: number;
  overlapLeft: number;
  overlapTop: number;
  hasRevealMismatch: boolean;
  guideBarCuts: MatGuideBarCut[];
  dimensionRows: MatDimensionRow[];
}

export interface UseMatCalculatorOptions {
  /**
   * Render one measurement for display. Receives inches — form state,
   * persistence and every calculation stay imperial — and defaults to the
   * nearest-1/16 fraction with an inch mark. The web app passes a unit-aware
   * formatter so metric users read centimetres.
   */
  formatValue?: (inches: number) => string;
  /**
   * Grid that best fit snaps to and the matching reveal-mismatch tolerance:
   * 'imperial' (default) is 1/16", 'metric' is 1mm. Form state stays inches
   * either way.
   */
  unit?: MeasurementUnit;
  /**
   * Values to apply over the stored ones on mount, such as a calculator
   * link's (`matCalculatorLink.read`). See `usePersistedCalculator`.
   */
  overrides?: Partial<MatCalculatorState>;
}

/**
 * Hook for the single-window mat cut calculator. Owns the fraction-friendly
 * form state (persisted through the storage seam) and derives the window opening,
 * cutter guide-bar settings, and a best-fit border preview.
 *
 * @example
 * ```tsx
 * const mat = useMatCalculator();
 * mat.set('outerW', '16');
 * return <span>{mat.fmt(mat.windowW)}</span>;
 * ```
 */
export function useMatCalculator(
  options?: UseMatCalculatorOptions
): UseMatCalculatorReturn {
  const [values, setValues] = useState<MatCalculatorState>(
    MAT_CALCULATOR_DEFAULTS
  );

  const set = useCallback(
    (key: keyof MatCalculatorState, value: string | boolean) =>
      setValues((prev) => ({ ...prev, [key]: value })),
    []
  );

  const { resetToDefaults: reset } = usePersistedCalculator(
    matCalculatorPersistence,
    { values, setValues, overrides: options?.overrides }
  );

  const {
    ow,
    oh,
    bt,
    bb,
    bl,
    br,
    aw,
    ah,
    revVal,
    windowW,
    windowH,
    outerValid,
    valid,
    artValid,
    overlapLeft,
    overlapTop,
  } = calculateMatLayout(values);

  const fmt = makeMatFormatter(valid, options?.formatValue);

  const revealMode = artValid;
  const unit = options?.unit ?? 'imperial';
  const snapStep = matSnapStep(unit);
  const bestFitPreview =
    artValid && outerValid
      ? bestFitBorders(ow, oh, aw, ah, revVal, values.bottomWeight, snapStep)
      : null;
  const targetWindowW = revealMode ? aw - 2 * revVal : windowW;
  const targetWindowH = revealMode ? ah - 2 * revVal : windowH;
  const windowMismatchW = revealMode ? windowW - targetWindowW : 0;
  const windowMismatchH = revealMode ? windowH - targetWindowH : 0;
  const hasRevealMismatch =
    valid &&
    revealMode &&
    (Math.abs(windowMismatchW) > matRevealTolerance() ||
      Math.abs(windowMismatchH) > matRevealTolerance());

  const applyBestFit = () => {
    // Same snapped borders the preview shows.
    if (!bestFitPreview) return;
    set('borderTop', matBorderToInput(bestFitPreview.top, unit));
    set('borderBottom', matBorderToInput(bestFitPreview.bottom, unit));
    set('borderLeft', matBorderToInput(bestFitPreview.left, unit));
    set('borderRight', matBorderToInput(bestFitPreview.right, unit));
  };

  const guideBarCuts: MatGuideBarCut[] = [
    {
      title: 'Cut 01 · Top window edge',
      offset: fmt(bt),
      plunge: fmt(bl),
      stop: fmt(ow - br),
      setup: 'Face down · top edge against guide bar',
    },
    {
      title: 'Cut 02 · Bottom window edge',
      offset: fmt(bb),
      plunge: fmt(bl),
      stop: fmt(ow - br),
      setup: 'Face down · bottom edge against guide bar',
    },
    {
      title: 'Cut 03 · Left window edge',
      offset: fmt(bl),
      plunge: fmt(bt),
      stop: fmt(oh - bb),
      setup: 'Face down · left edge against guide bar',
    },
    {
      title: 'Cut 04 · Right window edge',
      offset: fmt(br),
      plunge: fmt(bt),
      stop: fmt(oh - bb),
      setup: 'Face down · right edge against guide bar',
    },
  ];

  const revealRows: MatDimensionRow[] = [
    ['Artwork', `${fmt(aw)} × ${fmt(ah)}`, 'as specified'],
    [
      'Actual reveal',
      `${formatSignedMatValue(fmt, overlapLeft)} L/R · ${formatSignedMatValue(fmt, overlapTop)} T/B`,
      'mat coverage onto the artwork edge; negative means a gap',
    ],
  ];

  const dimensionRows: MatDimensionRow[] = [
    ['Outer mat', `${fmt(ow)} × ${fmt(oh)}`, 'matches frame rabbet'],
    [
      'Window (sight opening)',
      `${fmt(windowW)} × ${fmt(windowH)}`,
      'cut from the face side, short point to short point',
    ],
    [
      'Borders',
      `${fmt(bt)} top · ${fmt(bb)} bot · ${fmt(bl)} L · ${fmt(br)} R`,
      'distance from outer edge to window edge',
    ],
    ...(revealMode ? revealRows : []),
  ];

  return {
    values,
    set,
    reset,
    applyBestFit,
    bestFitPreview,
    fmt,
    valid,
    revealMode,
    ow,
    oh,
    bt,
    bb,
    bl,
    br,
    aw,
    ah,
    windowW,
    windowH,
    revVal,
    overlapLeft,
    overlapTop,
    hasRevealMismatch,
    guideBarCuts,
    dimensionRows,
  };
}
