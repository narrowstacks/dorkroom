import { describe, expect, it } from 'vitest';
import { nearestStep } from '@/components/stage/edge-drag';
import {
  BORDER_KEY,
  matBorderOf,
  matBorderRange,
  matDragStep,
  matEdgeTrack,
  MIN_STEP_PX,
  MIN_WINDOW,
} from './mat-drag';

const layout = { ow: 16, oh: 20, bt: 3, bb: 3.5, bl: 2.75, br: 2.75 };

describe('matDragStep', () => {
  it('takes the cutter grid when the drawing is large enough', () => {
    expect(matDragStep(100)).toBe(1 / 16);
  });

  it('coarsens on a small drawing so a step is never under the minimum travel', () => {
    for (const scale of [10, 15, 20, 30, 45]) {
      expect(matDragStep(scale) * scale).toBeGreaterThanOrEqual(MIN_STEP_PX);
    }
    expect(matDragStep(20)).toBe(1 / 4);
  });
});

describe('matBorderRange', () => {
  it('leaves a minimum window against the opposite border', () => {
    expect(matBorderRange('left', layout)).toEqual({
      min: 0,
      max: 16 - 2.75 - MIN_WINDOW,
    });
    expect(matBorderRange('top', layout)).toEqual({
      min: 0,
      max: 20 - 3.5 - MIN_WINDOW,
    });
    expect(matBorderRange('bottom', layout).max).toBe(20 - 3 - MIN_WINDOW);
  });

  it('never goes below zero', () => {
    expect(matBorderRange('right', { ...layout, bl: 20 }).max).toBe(0);
  });
});

describe('edges and fields', () => {
  it('maps each edge to its own border', () => {
    expect(BORDER_KEY).toEqual({
      left: 'borderLeft',
      right: 'borderRight',
      top: 'borderTop',
      bottom: 'borderBottom',
    });
    expect(matBorderOf('top', layout)).toBe(3);
    expect(matBorderOf('bottom', layout)).toBe(3.5);
    expect(matBorderOf('left', layout)).toBe(2.75);
  });
});

describe('matEdgeTrack follows the finger one to one', () => {
  const scale = 20;
  const step = matDragStep(scale);
  for (const edge of ['left', 'right', 'top', 'bottom'] as const) {
    it(`${edge}: 40pt in and out lands within half a step`, () => {
      const { positions, startIndex } = matEdgeTrack(edge, layout, step, scale);
      for (const travel of [-40, -10, 0, 10, 40]) {
        const steps = nearestStep(positions, startIndex, travel);
        const moved = positions[startIndex + steps] - positions[startIndex];
        const bound = startIndex + steps === 0;
        if (!bound) {
          expect(Math.abs(moved - travel)).toBeLessThanOrEqual(
            (step * scale) / 2 + 1e-9
          );
        }
      }
      expect(nearestStep(positions, startIndex, 0)).toBe(0);
    });
  }

  it('is empty without a scale', () => {
    expect(matEdgeTrack('left', layout, step, 0).positions).toEqual([]);
  });
});
