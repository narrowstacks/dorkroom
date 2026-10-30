import {
  calculateExposureAdjustment,
  calculateNewExposureTime,
  calculatePercentageIncrease,
  calculatePushPull,
  formatExposureTime,
  parseExposureTime,
  roundStopsToThirds,
} from '../../utils/exposure-calculations';

describe('exposure calculations', () => {
  describe('calculateNewExposureTime', () => {
    it('should calculate correct exposure times for positive stops', () => {
      expect(calculateNewExposureTime(10, 1)).toBe(20); // +1 stop = double time
      expect(calculateNewExposureTime(10, 2)).toBe(40); // +2 stops = quadruple time
      expect(calculateNewExposureTime(10, 3)).toBe(80); // +3 stops = 8x time
    });

    it('should calculate correct exposure times for negative stops', () => {
      expect(calculateNewExposureTime(20, -1)).toBe(10); // -1 stop = half time
      expect(calculateNewExposureTime(40, -2)).toBe(10); // -2 stops = quarter time
      expect(calculateNewExposureTime(80, -3)).toBe(10); // -3 stops = 1/8 time
    });

    it('should handle fractional stops', () => {
      expect(calculateNewExposureTime(10, 0.5)).toBeCloseTo(14.14, 2); // +0.5 stop = √2 times
      expect(calculateNewExposureTime(10, 1 / 3)).toBeCloseTo(12.6, 2); // +1/3 stop
      expect(calculateNewExposureTime(20, -0.5)).toBeCloseTo(14.14, 2); // -0.5 stop
    });

    it('should handle zero stop change', () => {
      expect(calculateNewExposureTime(10, 0)).toBe(10);
      expect(calculateNewExposureTime(25.5, 0)).toBe(25.5);
    });

    it('should handle edge cases', () => {
      expect(calculateNewExposureTime(0, 1)).toBe(0);
      expect(calculateNewExposureTime(1, 10)).toBe(1024); // 2^10 = 1024
    });
  });

  describe('roundStopsToThirds', () => {
    it('should round to nearest third when close enough', () => {
      expect(roundStopsToThirds(1)).toBe(1);
      expect(roundStopsToThirds(1.34)).toBeCloseTo(1.33, 2); // close to 1 1/3, rounds
      expect(roundStopsToThirds(1.66)).toBeCloseTo(1.67, 2); // close to 1 2/3, rounds
      expect(roundStopsToThirds(2)).toBe(2);
    });

    it('should preserve values that are far from thirds', () => {
      expect(roundStopsToThirds(1.15)).toBe(1.15); // not close enough to round
      expect(roundStopsToThirds(1.5)).toBe(1.5); // not close enough to round
      expect(roundStopsToThirds(1.85)).toBe(1.85); // not close enough to round
    });

    it('should handle negative values', () => {
      expect(roundStopsToThirds(-1.15)).toBe(-1.15); // not close enough to round
      expect(roundStopsToThirds(-1.34)).toBeCloseTo(-1.33, 2); // close enough to round
      // -0.67 is within tolerance of -2/3 and snaps to it exactly
      expect(roundStopsToThirds(-0.67)).toBeCloseTo(-2 / 3, 4);
    });

    it('should preserve values within tolerance', () => {
      expect(roundStopsToThirds(1.335)).toBeCloseTo(1.33, 2); // rounds to 1.33
      expect(roundStopsToThirds(1.32)).toBe(1.32); // not close enough, preserved
    });

    it('should handle edge cases', () => {
      expect(roundStopsToThirds(0)).toBe(0);
      expect(roundStopsToThirds(0.16)).toBe(0.16); // not close enough to 0 or 1/3
      expect(roundStopsToThirds(0.34)).toBeCloseTo(0.33, 2); // close to 1/3
    });
  });

  describe('formatExposureTime', () => {
    it('should format seconds for times under 1 minute', () => {
      expect(formatExposureTime(30)).toBe('30s');
      expect(formatExposureTime(5.5)).toBe('5.5s');
      expect(formatExposureTime(0.5)).toBe('0.5s');
      expect(formatExposureTime(59.99)).toBe('59.99s');
    });

    it('should format minutes for times 1 minute and over', () => {
      expect(formatExposureTime(60)).toBe('1m');
      expect(formatExposureTime(120)).toBe('2m');
      expect(formatExposureTime(300)).toBe('5m');
    });

    it('should format minutes and seconds for mixed times', () => {
      expect(formatExposureTime(90)).toBe('1m 30s');
      expect(formatExposureTime(125.5)).toBe('2m 5.5s');
      expect(formatExposureTime(185.25)).toBe('3m 5.25s');
    });

    it('should handle edge cases', () => {
      expect(formatExposureTime(0)).toBe('0s');
      expect(formatExposureTime(60.5)).toBe('1m 0.5s');
      expect(formatExposureTime(3661)).toBe('61m 1s'); // over 1 hour
    });

    it('should round seconds appropriately', () => {
      expect(formatExposureTime(90.005)).toBe('1m 30s'); // rounds to 30 (standard precision)
      expect(formatExposureTime(60.001)).toBe('1m 0s'); // remainingSeconds > 0, so shows rounded seconds
    });

    it('should carry a rounded remainder into the next unit instead of printing 60s', () => {
      // Rounding 119.999 to standard precision decomposes to "1m 59.999s",
      // which itself rounds to the impossible "1m 60s" unless carried.
      expect(formatExposureTime(119.999)).toBe('2m');
      // Rounding 59.999 to standard precision reaches 60, which belongs in
      // the minutes branch, not printed verbatim as the impossible "60s".
      expect(formatExposureTime(59.999)).toBe('1m');
    });
  });

  describe('parseExposureTime', () => {
    it('should parse valid numeric strings', () => {
      expect(parseExposureTime('30')).toBe(30);
      expect(parseExposureTime('5.5')).toBe(5.5);
      expect(parseExposureTime('0.25')).toBe(0.25);
      expect(parseExposureTime('120')).toBe(120);
    });

    // Comma parsing itself is covered by input-validation.test.ts; this
    // pins that parseExposureTime routes through it (#318).
    it('should accept a comma decimal separator (#318)', () => {
      expect(parseExposureTime('12,5')).toBe(12.5);
    });

    it('should handle whitespace', () => {
      expect(parseExposureTime('  30  ')).toBe(30);
      expect(parseExposureTime('\t5.5\n')).toBe(5.5);
    });

    it('should return null for invalid inputs', () => {
      expect(parseExposureTime('')).toBeNull();
      expect(parseExposureTime('   ')).toBeNull();
      expect(parseExposureTime('abc')).toBeNull();
      // Trailing text is rejected rather than read as its leading number.
      expect(parseExposureTime('1m30s')).toBeNull();
      expect(parseExposureTime('12abc')).toBeNull();
      expect(parseExposureTime('1,234.5')).toBeNull();
    });

    it('should return null for zero and negative values', () => {
      expect(parseExposureTime('0')).toBeNull();
      expect(parseExposureTime('-5')).toBeNull();
      expect(parseExposureTime('-0.1')).toBeNull();
    });

    it('should handle edge cases', () => {
      expect(parseExposureTime('0.0001')).toBe(0.0001);
      expect(parseExposureTime('999999')).toBe(999999);
      expect(parseExposureTime('Infinity')).toBeNull();
      expect(parseExposureTime('NaN')).toBeNull();
    });
  });

  describe('calculatePercentageIncrease', () => {
    it('should calculate positive percentage increases', () => {
      expect(calculatePercentageIncrease(10, 20)).toBe(100); // 100% increase
      expect(calculatePercentageIncrease(10, 15)).toBe(50); // 50% increase
      expect(calculatePercentageIncrease(10, 11)).toBe(10); // 10% increase
    });

    it('should calculate negative percentage changes (decreases)', () => {
      expect(calculatePercentageIncrease(20, 10)).toBe(-50); // 50% decrease
      expect(calculatePercentageIncrease(10, 5)).toBe(-50); // 50% decrease
      expect(calculatePercentageIncrease(10, 9)).toBe(-10); // 10% decrease
    });

    it('should handle no change', () => {
      expect(calculatePercentageIncrease(10, 10)).toBe(0);
      expect(calculatePercentageIncrease(5.5, 5.5)).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(calculatePercentageIncrease(0, 10)).toBe(0); // divide by zero case
      expect(calculatePercentageIncrease(-1, 10)).toBe(0); // negative original
      expect(calculatePercentageIncrease(10, 0)).toBe(-100); // 100% decrease
    });

    it('should handle fractional values', () => {
      expect(calculatePercentageIncrease(2.5, 5)).toBe(100);
      expect(calculatePercentageIncrease(3.33, 6.66)).toBeCloseTo(100, 1);
      expect(calculatePercentageIncrease(1.5, 1.8)).toBeCloseTo(20, 1);
    });
  });

  describe('calculatePushPull', () => {
    it('returns positive stops for a push, rounded to two decimals', () => {
      expect(calculatePushPull(800, 400)).toBe(1);
      expect(calculatePushPull(1600, 400)).toBe(2);
      // FP4 (125) at 400: log2(3.2) = 1.678...
      expect(calculatePushPull(400, 125)).toBe(1.68);
    });

    it('returns negative stops for a pull', () => {
      expect(calculatePushPull(200, 400)).toBe(-1);
      // log2(0.75) = -0.415...
      expect(calculatePushPull(75, 100)).toBe(-0.42);
    });

    it('returns 0 at box speed', () => {
      expect(calculatePushPull(400, 400)).toBe(0);
    });

    it('returns 0 for non-positive inputs', () => {
      expect(calculatePushPull(0, 400)).toBe(0);
      expect(calculatePushPull(400, 0)).toBe(0);
      expect(calculatePushPull(-400, 400)).toBe(0);
      expect(calculatePushPull(400, -400)).toBe(0);
    });
  });

  describe('calculateExposureAdjustment', () => {
    it('assembles the readout for a one-stop increase', () => {
      expect(calculateExposureAdjustment(10, 1)).toEqual({
        originalTimeValue: 10,
        stopsValue: 1,
        newTimeValue: 20,
        addedTime: 10,
        percentageIncrease: 100,
        isValid: true,
      });
    });

    it('reports a negative added time and percentage for a decrease', () => {
      expect(calculateExposureAdjustment(20, -1)).toEqual({
        originalTimeValue: 20,
        stopsValue: -1,
        newTimeValue: 10,
        addedTime: -10,
        percentageIncrease: -50,
        isValid: true,
      });
    });

    it('returns null for a non-positive or non-finite metered time', () => {
      expect(calculateExposureAdjustment(0, 1)).toBeNull();
      expect(calculateExposureAdjustment(-5, 1)).toBeNull();
      expect(calculateExposureAdjustment(Number.NaN, 1)).toBeNull();
      expect(
        calculateExposureAdjustment(Number.POSITIVE_INFINITY, 1)
      ).toBeNull();
    });

    it('returns null for non-finite stops', () => {
      expect(calculateExposureAdjustment(10, Number.NaN)).toBeNull();
      expect(
        calculateExposureAdjustment(10, Number.POSITIVE_INFINITY)
      ).toBeNull();
    });
  });
});
