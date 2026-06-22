import { describe, expect, it } from 'vitest';
import { computePaperBox, computePrintRect } from './geometry';

describe('computePaperBox', () => {
  it('fills container width when height fits under the cap', () => {
    // 8x10 portrait paper, aspect 0.8 -> height 375 would exceed cap 320
    expect(computePaperBox(8, 10, 300, 320)).toEqual({
      width: 256,
      height: 320,
    });
  });

  it('uses full width when the resulting height is under the cap', () => {
    // square paper, aspect 1 -> height 300 <= cap 320
    expect(computePaperBox(8, 8, 300, 320)).toEqual({
      width: 300,
      height: 300,
    });
  });

  it('returns a zero box for non-positive inputs', () => {
    expect(computePaperBox(8, 10, 0, 320)).toEqual({ width: 0, height: 0 });
    expect(computePaperBox(0, 10, 300, 320)).toEqual({ width: 0, height: 0 });
  });
});

describe('computePrintRect', () => {
  it('positions the print area from border/print percentages', () => {
    const rect = computePrintRect(
      {
        leftBorderPercent: 10,
        topBorderPercent: 20,
        printWidthPercent: 80,
        printHeightPercent: 60,
      },
      { width: 200, height: 100 }
    );
    expect(rect).toEqual({ left: 20, top: 20, width: 160, height: 60 });
  });
});
