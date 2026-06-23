import { useCallback, useState } from 'react';
import {
  bestFitBorders,
  MAT_CALCULATOR_DEFAULTS,
  MAT_CALCULATOR_STORAGE_KEY,
  type MatBorders,
  type MatCalculatorState,
  makeMatFormatter,
  parseMatInput,
  toFractionInput,
} from '../constants/mat-calculator';
import { useLocalStorageFormPersistence } from './use-local-storage-form-persistence';

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
  /** Snap the borders to a centered best fit around the artwork. */
  applyBestFit: () => void;
  /** Preview of the best-fit borders, or null when the art cannot fit. */
  bestFitPreview: MatBorders | null;
  /** Formatter that renders inches as a nearest-1/16 fraction (or placeholder when invalid). */
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

/**
 * Hook for the single-window mat cut calculator. Owns the fraction-friendly
 * form state (persisted to localStorage) and derives the window opening,
 * cutter guide-bar settings, and a best-fit border preview.
 *
 * @example
 * ```tsx
 * const mat = useMatCalculator();
 * mat.set('outerW', '16');
 * return <span>{mat.fmt(mat.windowW)}</span>;
 * ```
 */
export function useMatCalculator(): UseMatCalculatorReturn {
  const [values, setValues] = useState<MatCalculatorState>(
    MAT_CALCULATOR_DEFAULTS
  );

  const set = useCallback(
    (key: keyof MatCalculatorState, value: string | boolean) =>
      setValues((prev) => ({ ...prev, [key]: value })),
    []
  );

  // Adapter so the TanStack-Form-shaped persistence hook can drive useState.
  const persistenceForm = {
    setFieldValue: (
      key: keyof MatCalculatorState,
      value: MatCalculatorState[keyof MatCalculatorState]
    ) => setValues((prev) => ({ ...prev, [key]: value })),
  };

  useLocalStorageFormPersistence({
    storageKey: MAT_CALCULATOR_STORAGE_KEY,
    form: persistenceForm,
    formValues: values,
    persistKeys: [
      'outerW',
      'outerH',
      'borderTop',
      'borderBottom',
      'borderLeft',
      'borderRight',
      'artW',
      'artH',
      'reveal',
      'bottomWeight',
    ],
  });

  const ow = parseMatInput(values.outerW);
  const oh = parseMatInput(values.outerH);
  const bt = parseMatInput(values.borderTop);
  const bb = parseMatInput(values.borderBottom);
  const bl = parseMatInput(values.borderLeft);
  const br = parseMatInput(values.borderRight);
  const aw = parseMatInput(values.artW);
  const ah = parseMatInput(values.artH);
  const rev = parseMatInput(values.reveal);
  const revVal = isNaN(rev) ? 0 : rev;

  const bordersValid =
    !isNaN(bt) &&
    !isNaN(bb) &&
    !isNaN(bl) &&
    !isNaN(br) &&
    bt >= 0 &&
    bb >= 0 &&
    bl >= 0 &&
    br >= 0;
  const outerValid = !isNaN(ow) && !isNaN(oh) && ow > 0 && oh > 0;
  const windowW = ow - bl - br;
  const windowH = oh - bt - bb;
  const valid = outerValid && bordersValid && windowW > 0 && windowH > 0;

  const fmt = makeMatFormatter(valid);

  const artValid = !isNaN(aw) && !isNaN(ah) && aw > 0 && ah > 0;
  const revealMode = artValid;
  const bestFitPreview =
    artValid && outerValid
      ? bestFitBorders(ow, oh, aw, ah, revVal, values.bottomWeight)
      : null;
  const targetWindowW = revealMode ? aw - 2 * revVal : windowW;
  const targetWindowH = revealMode ? ah - 2 * revVal : windowH;
  const windowMismatchW = revealMode ? windowW - targetWindowW : 0;
  const windowMismatchH = revealMode ? windowH - targetWindowH : 0;
  const overlapLeft = revealMode ? (aw - windowW) / 2 : NaN;
  const overlapTop = revealMode ? (ah - windowH) / 2 : NaN;
  const hasRevealMismatch =
    valid &&
    revealMode &&
    (Math.abs(windowMismatchW) > 1e-3 || Math.abs(windowMismatchH) > 1e-3);

  const applyBestFit = () => {
    const fit = bestFitBorders(ow, oh, aw, ah, revVal, values.bottomWeight);
    if (!fit) return;
    set('borderTop', toFractionInput(fit.top));
    set('borderBottom', toFractionInput(fit.bottom));
    set('borderLeft', toFractionInput(fit.left));
    set('borderRight', toFractionInput(fit.right));
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
    ...(revealMode
      ? ([
          ['Artwork', `${fmt(aw)} × ${fmt(ah)}`, 'as specified'],
          [
            'Actual reveal',
            `${fmt(overlapLeft)} L/R · ${fmt(overlapTop)} T/B`,
            'mat coverage onto the artwork edge',
          ],
        ] as MatDimensionRow[])
      : []),
  ];

  return {
    values,
    set,
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
