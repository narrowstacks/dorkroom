import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ASPECT_RATIOS, PAPER_SIZES } from '../../constants/border-calculator';
import { initialState } from '../../hooks/border-calculator/use-border-calculator-state';
import type {
  BorderCalculation,
  BorderCalculatorState,
} from '../../types/border-calculator';
import { computeBorderLayout, computePreviewScale } from '../border-layout';

// Characterization tests. The golden rows and digest below were generated
// from the useDimensionCalculations + useGeometryCalculations hook pipeline
// this function replaced (#290), so any change to them is a change to the
// numbers the border calculator displays.

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

function row(state: BorderCalculatorState, c: BorderCalculation): string {
  const input = [
    state.paperSize === 'custom'
      ? `custom ${state.lastValidCustomPaperWidth}x${state.lastValidCustomPaperHeight}`
      : state.paperSize,
    state.aspectRatio === 'custom'
      ? `custom ${state.lastValidCustomAspectWidth}:${state.lastValidCustomAspectHeight}`
      : state.aspectRatio,
    state.isLandscape ? 'L' : 'P',
    state.isRatioFlipped ? 'flip' : '-',
    `mb ${state.minBorder}/${state.lastValidMinBorder}`,
    state.enableOffset
      ? `off ${state.horizontalOffset},${state.verticalOffset}`
      : 'no-off',
    state.ignoreMinBorder ? 'ignore' : '-',
  ].join(' ');
  const output = [
    `paper ${c.paperWidth}x${c.paperHeight}`,
    `print ${c.printWidth}x${c.printHeight}`,
    `borders ${c.leftBorder},${c.rightBorder},${c.topBorder},${c.bottomBorder}`,
    `blades ${c.leftBladeReading},${c.rightBladeReading},${c.topBladeReading},${c.bottomBladeReading}`,
    `offset ${c.clampedHorizontalOffset},${c.clampedVerticalOffset}`,
    `easel ${c.easelSizeLabel}${c.isNonStandardPaperSize ? ' nonstd' : ''}`,
    `lastValid ${c.lastValidMinBorder}`,
    `preview ${c.previewScale}`,
    c.minBorderWarning ? `minBorderW "${c.minBorderWarning}"` : '',
    c.offsetWarning ? `offsetW "${c.offsetWarning}"` : '',
    c.bladeWarning ? `bladeW "${c.bladeWarning.replace('\n', ' | ')}"` : '',
    c.paperSizeWarning ? `paperW "${c.paperSizeWarning}"` : '',
  ]
    .filter(Boolean)
    .join('; ');
  return `${input} => ${output}`;
}

const viewport = { width: 1024, height: 768 };

describe('computeBorderLayout', () => {
  it('computes the default 8x10, 3:2, 0.5in layout', () => {
    const { calculation, orientedDimensions } = computeBorderLayout(
      { ...initialState, isLandscape: false, isRatioFlipped: false },
      { viewport }
    );
    expect(orientedDimensions.orientedPaper).toEqual({ w: 8, h: 10 });
    expect(calculation.printWidth).toBeCloseTo(7);
    expect(calculation.printHeight).toBeCloseTo(4.6667, 4);
    expect(calculation.leftBorder).toBeCloseTo(0.5);
    expect(calculation.topBorder).toBeCloseTo(2.6667, 4);
    expect(calculation.minBorderWarning).toBeNull();
    expect(calculation.paperSizeWarning).toBeNull();
  });

  it('falls back to the last valid min border when the input is too large', () => {
    const { calculation } = computeBorderLayout(
      { ...initialState, minBorder: 4, lastValidMinBorder: 0.75 },
      { viewport }
    );
    expect(calculation.minBorderWarning).toBe(
      'Minimum border too large; using 0.75.'
    );
    expect(calculation.lastValidMinBorder).toBe(0.75);
    expect(calculation.printWidth).toBeCloseTo(10 - 2 * 0.75);
  });

  it('falls back to the last valid min border when the input is negative', () => {
    const { calculation } = computeBorderLayout(
      { ...initialState, minBorder: -1, lastValidMinBorder: 0.5 },
      { viewport }
    );
    expect(calculation.minBorderWarning).toBe(
      'Border cannot be negative; using 0.5.'
    );
    expect(calculation.lastValidMinBorder).toBe(0.5);
  });

  it('ignores offsets while they are disabled', () => {
    const base = {
      ...initialState,
      isLandscape: false,
      isRatioFlipped: false,
      horizontalOffset: 1,
      verticalOffset: 1,
    };
    const off = computeBorderLayout(base, { viewport }).calculation;
    const on = computeBorderLayout(
      { ...base, enableOffset: true },
      { viewport }
    ).calculation;
    expect(off.clampedVerticalOffset).toBe(0);
    expect(on.clampedVerticalOffset).toBe(1);
    expect(on.topBorder).toBeCloseTo(off.topBorder + 1);
  });

  it('writes the paper-size warning in the requested unit', () => {
    const state = {
      ...initialState,
      paperSize: 'custom',
      lastValidCustomPaperWidth: 30,
      lastValidCustomPaperHeight: 40,
    };
    const imperial = computeBorderLayout(state, { viewport }).calculation;
    const metric = computeBorderLayout(state, {
      viewport,
      unit: 'metric',
    }).calculation;
    expect(imperial.paperSizeWarning).not.toBeNull();
    expect(metric.paperSizeWarning).not.toBeNull();
    expect(metric.paperSizeWarning).not.toBe(imperial.paperSizeWarning);
    expect(imperial.isNonStandardPaperSize).toBe(false);
  });

  it('matches the golden rows from the replaced hook pipeline', () => {
    const rows: string[] = [];
    for (const paper of papers)
      for (const ratio of [ratios[0], ratios[1], ratios[2], ratios.at(-1)])
        for (const minBorder of [-1, 0.5, 3.5])
          for (const orientation of [orientations[0], orientations[3]]) {
            const state = {
              ...initialState,
              ...paper,
              ...ratio,
              ...orientation,
              minBorder,
              lastValidMinBorder: 0.75,
            } as BorderCalculatorState;
            rows.push(
              row(state, computeBorderLayout(state, { viewport }).calculation)
            );
          }
    for (const offset of offsets.slice(1))
      for (const ignoreMinBorder of [false, true]) {
        const state = {
          ...initialState,
          ...offset,
          ignoreMinBorder,
          minBorder: 2,
        } as BorderCalculatorState;
        rows.push(
          row(state, computeBorderLayout(state, { viewport }).calculation)
        );
      }
    expect(rows).toMatchSnapshot();
  });

  it('matches the digest of the full input grid from the replaced hook pipeline', () => {
    const hash = createHash('sha256');
    for (const unit of ['imperial', 'metric'] as const)
      for (const vp of [
        { width: 1024, height: 768 },
        { width: 375, height: 667 },
        { width: 444, height: 800 },
        { width: 445, height: 801 },
        { width: 1920, height: 1080 },
      ])
        for (const state of buildCases())
          hash.update(
            JSON.stringify(computeBorderLayout(state, { viewport: vp, unit }))
          );
    expect(hash.digest('hex')).toMatchSnapshot();
  });
});

describe('computePreviewScale', () => {
  it('returns 1 for a zero dimension', () => {
    expect(computePreviewScale(0, 10, viewport)).toBe(1);
    expect(computePreviewScale(8, 0, viewport)).toBe(1);
  });

  it('fits a 400px box on wide, tall windows', () => {
    expect(computePreviewScale(8, 10, { width: 1920, height: 1080 })).toBe(40);
  });

  it('shrinks to 90% width and 50% height on small windows', () => {
    expect(computePreviewScale(8, 10, { width: 375, height: 667 })).toBe(
      Math.min((375 * 0.9) / 8, (667 * 0.5) / 10)
    );
  });
});
