import { describe, expect, it } from 'vitest';
import {
  adaptiveStep,
  EDGE_AXIS,
  gridIndex,
  nearestStep,
  snapToStep,
  stepsFromDelta,
  valueFromSteps,
} from './edge-drag';

describe('stepsFromDelta', () => {
  it('counts whole steps of travel', () => {
    expect(stepsFromDelta(0, 3)).toBe(0);
    expect(stepsFromDelta(1.4, 3)).toBe(0);
    expect(stepsFromDelta(1.6, 3)).toBe(1);
    expect(stepsFromDelta(-7, 3)).toBe(-2);
  });

  it('never returns negative zero', () => {
    expect(Object.is(stepsFromDelta(-0.2, 3), 0)).toBe(true);
  });

  it('ignores a degenerate scale or travel', () => {
    expect(stepsFromDelta(40, 0)).toBe(0);
    expect(stepsFromDelta(Number.NaN, 3)).toBe(0);
  });
});

describe('valueFromSteps', () => {
  const range = { step: 0.125, min: 0, max: 3.375 };

  it('moves by whole steps', () => {
    expect(valueFromSteps({ start: 1.5, steps: 3, ...range })).toBe(1.875);
    expect(valueFromSteps({ start: 1.5, steps: -4, ...range })).toBe(1);
  });

  it('clamps at both bounds', () => {
    expect(valueFromSteps({ start: 1.5, steps: -100, ...range })).toBe(0);
    expect(valueFromSteps({ start: 1.5, steps: 100, ...range })).toBe(3.375);
  });

  it('keeps an off-grid start exactly when there are no steps', () => {
    expect(valueFromSteps({ start: 1.49, steps: 0, ...range })).toBe(1.49);
    expect(
      valueFromSteps({ start: 2.3, steps: 0, step: 0.25, min: 0, max: 8 })
    ).toBe(2.3);
  });

  it('snaps onto the grid once it moves', () => {
    expect(valueFromSteps({ start: 1.49, steps: 1, ...range })).toBe(1.625);
  });

  it('does not jump a start past the max when dragging further that way', () => {
    // A 14" border on a 15" mat (max 12.5): inward stays at 14, no jump to 12.5.
    expect(
      valueFromSteps({ start: 14, steps: 3, step: 0.25, min: 0, max: 12.5 })
    ).toBe(14);
  });

  it('walks a start past the max back down from where it is', () => {
    expect(
      valueFromSteps({ start: 14, steps: -3, step: 0.25, min: 0, max: 12.5 })
    ).toBe(13.25);
  });

  it('survives bounds that cross', () => {
    expect(
      valueFromSteps({ start: 2, steps: 5, step: 0.125, min: 0, max: -1 })
    ).toBe(2);
  });
});

describe('snapToStep', () => {
  it('lands on exact binary fractions', () => {
    expect(snapToStep(0.3, 0.125)).toBe(0.25);
    expect(snapToStep(0.0625 * 3, 0.0625)).toBe(0.1875);
  });
});

describe('adaptiveStep', () => {
  const ladder = [1 / 16, 1 / 8, 1 / 4, 1 / 2, 1];

  it('takes the finest step that is big enough on screen', () => {
    expect(adaptiveStep(ladder, 80, 4)).toBe(1 / 16);
    expect(adaptiveStep(ladder, 20, 4)).toBe(1 / 4);
  });

  it('falls back to the coarsest step', () => {
    expect(adaptiveStep(ladder, 1, 4)).toBe(1);
    expect(adaptiveStep(ladder, 0, 4)).toBe(1);
  });
});

describe('EDGE_AXIS', () => {
  it('moves each edge along its own axis, inward being toward the centre', () => {
    expect(EDGE_AXIS.left).toEqual({ axis: 'x', inward: 1 });
    expect(EDGE_AXIS.right).toEqual({ axis: 'x', inward: -1 });
    expect(EDGE_AXIS.top).toEqual({ axis: 'y', inward: 1 });
    expect(EDGE_AXIS.bottom).toEqual({ axis: 'y', inward: -1 });
  });
});

describe('nearestStep', () => {
  const linear = Array.from({ length: 11 }, (_, k) => k * 5);

  it('lands on the step nearest the finger, relative to the start', () => {
    expect(nearestStep(linear, 4, 0)).toBe(0);
    expect(nearestStep(linear, 4, 12)).toBe(2);
    expect(nearestStep(linear, 4, -12)).toBe(-2);
    expect(nearestStep(linear, 4, 13)).toBe(3);
  });

  it('stops at the ends of the table', () => {
    expect(nearestStep(linear, 8, 500)).toBe(2);
    expect(nearestStep(linear, 2, -500)).toBe(-2);
  });

  it('follows a gain that changes along the drag', () => {
    // 5px a step, then 10px a step from index 4.
    const bent = [0, 5, 10, 15, 20, 30, 40, 50];
    expect(nearestStep(bent, 2, 30)).toBe(4);
    expect(nearestStep(bent, 2, 40)).toBe(5);
  });

  it('keeps the start on a flat stretch and never returns a negative zero', () => {
    const flat = [0, 0, 0, 5, 10];
    expect(nearestStep(flat, 2, 0)).toBe(0);
    expect(Object.is(nearestStep(flat, 2, 0), 0)).toBe(true);
  });

  it('stops at the first entry of a flat run nearest where it came from', () => {
    const flat = [0, 0, 0, 5, 10];
    // From index 4 (10), target 2: the run 0,0,0 is entered at index 2.
    expect(nearestStep(flat, 4, -8)).toBe(-2);
    // Past the run's value it still stops there, not at index 0.
    expect(nearestStep(flat, 4, -30)).toBe(-2);
  });

  it('returns to the start step when the finger comes back to a flat stretch', () => {
    const flat = [0, 1, 1, 1, 2];
    let steps = 0;
    for (const travel of [0, 0.4, 0.9, 1.4, 1.1, 1, 0.5, 0]) {
      steps = nearestStep(flat, 2, travel, steps);
    }
    expect(steps).toBe(0);
    expect(nearestStep(flat, 2, 0, 1)).toBe(0);
  });

  it('crosses a flat run when the far side is nearer', () => {
    const flat = [0, 5, 5, 5, 12, 20];
    expect(nearestStep(flat, 0, 11)).toBe(4);
  });

  it('stops at the peak of a humped table instead of flipping', () => {
    // Inward, peaks at 30 (index 3), then falls back.
    const hump = [0, 10, 20, 30, 25, 20, 15, 10];
    expect(nearestStep(hump, 0, 28)).toBe(3);
    expect(nearestStep(hump, 0, 60)).toBe(3);
    // Under the peak's value the far side is never taken: no flipping.
    expect(nearestStep(hump, 0, 26, 3)).toBe(3);
    // Walking on from the previous step never jumps to the far side.
    let steps = 0;
    for (let travel = 0; travel <= 80; travel += 1) {
      const next = nearestStep(hump, 0, travel, steps);
      expect(next).toBeGreaterThanOrEqual(steps);
      expect(next - steps).toBeLessThanOrEqual(1);
      steps = next;
    }
    expect(steps).toBe(3);
  });

  it('walks from the previous step, so a drag keeps its place', () => {
    expect(nearestStep(linear, 4, 12, 2)).toBe(2);
    expect(nearestStep(linear, 4, -12, -2)).toBe(-2);
  });

  it('is zero for an empty table or a bad travel', () => {
    expect(nearestStep([], 0, 10)).toBe(0);
    expect(nearestStep(linear, 3, Number.NaN)).toBe(0);
  });
});

describe('gridIndex', () => {
  it('rounds onto the grid and holds to the table', () => {
    expect(gridIndex(1, 0, 0.125, 40)).toBe(8);
    expect(gridIndex(99, 0, 0.125, 40)).toBe(39);
    expect(gridIndex(-1, 0, 0.125, 40)).toBe(0);
    expect(gridIndex(1, 0, 0.125, 0)).toBe(0);
  });
});
