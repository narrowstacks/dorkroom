import { describe, expect, it } from 'vitest';
import { computeBladeReadings } from './blade-readings-layout';

// Border 25% each side -> print is the middle 50% of a 400x400 box (200x200).
const largePrint = {
  leftBorderPercent: 25,
  rightBorderPercent: 25,
  topBorderPercent: 25,
  bottomBorderPercent: 25,
  leftBladeReading: 2,
  rightBladeReading: 2,
  topBladeReading: 2.5,
  bottomBladeReading: 2.5,
};

// Border 45% each side -> print is the middle 10% (40x40): labels go outside.
const smallPrint = {
  leftBorderPercent: 45,
  rightBorderPercent: 45,
  topBorderPercent: 45,
  bottomBorderPercent: 45,
  leftBladeReading: 3.6,
  rightBladeReading: 3.6,
  topBladeReading: 3.6,
  bottomBladeReading: 3.6,
};

const opts = { labelWidth: 64, labelHeight: 36, padding: 8 };

describe('computeBladeReadings', () => {
  it('returns four readings carrying the calculation values', () => {
    const r = computeBladeReadings(largePrint, 400, 400, opts);
    expect(r.map((x) => x.side)).toEqual(['left', 'right', 'top', 'bottom']);
    expect(r[0].reading).toBe(2);
    expect(r[2].reading).toBe(2.5);
  });

  it('places labels inside when the print area is large enough', () => {
    const [left, , top] = computeBladeReadings(largePrint, 400, 400, opts);
    // print spans 100..300 in both axes; centers at 200
    expect(left.isInside).toBe(true);
    expect(left.x).toBe(100); // printLeft
    expect(left.y).toBe(200); // centerY
    expect(left.arrow).toBe('←');
    expect(left.arrowFirst).toBe(true);
    expect(left.translateX).toBe(0);
    expect(left.translateY).toBe(-18); // -labelHeight/2
    expect(top.arrow).toBe('↑');
    expect(top.translateX).toBe(-32); // -labelWidth/2
    expect(top.translateY).toBe(0);
  });

  it('pushes labels outside and flips arrows when the print area is small', () => {
    const [left] = computeBladeReadings(smallPrint, 400, 400, opts);
    // printLeft = 180; clamp to max(labelWidth+padding=72, 180) = 180
    expect(left.isInside).toBe(false);
    expect(left.x).toBe(180);
    expect(left.arrow).toBe('→');
    expect(left.arrowFirst).toBe(false);
    expect(left.translateX).toBe(-64); // -labelWidth
  });
});
