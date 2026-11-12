import { describe, expect, it } from 'vitest';
import {
  bladeLabelOffset,
  computeBladeReadings,
  layoutReadings,
  READING_GAP,
  READING_MAX_FONT_SCALE,
  readingSize,
} from './blade-readings-layout';

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
    const [left, , top, bottom] = computeBladeReadings(
      largePrint,
      400,
      400,
      opts
    );
    // print spans 100..300 in both axes; centers at 200
    expect(left.isInside).toBe(true);
    expect(left.x).toBe(100); // printLeft
    expect(left.y).toBe(200); // centerY
    expect(left.arrow).toBe('←');
    expect(left.arrowFirst).toBe(true);
    expect(top.arrow).toBe('↑');
    // top and bottom share the same x anchor (print center) so they align
    expect(top.x).toBe(200);
    expect(bottom.x).toBe(200);
  });

  it('pushes labels outside and flips arrows when the print area is small', () => {
    const [left] = computeBladeReadings(smallPrint, 400, 400, opts);
    // printLeft = 180; clamp to max(labelWidth+padding=72, 180) = 180
    expect(left.isInside).toBe(false);
    expect(left.x).toBe(180);
    expect(left.arrow).toBe('→');
    expect(left.arrowFirst).toBe(false);
  });

  // The clamps keep an outside label from running off the paper when the print
  // sits close to that edge. The small-print fixture above is too central to
  // reach either clamp, so these two put the print flush against opposite
  // corners of the 400x400 box (print is 80x80, outside labels either way).
  it('clamps outside labels away from the near paper edges', () => {
    const nearTopLeft = {
      ...smallPrint,
      leftBorderPercent: 5, // printLeft 20  < labelWidth + padding (72)
      rightBorderPercent: 75, // printRight 100
      topBorderPercent: 5, // printTop 20   < labelHeight + padding (44)
      bottomBorderPercent: 75, // printBottom 100
    };
    const readings = computeBladeReadings(nearTopLeft, 400, 400, opts);
    expect(readings.every((r) => !r.isInside)).toBe(true);
    const [left, right, top, bottom] = readings;
    expect(left.x).toBe(72); // lifted from 20 to labelWidth + padding
    expect(right.x).toBe(100); // 100 < 400 - 64 - 8, not clamped
    expect(top.y).toBe(44); // lifted from 20 to labelHeight + padding
    expect(bottom.y).toBe(100); // 100 < 400 - 36 - 8, not clamped
  });

  it('clamps outside labels away from the far paper edges', () => {
    const nearBottomRight = {
      ...smallPrint,
      leftBorderPercent: 75, // printLeft 300
      rightBorderPercent: 5, // printRight 380 > 400 - labelWidth - padding (328)
      topBorderPercent: 75, // printTop 300
      bottomBorderPercent: 5, // printBottom 380 > 400 - labelHeight - padding (356)
    };
    const readings = computeBladeReadings(nearBottomRight, 400, 400, opts);
    expect(readings.every((r) => !r.isInside)).toBe(true);
    const [left, right, top, bottom] = readings;
    expect(left.x).toBe(300); // 300 > 72, not clamped
    expect(right.x).toBe(328); // pulled in from 380
    expect(top.y).toBe(300); // 300 > 44, not clamped
    expect(bottom.y).toBe(356); // pulled in from 380
  });
});

describe('bladeLabelOffset', () => {
  // Centers each label on its anchor using the label's measured size, so
  // top/bottom (both anchored at print center x) line up regardless of width.
  it('offsets inside labels toward the print interior', () => {
    expect(bladeLabelOffset('left', true, 64, 36)).toEqual({
      translateX: 0,
      translateY: -18,
    });
    expect(bladeLabelOffset('right', true, 64, 36)).toEqual({
      translateX: -64,
      translateY: -18,
    });
    expect(bladeLabelOffset('top', true, 64, 36)).toEqual({
      translateX: -32,
      translateY: 0,
    });
    expect(bladeLabelOffset('bottom', true, 64, 36)).toEqual({
      translateX: -32,
      translateY: -36,
    });
  });

  it('flips the perpendicular offset for outside labels', () => {
    expect(bladeLabelOffset('left', false, 64, 36)).toEqual({
      translateX: -64,
      translateY: -18,
    });
    expect(bladeLabelOffset('top', false, 64, 36)).toEqual({
      translateX: -32,
      translateY: -36,
    });
  });

  it('centers top/bottom on the anchor using the actual width', () => {
    // Different widths still center on the same anchor x.
    expect(bladeLabelOffset('top', true, 40, 30).translateX).toBe(-20);
    expect(bladeLabelOffset('bottom', true, 80, 30).translateX).toBe(-40);
  });
});

describe('layoutReadings', () => {
  const around = (percent: number) => ({
    leftBorderPercent: percent,
    rightBorderPercent: percent,
    topBorderPercent: percent,
    bottomBorderPercent: percent,
    leftBladeReading: 1,
    rightBladeReading: 1,
    topBladeReading: 1,
    bottomBladeReading: 1,
  });

  it('uses the full form on a roomy print', () => {
    const { form, readings } = layoutReadings(around(15), 340, 280);
    expect(form).toBe('full');
    expect(readings).toHaveLength(4);
    // Each label sits against the edge it describes, inside the print.
    const left = readings.find((r) => r.side === 'left');
    expect(left?.left).toBeCloseTo(0.15 * 340 + 6, 6);
  });

  it('drops to the compact form when the full one would collide', () => {
    const forms = [20, 24, 28, 32, 36, 40].map(
      (p) => layoutReadings(around(p), 340, 280).form
    );
    expect(forms).toContain('compact');
    expect(forms[0]).toBe('full');
  });

  it('shows nothing when no form fits', () => {
    expect(layoutReadings(around(47), 340, 280)).toEqual({
      form: 'none',
      readings: [],
    });
  });

  it('keeps two labels at least 8pt apart and on the paper, at any print size', () => {
    for (const percent of [5, 10, 15, 20, 25, 28, 30, 33, 36, 40, 44, 47]) {
      for (const [w, h] of [
        [340, 280],
        [220, 340],
        [300, 300],
        [160, 200],
      ]) {
        const { readings } = layoutReadings(around(percent), w, h);
        for (const a of readings) {
          expect(a.left).toBeGreaterThanOrEqual(0);
          expect(a.top).toBeGreaterThanOrEqual(0);
          expect(a.left + a.width).toBeLessThanOrEqual(w);
          expect(a.top + a.height).toBeLessThanOrEqual(h);
          for (const b of readings) {
            if (a === b) continue;
            const apart =
              a.left + a.width + READING_GAP <= b.left ||
              b.left + b.width + READING_GAP <= a.left ||
              a.top + a.height + READING_GAP <= b.top ||
              b.top + b.height + READING_GAP <= a.top;
            expect(apart).toBe(true);
          }
        }
      }
    }
  });
});

describe('reading gap', () => {
  const around = (percent: number) => ({
    leftBorderPercent: percent,
    rightBorderPercent: percent,
    topBorderPercent: percent,
    bottomBorderPercent: percent,
    leftBladeReading: 1,
    rightBladeReading: 1,
    topBladeReading: 1,
    bottomBladeReading: 1,
  });

  it('is 8pt', () => {
    expect(READING_GAP).toBe(8);
  });

  it('goes compact rather than leave left and right labels almost touching', () => {
    // A print 130pt wide: the full labels (62 each) would leave 6pt between
    // them; the compact ones (52 each) leave 26.
    const { form, readings } = layoutReadings(around(31), 340, 280);
    expect(form).toBe('compact');
    const left = readings.find((r) => r.side === 'left');
    const right = readings.find((r) => r.side === 'right');
    expect(right!.left - (left!.left + left!.width)).toBeGreaterThanOrEqual(
      READING_GAP
    );
  });
});

describe('label boxes follow the font scale', () => {
  const around = (percent: number) => ({
    leftBorderPercent: percent,
    rightBorderPercent: percent,
    topBorderPercent: percent,
    bottomBorderPercent: percent,
    leftBladeReading: 1,
    rightBladeReading: 1,
    topBladeReading: 1,
    bottomBladeReading: 1,
  });

  it('sizes the boxes from the scale, capped at the text cap', () => {
    expect(readingSize('full', 1).row.width).toBe(62);
    expect(readingSize('full', 1.2).row.width).toBe(75);
    expect(readingSize('full', 2).row).toEqual(readingSize('full', 1.2).row);
    expect(readingSize('full', 0.8).row.width).toBe(62);
    expect(READING_MAX_FONT_SCALE).toBe(1.2);
  });

  it('fits the widest label (about 67pt at 1.2x) in a box at that scale', () => {
    expect(readingSize('full', 1.2).row.width).toBeGreaterThanOrEqual(67);
  });

  for (const scale of [1, 1.2]) {
    it(`keeps labels on the paper and apart at scale ${scale}`, () => {
      for (const percent of [10, 15, 20, 25, 30]) {
        const { readings } = layoutReadings(around(percent), 340, 280, scale);
        for (const a of readings) {
          expect(a.left).toBeGreaterThanOrEqual(0);
          expect(a.top).toBeGreaterThanOrEqual(0);
          expect(a.left + a.width).toBeLessThanOrEqual(340);
          expect(a.top + a.height).toBeLessThanOrEqual(280);
          for (const b of readings) {
            if (a === b) continue;
            const apart =
              a.left + a.width + READING_GAP <= b.left ||
              b.left + b.width + READING_GAP <= a.left ||
              a.top + a.height + READING_GAP <= b.top ||
              b.top + b.height + READING_GAP <= a.top;
            expect(apart).toBe(true);
          }
        }
      }
    });
  }

  it('uses the larger boxes at 1.2x', () => {
    const one = layoutReadings(around(15), 340, 280, 1).readings[0];
    const big = layoutReadings(around(15), 340, 280, 1.2).readings[0];
    expect(big.width).toBeGreaterThan(one.width);
  });
});
