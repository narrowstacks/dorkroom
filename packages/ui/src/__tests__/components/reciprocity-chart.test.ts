import { describe, expect, it } from 'vitest';
import { computeChartData } from '../../components/reciprocity-chart-data';

// The chart generates hover points every 15s, scaling the interval up when the
// range would produce more than 50 points (maxMetered > 750, i.e. exposures
// over ~8 minutes with the 1.5x headroom).
describe('computeChartData hover points', () => {
  const factor = 1.3;

  const hoverTimes = (originalTime: number) => {
    const adjustedTime = originalTime ** factor;
    return computeChartData(originalTime, adjustedTime, factor).hoverPoints.map(
      (p) => p.meteredTime
    );
  };

  describe('short exposures (unscaled 15s interval)', () => {
    it('generates points at 15s multiples', () => {
      const times = hoverTimes(100);
      expect(times).toContain(15);
      expect(times).toContain(30);
      expect(times).toContain(300);
    });

    it('includes the current exposure when it is off the 15s grid', () => {
      expect(hoverTimes(40)).toContain(40);
    });

    it('does not duplicate the current exposure when it is on the 15s grid', () => {
      const times = hoverTimes(60);
      expect(times.filter((t) => t === 60)).toHaveLength(1);
    });
  });

  describe('long exposures (scaled interval)', () => {
    // originalTime 615 -> maxMetered 922.5 -> 62 candidate points -> interval
    // doubles to 30s. 615 is a multiple of 15 but not of 30, so the old
    // unscaled-interval guard skipped it (issue #242).
    it('includes the current exposure when it is a multiple of 15 but not of the scaled interval', () => {
      expect(hoverTimes(615)).toContain(615);
    });

    it('uses the passed adjusted time for the current exposure point', () => {
      const adjustedTime = 1234.5;
      const { hoverPoints } = computeChartData(615, adjustedTime, factor);
      const current = hoverPoints.find((p) => p.meteredTime === 615);
      expect(current?.adjustedTime).toBe(adjustedTime);
    });

    it('does not duplicate the current exposure when it is on the scaled grid', () => {
      // originalTime 600 -> maxMetered 900 -> interval 30; 600 % 30 === 0
      const times = hoverTimes(600);
      expect(times.filter((t) => t === 600)).toHaveLength(1);
    });

    it('includes the current exposure when it is off any grid', () => {
      expect(hoverTimes(617)).toContain(617);
    });

    it('caps generated points near the 50-point maximum', () => {
      // originalTime 1000 -> maxMetered 1500 -> 100 candidates -> interval 30
      // -> exactly 50 generated points (the last lands on maxMetered), plus
      // the current-exposure point at 1000.
      expect(hoverTimes(1000)).toHaveLength(51);
    });
  });

  it('returns hover points sorted by metered time', () => {
    const times = hoverTimes(615);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
