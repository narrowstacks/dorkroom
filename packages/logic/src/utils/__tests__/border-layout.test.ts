import { describe, expect, it } from 'vitest';
import { ASPECT_RATIOS, PAPER_SIZES } from '../../constants/border-calculator';
import { initialState } from '../../hooks/border-calculator/use-border-calculator-state';
import type {
  BorderCalculation,
  BorderCalculatorState,
} from '../../types/border-calculator';
import { computeBorderLayout, computePreviewScale } from '../border-layout';

// Characterization tests. computeBorderLayout was proven identical to the
// useDimensionCalculations + useGeometryCalculations hook pipeline it replaced
// (#290) over a large input grid, and every golden row below was checked
// against those hooks, so any change to a row is a change to the numbers the
// border calculator displays.

// A slice of calculator input. The grid deliberately includes values outside
// the declared unions ('unknown-size', 'unknown-ratio') to pin the lookup
// fallbacks, so slices are loosely typed and merged by makeState.
type GridPart = Record<string, string | number | boolean>;

function makeState(...parts: GridPart[]): BorderCalculatorState {
  // SAFETY: every field comes from initialState; the parts only override
  // calculator inputs with numbers, booleans or paper/ratio identifiers, the
  // last of which may be unknown on purpose to exercise the fallbacks.
  return Object.assign({ ...initialState }, ...parts) as BorderCalculatorState;
}

const papers: GridPart[] = [
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

const ratios: GridPart[] = [
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

const orientations = [
  { isLandscape: false, isRatioFlipped: false },
  { isLandscape: true, isRatioFlipped: false },
  { isLandscape: false, isRatioFlipped: true },
  { isLandscape: true, isRatioFlipped: true },
];
const offsets: GridPart[] = [
  { enableOffset: false, horizontalOffset: 2, verticalOffset: -1 },
  { enableOffset: true, horizontalOffset: 0, verticalOffset: 0 },
  { enableOffset: true, horizontalOffset: 1, verticalOffset: -0.5 },
  { enableOffset: true, horizontalOffset: -3, verticalOffset: 2 },
  { enableOffset: true, horizontalOffset: 10, verticalOffset: -10 },
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
    const state: BorderCalculatorState = {
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

  it('writes the full metric paper-size warning, in either orientation', () => {
    for (const isLandscape of [false, true]) {
      const { calculation } = computeBorderLayout(
        {
          ...initialState,
          paperSize: 'custom',
          lastValidCustomPaperWidth: 30,
          lastValidCustomPaperHeight: 40,
          isLandscape,
        },
        { viewport, unit: 'metric' }
      );
      expect(calculation.paperSizeWarning).toBe(
        'Custom paper (76.2×101.6cm) exceeds largest standard easel (50.8×61cm).'
      );
    }
  });

  it('matches the golden rows from the replaced hook pipeline', () => {
    const rows: string[] = [];
    for (const paper of papers)
      for (const ratio of [
        ratios[0],
        ratios[1],
        ratios[2],
        ratios[ratios.length - 1],
      ])
        for (const minBorder of [-1, 0.5, 3.5])
          for (const orientation of [orientations[0], orientations[3]]) {
            const state = makeState(paper, ratio, orientation, {
              minBorder,
              lastValidMinBorder: 0.75,
            });
            rows.push(
              row(state, computeBorderLayout(state, { viewport }).calculation)
            );
          }
    // The two orientation combinations the block above skips
    for (const paper of papers)
      for (const ratio of [ratios[0], ratios[2]])
        for (const orientation of [orientations[1], orientations[2]]) {
          const state = makeState(paper, ratio, orientation, {
            minBorder: 0.5,
            lastValidMinBorder: 0.75,
          });
          rows.push(
            row(state, computeBorderLayout(state, { viewport }).calculation)
          );
        }
    // Unknown-ratio fallback and custom ratios, in every orientation
    for (const paper of [papers[2], papers[9]])
      for (const ratio of ratios.slice(ratios.length - 4))
        for (const orientation of orientations) {
          const state = makeState(paper, ratio, orientation, {
            minBorder: 0.5,
            lastValidMinBorder: 0.75,
          });
          rows.push(
            row(state, computeBorderLayout(state, { viewport }).calculation)
          );
        }
    for (const offset of offsets.slice(1))
      for (const ignoreMinBorder of [false, true]) {
        const state = makeState(offset, { ignoreMinBorder, minBorder: 2 });
        rows.push(
          row(state, computeBorderLayout(state, { viewport }).calculation)
        );
      }
    expect(rows).toMatchSnapshot();
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

  it('fits a phone window: width - 80 wide, 50% of the height tall', () => {
    expect(computePreviewScale(8, 10, { width: 375, height: 667 })).toBe(
      Math.min((375 - 80) / 8, (667 * 0.5) / 10)
    );
  });

  it('switches to the fixed 400px height just above 800px', () => {
    expect(computePreviewScale(8, 10, { width: 1024, height: 700 })).toBe(35);
    expect(computePreviewScale(8, 10, { width: 1024, height: 800 })).toBe(40);
    expect(computePreviewScale(8, 10, { width: 1024, height: 801 })).toBe(40);
  });

  describe('mobile card cap (#457)', () => {
    const tall = { height: 1000 };

    it('caps the width at 320px up to and including 768px', () => {
      // 10in wide paper would be 400px; the cap brings it to 320px.
      expect(computePreviewScale(10, 8, { width: 767, ...tall })).toBe(32);
      expect(computePreviewScale(10, 8, { width: 768, ...tall })).toBe(32);
    });

    it('drops the cap at 769px, where the desktop layout takes over', () => {
      expect(computePreviewScale(10, 8, { width: 769, ...tall })).toBe(40);
    });

    it('shrinks to width - 80 on windows narrower than 400px', () => {
      expect(computePreviewScale(10, 8, { width: 320, ...tall })).toBe(24);
    });

    it('leaves height-limited paper alone', () => {
      // 8x10 portrait is 320px wide at the 400px height limit already.
      expect(computePreviewScale(8, 10, { width: 768, ...tall })).toBe(40);
    });
  });
});
