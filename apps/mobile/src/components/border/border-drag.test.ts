import {
  type BorderLayoutInput,
  computeBorderLayout,
  OFFSET_SLIDER_STEP,
} from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import {
  gridIndex,
  nearestStep,
  valueFromSteps,
} from '@/components/stage/edge-drag';
import {
  BORDER_DRAG_STEP,
  edgePositionsByStep,
  MAX_TABLE_STEPS,
  minBorderRange,
  OFFSET_DRAG_STEP,
  offsetRanges,
  offsetsAfterDrag,
  pxPerStep,
} from './border-drag';
import { computePaperBox, computePrintRect } from './geometry';

describe('minBorderRange', () => {
  it('matches the minimum-border slider for the paper', () => {
    expect(minBorderRange(10, 8)).toEqual({ min: 0, max: 3.875 });
    expect(minBorderRange(8, 10)).toEqual({ min: 0, max: 3.875 });
  });
});

describe('offsetRanges', () => {
  const base = {
    paperWidth: 10,
    paperHeight: 8,
    printWidth: 7,
    printHeight: 5,
    minBorder: 0.5,
    ignoreMinBorder: false,
  };

  it('leaves the free space less the minimum border', () => {
    // 1.5 in of slack each side of the width, 1.5 of the height, less 0.5.
    expect(offsetRanges(base)).toEqual({
      h: { min: -1, max: 1 },
      v: { min: -1, max: 1 },
    });
  });

  it('allows all the free space when the minimum is ignored', () => {
    expect(offsetRanges({ ...base, ignoreMinBorder: true }).h).toEqual({
      min: -1.5,
      max: 1.5,
    });
  });

  it('gives an axis with no room a single value', () => {
    // The print fills the width up to its minimum border.
    const tight = offsetRanges({ ...base, printWidth: 9, minBorder: 0.5 });
    expect(tight.h).toEqual({ min: 0, max: 0 });
  });

  it('never exceeds the sliders', () => {
    const wide = offsetRanges({
      ...base,
      paperWidth: 30,
      ignoreMinBorder: true,
    });
    expect(wide.h).toEqual({ min: -3, max: 3 });
  });
});

describe('pxPerStep', () => {
  it('scales the step by the drawing', () => {
    expect(pxPerStep(300, 10, BORDER_DRAG_STEP)).toBeCloseTo(3.75, 6);
  });

  it('is zero with no paper', () => {
    expect(pxPerStep(300, 0, 0.125)).toBe(0);
  });
});

const VIEWPORT = { width: 400, height: 800 };

const base: BorderLayoutInput = {
  paperSize: '11x14',
  lastValidCustomPaperWidth: 0,
  lastValidCustomPaperHeight: 0,
  aspectRatio: '7:6',
  lastValidCustomAspectWidth: 0,
  lastValidCustomAspectHeight: 0,
  isLandscape: true,
  isRatioFlipped: false,
  minBorder: 1.5,
  lastValidMinBorder: 1.5,
  enableOffset: true,
  horizontalOffset: 0,
  verticalOffset: 0,
  ignoreMinBorder: false,
};

const setups: [string, Partial<BorderLayoutInput>][] = [
  ['3:2 landscape', { aspectRatio: '3:2' }],
  ['3:2 portrait', { aspectRatio: '3:2', isLandscape: false }],
  ['65:24 landscape', { aspectRatio: '65:24' }],
  [
    '65:24 portrait flipped',
    { aspectRatio: '65:24', isLandscape: false, isRatioFlipped: true },
  ],
  ['1:1', { aspectRatio: '1:1' }],
  ['even borders', { aspectRatio: 'even-borders' }],
  ['7:6 flipped', { aspectRatio: '7:6', isRatioFlipped: true }],
  ['8x10 3:2', { paperSize: '8x10', aspectRatio: '3:2' }],
];

describe('offsetsAfterDrag drives the print with the finger', () => {
  const printLeftTop = (values: BorderLayoutInput) => {
    const { calculation } = computeBorderLayout(values, { viewport: VIEWPORT });
    const box = computePaperBox(
      calculation.paperWidth,
      calculation.paperHeight,
      300,
      300
    );
    const rect = computePrintRect(calculation, box);
    return { calculation, rect };
  };

  for (const [name, overrides] of setups) {
    it(`moves the print right and down with a right and down drag: ${name}`, () => {
      const values = {
        ...base,
        minBorder: 0.5,
        lastValidMinBorder: 0.5,
        ...overrides,
      };
      const { calculation, rect: before } = printLeftTop(values);
      const ranges = offsetRanges({
        paperWidth: calculation.paperWidth,
        paperHeight: calculation.paperHeight,
        printWidth: calculation.printWidth,
        printHeight: calculation.printHeight,
        minBorder: values.minBorder,
        ignoreMinBorder: false,
      });
      // Not every shape has room on both axes (even borders has none).
      const room = { x: ranges.h.max > 0.2, y: ranges.v.max > 0.2 };
      const moved = offsetsAfterDrag({
        start: { h: 0, v: 0 },
        stepsX: 2,
        stepsY: 2,
        ranges,
      });
      const after = printLeftTop({
        ...values,
        horizontalOffset: moved.h,
        verticalOffset: moved.v,
      }).rect;
      if (room.x) expect(after.left).toBeGreaterThan(before.left);
      if (room.y) expect(after.top).toBeGreaterThan(before.top);

      // And back the other way.
      const back = offsetsAfterDrag({
        start: { h: 0, v: 0 },
        stepsX: -2,
        stepsY: -2,
        ranges,
      });
      const left = printLeftTop({
        ...values,
        horizontalOffset: back.h,
        verticalOffset: back.v,
      }).rect;
      if (room.x) expect(left.left).toBeLessThan(before.left);
      if (room.y) expect(left.top).toBeLessThan(before.top);
    });
  }

  it('uses the sliders step for each step of travel', () => {
    const moved = offsetsAfterDrag({
      start: { h: 0, v: 0 },
      stepsX: 3,
      stepsY: 3,
      ranges: { h: { min: -2, max: 2 }, v: { min: -2, max: 2 } },
    });
    expect(OFFSET_DRAG_STEP).toBe(OFFSET_SLIDER_STEP);
    expect(moved).toEqual({ h: -0.375, v: 0.375 });
  });

  it('stops at what the paper allows', () => {
    const moved = offsetsAfterDrag({
      start: { h: 0, v: 0 },
      stepsX: 40,
      stepsY: -40,
      ranges: { h: { min: -0.5, max: 0.5 }, v: { min: -0.25, max: 0.25 } },
    });
    expect(moved).toEqual({ h: -0.5, v: -0.25 });
  });
});

describe('dragging an edge follows the finger exactly', () => {
  const pxPerInch = 20;
  const EDGES = ['left', 'right', 'top', 'bottom'] as const;
  const KEY = {
    left: 'leftBorder',
    right: 'rightBorder',
    top: 'topBorder',
    bottom: 'bottomBorder',
  } as const;
  const edgeOf = (values: BorderLayoutInput) =>
    computeBorderLayout(values, { viewport: VIEWPORT }).calculation;

  const scenarios: {
    name: string;
    overrides: Partial<BorderLayoutInput>;
    starts: number[];
  }[] = [
    { name: '14x11 at 7:6', overrides: {}, starts: [1, 2] },
    {
      name: '14x11 at 3:2, crossing the axis switch',
      overrides: { aspectRatio: '3:2' },
      starts: [1, 2],
    },
    {
      name: '11x14 portrait at 3:2',
      overrides: { aspectRatio: '3:2', isLandscape: false },
      starts: [1],
    },
    {
      name: '14x11 at 3:2 flipped',
      overrides: { aspectRatio: '3:2', isRatioFlipped: true },
      starts: [1],
    },
    { name: '1:1', overrides: { aspectRatio: '1:1' }, starts: [1] },
    {
      name: '65:24, which hits the maximum',
      overrides: { aspectRatio: '65:24' },
      starts: [1],
    },
    {
      name: 'even borders',
      overrides: { aspectRatio: 'even-borders' },
      starts: [1],
    },
    {
      name: '14x11 at 3:2 with offsets',
      overrides: {
        aspectRatio: '3:2',
        enableOffset: true,
        horizontalOffset: 0.5,
        verticalOffset: -0.25,
      },
      starts: [1],
    },
  ];

  for (const { name, overrides, starts } of scenarios) {
    for (const startBorder of starts) {
      it(`${name}, from ${startBorder}": 10 to 80pt in and out`, () => {
        const values: BorderLayoutInput = {
          ...base,
          enableOffset: false,
          ...overrides,
          minBorder: startBorder,
          lastValidMinBorder: startBorder,
        };
        const range = minBorderRange(14, 11);
        const tables = edgePositionsByStep(values, pxPerInch, range);
        const k0 = gridIndex(
          startBorder,
          range.min,
          BORDER_DRAG_STEP,
          tables.count
        );
        const here = edgeOf(values);
        for (const edge of EDGES) {
          const table = tables[edge];
          for (const travel of [10, 20, 40, 80, -10, -20, -40, -80]) {
            const steps = nearestStep(table, k0, travel);
            const value = valueFromSteps({
              start: startBorder,
              steps,
              step: BORDER_DRAG_STEP,
              ...range,
            });
            const moved = edgeOf({
              ...values,
              minBorder: value,
              lastValidMinBorder: value,
            });
            const startPx = here[KEY[edge]] * pxPerInch;
            const edgePx = moved[KEY[edge]] * pxPerInch;
            const wanted = startPx + travel;
            // Half the widest gap next to the landing step is the most any
            // grid can miss by; or the drag ran into a bound.
            const k = k0 + steps;
            const gap = Math.max(
              table[Math.min(k + 1, table.length - 1)] - table[k],
              table[k] - table[Math.max(k - 1, 0)]
            );
            const atBound = k === 0 || k === table.length - 1;
            const label = `${edge} ${travel}pt`;
            if (atBound) {
              // Never stops short of a bound the finger has not passed.
              const beyond =
                travel > 0
                  ? wanted >= edgePx - gap / 2
                  : wanted <= edgePx + gap / 2;
              expect(beyond, label).toBe(true);
            } else {
              expect(Math.abs(edgePx - wanted), label).toBeLessThanOrEqual(
                gap / 2 + 1e-6
              );
            }
          }
        }
      });
    }
  }

  it('restores the starting value when the finger returns to where it touched down', () => {
    const ratios: BorderLayoutInput['aspectRatio'][] = [
      '7:6',
      '3:2',
      '65:24',
      'even-borders',
    ];
    for (const aspectRatio of ratios) {
      const values = { ...base, aspectRatio, enableOffset: false };
      const range = minBorderRange(14, 11);
      const tables = edgePositionsByStep(values, pxPerInch, range);
      const k0 = gridIndex(1.5, range.min, BORDER_DRAG_STEP, tables.count);
      for (const edge of EDGES) {
        expect(nearestStep(tables[edge], k0, 0), `${aspectRatio} ${edge}`).toBe(
          0
        );
      }
    }
  });

  it('builds non-decreasing tables of one length per edge', () => {
    const range = minBorderRange(14, 11);
    for (const { overrides } of scenarios) {
      const tables = edgePositionsByStep(
        { ...base, enableOffset: false, ...overrides },
        pxPerInch,
        range
      );
      expect(tables.count).toBeGreaterThan(40);
      expect(tables.count).toBeLessThanOrEqual(MAX_TABLE_STEPS);
      for (const edge of EDGES) {
        expect(tables[edge]).toHaveLength(tables.count);
        for (let i = 1; i < tables.count; i++) {
          expect(tables[edge][i]).toBeGreaterThanOrEqual(
            tables[edge][i - 1] - 1e-9
          );
        }
      }
    }
  });

  it('is empty without a paper', () => {
    expect(edgePositionsByStep(base, 0, { min: 0, max: 3 }).count).toBe(0);
  });
});

describe('a table that turns back', () => {
  const values: BorderLayoutInput = {
    ...base,
    aspectRatio: '65:24',
    isRatioFlipped: true,
    enableOffset: true,
    horizontalOffset: 3,
    verticalOffset: 0,
  };
  const range = minBorderRange(14, 11);
  const tables = edgePositionsByStep(values, 20, range);
  const monotonic = (t: number[]) =>
    t.every((v, i) => i === 0 || v >= t[i - 1] - 1e-9);

  it('is not monotonic on some edge (why the search is local)', () => {
    const edges = ['left', 'right', 'top', 'bottom'] as const;
    expect(edges.some((e) => !monotonic(tables[e]))).toBe(true);
  });

  it('never flickers: a finger sweep gives a monotonic, small-step sequence', () => {
    for (const edge of ['left', 'right', 'top', 'bottom'] as const) {
      for (const startBorder of [0, 1]) {
        const k0 = gridIndex(
          startBorder,
          range.min,
          BORDER_DRAG_STEP,
          tables.count
        );
        let steps = 0;
        let largest = 0;
        for (let travel = 0; travel <= 150; travel += 0.5) {
          const next = nearestStep(tables[edge], k0, travel, steps);
          // Only ever one direction along a one-way finger sweep.
          expect(next, `${edge} ${travel}`).toBeGreaterThanOrEqual(steps);
          largest = Math.max(largest, next - steps);
          steps = next;
        }
        // No jump bigger than a step on the grid per 0.5pt, unless the table
        // itself has a step that big (a loose axis).
        const gap = Math.max(
          ...tables[edge].map((v, i, a) => (i ? Math.abs(v - a[i - 1]) : 0))
        );
        expect(largest).toBeLessThanOrEqual(Math.ceil(gap / 0.5) + 1);
      }
    }
  });
});
