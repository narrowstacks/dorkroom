import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ASPECT_RATIOS,
  PAPER_SIZES,
} from '../../../constants/border-calculator';
import type { BorderCalculatorState } from '../../../types/border-calculator';
import { computeBorderLayout } from '../../../utils/border-layout';
import type { MeasurementUnit } from '../../../utils/unit-conversion';
import { initialState } from '../use-border-calculator-state';
import { useDimensionCalculations } from '../use-dimension-calculations';
import { useGeometryCalculations } from '../use-geometry-calculations';

// Temporary: proves computeBorderLayout reproduces the old two-hook pipeline
// exactly before the hooks are removed.

function useOldPipeline(state: BorderCalculatorState, unit: MeasurementUnit) {
  const d = useDimensionCalculations(state, unit);
  const { calculation } = useGeometryCalculations(
    state,
    d.orientedDimensions,
    d.minBorderData,
    d.paperEntry,
    d.paperSizeWarning
  );
  return { calculation, orientedDimensions: d.orientedDimensions };
}

const papers: Array<Partial<BorderCalculatorState>> = [
  ...PAPER_SIZES.filter((p) => p.value !== 'custom').map((p) => ({
    paperSize: p.value,
  })),
  { paperSize: 'unknown-size' },
  ...[
    [8, 10],
    [4, 6],
    [11.5, 7],
    [30, 40],
    [21, 25],
    [0, 0],
  ].map(([w, h]) => ({
    paperSize: 'custom',
    lastValidCustomPaperWidth: w,
    lastValidCustomPaperHeight: h,
  })),
];

const ratios: Array<Partial<BorderCalculatorState>> = [
  ...ASPECT_RATIOS.filter((r) => r.value !== 'custom').map((r) => ({
    aspectRatio: r.value,
  })),
  { aspectRatio: 'unknown-ratio' },
  ...[
    [3, 2],
    [5, 3],
    [1, 1],
  ].map(([w, h]) => ({
    aspectRatio: 'custom',
    lastValidCustomAspectWidth: w,
    lastValidCustomAspectHeight: h,
  })),
];

const minBorders = [-1, 0, 0.25, 0.5, 1.3, 2.5, 3.5, 4, 5.5, 100];
const orientations = [
  { isLandscape: false, isRatioFlipped: false },
  { isLandscape: true, isRatioFlipped: false },
  { isLandscape: false, isRatioFlipped: true },
  { isLandscape: true, isRatioFlipped: true },
];
const offsets: Array<Partial<BorderCalculatorState>> = [
  { enableOffset: false, horizontalOffset: 2, verticalOffset: -1 },
  { enableOffset: true, horizontalOffset: 0, verticalOffset: 0 },
  { enableOffset: true, horizontalOffset: 1, verticalOffset: -0.5 },
  { enableOffset: true, horizontalOffset: -3, verticalOffset: 2 },
  { enableOffset: true, horizontalOffset: 10, verticalOffset: -10 },
];

function buildCases(): BorderCalculatorState[] {
  const cases: BorderCalculatorState[] = [];
  for (const paper of papers)
    for (const ratio of ratios)
      for (const orientation of orientations)
        for (const minBorder of minBorders)
          cases.push({
            ...initialState,
            ...paper,
            ...ratio,
            ...orientation,
            minBorder,
            lastValidMinBorder: 0.75,
          } as BorderCalculatorState);

  // Offsets and ignoreMinBorder over a smaller paper x ratio slice
  for (const paper of papers.slice(0, 9))
    for (const ratio of ratios.slice(0, 6))
      for (const offset of offsets)
        for (const ignoreMinBorder of [false, true])
          for (const minBorder of [0.5, 2])
            for (const isLandscape of [false, true])
              cases.push({
                ...initialState,
                ...paper,
                ...ratio,
                ...offset,
                ignoreMinBorder,
                isLandscape,
                minBorder,
                lastValidMinBorder: 0.5,
              } as BorderCalculatorState);
  return cases;
}

const viewports = [
  { width: 1024, height: 768 },
  { width: 375, height: 667 },
  { width: 444, height: 800 },
  { width: 445, height: 801 },
  { width: 1920, height: 1080 },
];

function setWindow(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  });
}

describe('computeBorderLayout matches the old hook pipeline', () => {
  const cases = buildCases();

  for (const unit of ['imperial', 'metric'] as const) {
    for (const viewport of viewports) {
      it(`${unit} ${viewport.width}x${viewport.height}: ${cases.length} cases`, () => {
        setWindow(viewport.width, viewport.height);
        const { result, rerender } = renderHook(
          ({ state }) => useOldPipeline(state, unit),
          { initialProps: { state: cases[0] } }
        );
        for (const state of cases) {
          rerender({ state });
          expect(computeBorderLayout(state, { viewport, unit })).toStrictEqual(
            result.current
          );
        }
      });
    }
  }
});
