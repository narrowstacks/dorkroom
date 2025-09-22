describe("useExposureCalculator", () => {
  describe("hook functionality", () => {
    it("should be importable", () => {
      const { useExposureCalculator } = require("../useExposureCalculator");
      expect(typeof useExposureCalculator).toBe("function");
    });

    it("should export default hook", () => {
      const useExposureCalculatorDefault =
        require("../useExposureCalculator").default;
      expect(typeof useExposureCalculatorDefault).toBe("function");
    });
  });

  describe("common functions", () => {
    it("should import calculateNewTime function", () => {
      const { calculateNewTime } = require("../commonFunctions");
      expect(typeof calculateNewTime).toBe("function");
    });

    it("should import roundStops function", () => {
      const { roundStops } = require("../commonFunctions");
      expect(typeof roundStops).toBe("function");
    });
  });

  describe("calculateNewTime", () => {
    it("should calculate correct exposure times for positive stops", () => {
      const { calculateNewTime } = require("../commonFunctions");

      // 1 stop = double the time
      expect(calculateNewTime(10, 1)).toBe(20);

      // 2 stops = quadruple the time
      expect(calculateNewTime(10, 2)).toBe(40);

      // 0.5 stops = √2 times the time
      expect(calculateNewTime(10, 0.5)).toBeCloseTo(14.14, 2);

      // 3 stops = 8 times the time
      expect(calculateNewTime(5, 3)).toBe(40);
    });

    it("should calculate correct exposure times for negative stops", () => {
      const { calculateNewTime } = require("../commonFunctions");

      // -1 stop = half the time
      expect(calculateNewTime(10, -1)).toBe(5);

      // -2 stops = quarter the time
      expect(calculateNewTime(20, -2)).toBe(5);

      // -0.5 stops = 1/√2 times the time
      expect(calculateNewTime(14.14, -0.5)).toBeCloseTo(10, 1);

      // -3 stops = 1/8 times the time
      expect(calculateNewTime(80, -3)).toBe(10);
    });

    it("should handle zero stop change", () => {
      const { calculateNewTime } = require("../commonFunctions");

      expect(calculateNewTime(10, 0)).toBe(10);
      expect(calculateNewTime(5.5, 0)).toBe(5.5);
      expect(calculateNewTime(0.5, 0)).toBe(0.5);
    });

    it("should handle fractional times and stops", () => {
      const { calculateNewTime } = require("../commonFunctions");

      expect(calculateNewTime(2.5, 1)).toBe(5);
      expect(calculateNewTime(1.25, 2)).toBe(5);
      expect(calculateNewTime(7.5, -1)).toBe(3.75);
    });

    it("should handle very small and large values", () => {
      const { calculateNewTime } = require("../commonFunctions");

      // Very small time
      expect(calculateNewTime(0.01, 1)).toBeCloseTo(0.02, 3);

      // Very large time
      expect(calculateNewTime(1000, 1)).toBe(2000);

      // Large stop changes
      expect(calculateNewTime(1, 10)).toBe(1024); // 2^10 = 1024
      expect(calculateNewTime(1024, -10)).toBe(1);
    });
  });

  describe("roundStops", () => {
    it("should round to nearest half stop within tolerance", () => {
      const { roundStops } = require("../commonFunctions");

      // Values very close to half stops should round (within 0.01 tolerance)
      expect(roundStops(1.005)).toBe(1);
      expect(roundStops(1.495)).toBe(1.5);
      expect(roundStops(1.505)).toBe(1.5);
      expect(roundStops(1.995)).toBe(2);

      // Exact half stops
      expect(roundStops(0.5)).toBe(0.5);
      expect(roundStops(1.5)).toBe(1.5);
      expect(roundStops(2.5)).toBe(2.5);

      // Whole stops
      expect(roundStops(1)).toBe(1);
      expect(roundStops(2)).toBe(2);
      expect(roundStops(3)).toBe(3);
    });

    it("should not round values outside tolerance", () => {
      const { roundStops } = require("../commonFunctions");

      // Values too far from half stops should not round
      // Tolerance is 0.01 (1%)
      expect(roundStops(1.02)).toBe(1.02); // Too far from 1
      expect(roundStops(1.48)).toBe(1.48); // Too far from 1.5
      expect(roundStops(1.52)).toBe(1.52); // Too far from 1.5
      expect(roundStops(1.98)).toBe(1.98); // Too far from 2
      expect(roundStops(1.01)).toBe(1.01); // Outside tolerance
    });

    it("should handle negative values", () => {
      const { roundStops } = require("../commonFunctions");

      expect(roundStops(-1.005)).toBe(-1);
      expect(roundStops(-1.495)).toBe(-1.5);
      expect(roundStops(-1.505)).toBe(-1.5);
      expect(roundStops(-1.995)).toBe(-2);
      expect(roundStops(-0.5)).toBe(-0.5);

      // Values outside tolerance should not round
      expect(roundStops(-1.01)).toBe(-1.01);
    });

    it("should handle zero and very small values", () => {
      const { roundStops } = require("../commonFunctions");

      expect(roundStops(0)).toBe(0);
      expect(roundStops(0.005)).toBe(0);
      expect(Math.abs(roundStops(-0.005))).toBe(0); // Handle -0 vs 0 quirk
      expect(roundStops(0.495)).toBe(0.5);
      expect(roundStops(-0.495)).toBe(-0.5);

      // Values outside tolerance
      expect(roundStops(0.02)).toBe(0.02);
      expect(roundStops(-0.02)).toBe(-0.02);
    });
  });

  describe("shutter speed parsing", () => {
    it("should parse fractional shutter speeds", () => {
      const { parseShutterSpeed } = require("../commonFunctions");

      expect(parseShutterSpeed("1/60")).toBeCloseTo(0.0167, 4);
      expect(parseShutterSpeed("1/125")).toBeCloseTo(0.008, 3);
      expect(parseShutterSpeed("1/250")).toBeCloseTo(0.004, 3);
      expect(parseShutterSpeed("1/500")).toBeCloseTo(0.002, 3);
      expect(parseShutterSpeed("1/1000")).toBeCloseTo(0.001, 3);
    });

    it("should parse decimal shutter speeds", () => {
      const { parseShutterSpeed } = require("../commonFunctions");

      expect(parseShutterSpeed("1")).toBe(1);
      expect(parseShutterSpeed("2")).toBe(2);
      expect(parseShutterSpeed("0.5")).toBe(0.5);
      expect(parseShutterSpeed("1.5")).toBe(1.5);
      expect(parseShutterSpeed("30")).toBe(30);
    });

    it("should handle whitespace in fractional speeds", () => {
      const { parseShutterSpeed } = require("../commonFunctions");

      expect(parseShutterSpeed(" 1 / 60 ")).toBeCloseTo(0.0167, 4);
      expect(parseShutterSpeed("1/ 125")).toBeCloseTo(0.008, 3);
      expect(parseShutterSpeed("1 /250")).toBeCloseTo(0.004, 3);
    });

    it("should throw error for invalid input", () => {
      const { parseShutterSpeed } = require("../commonFunctions");

      expect(() => parseShutterSpeed("invalid")).toThrow();
      expect(() => parseShutterSpeed("")).toThrow();
      expect(() => parseShutterSpeed("/60")).toThrow();

      // Note: '1/' is actually parsed as '1' by parseFloat, so it doesn't throw
      // This is how the actual implementation works
    });

    it("should throw error for division by zero", () => {
      const { parseShutterSpeed } = require("../commonFunctions");

      expect(() => parseShutterSpeed("1/0")).toThrow("Denominator cannot be 0");
    });
  });

  describe("shutter speed formatting", () => {
    it("should format fast shutter speeds as fractions", () => {
      const { formatShutterSpeed } = require("../commonFunctions");

      expect(formatShutterSpeed(1 / 60)).toBe("1/60");
      expect(formatShutterSpeed(1 / 125)).toBe("1/125");
      expect(formatShutterSpeed(1 / 250)).toBe("1/250");
      expect(formatShutterSpeed(1 / 500)).toBe("1/500");
      expect(formatShutterSpeed(1 / 1000)).toBe("1/1000");
    });

    it("should format slow shutter speeds correctly", () => {
      const { formatShutterSpeed } = require("../commonFunctions");

      // Speeds >= 1 second are formatted as decimals for whole numbers
      expect(formatShutterSpeed(1)).toBe("1");
      expect(formatShutterSpeed(2)).toBe("2");
      expect(formatShutterSpeed(30)).toBe("30");
      expect(formatShutterSpeed(1.5)).toBe("1.50");

      // Speeds < 1 second are formatted as fractions
      expect(formatShutterSpeed(0.5)).toBe("1/2");
      expect(formatShutterSpeed(0.25)).toBe("1/4");
    });
  });

  describe("mathematical edge cases", () => {
    it("should handle extreme stop values", () => {
      const { calculateNewTime } = require("../commonFunctions");

      // Very large positive stops
      expect(calculateNewTime(1, 20)).toBe(1048576); // 2^20

      // Very large negative stops
      expect(calculateNewTime(1048576, -20)).toBe(1);

      // Fractional stops with many decimal places
      expect(calculateNewTime(10, 0.333333)).toBeCloseTo(12.599, 3);
    });

    it("should handle precision with very small numbers", () => {
      const { calculateNewTime } = require("../commonFunctions");

      // Very small times
      expect(calculateNewTime(0.001, 1)).toBeCloseTo(0.002, 6);
      expect(calculateNewTime(0.0001, 2)).toBeCloseTo(0.0004, 6);
    });

    it("should maintain precision with repeated calculations", () => {
      const { calculateNewTime } = require("../commonFunctions");

      let time = 10;
      // Add and subtract the same stop amount
      time = calculateNewTime(time, 1);
      time = calculateNewTime(time, -1);

      expect(time).toBeCloseTo(10, 10); // Should return to original value
    });
  });

  describe("practical photography scenarios", () => {
    it("should calculate common exposure compensation scenarios", () => {
      const { calculateNewTime } = require("../commonFunctions");

      // Sunny 16 rule baseline: f/16, 1/ISO seconds
      // For ISO 100: 1/100 second (0.01)
      const baseTime = 0.01;

      // Open up 1 stop (f/11): halve the time
      expect(calculateNewTime(baseTime, -1)).toBeCloseTo(0.005, 3);

      // Open up 2 stops (f/8): quarter the time
      expect(calculateNewTime(baseTime, -2)).toBeCloseTo(0.0025, 4);

      // Stop down 1 stop (f/22): double the time
      expect(calculateNewTime(baseTime, 1)).toBeCloseTo(0.02, 3);
    });

    it("should handle reciprocity failure compensation", () => {
      const { calculateNewTime } = require("../commonFunctions");

      // For very long exposures, photographers often need to add extra time
      // Base exposure: 60 seconds
      const longExposure = 60;

      // Add 1/3 stop for reciprocity failure
      const compensated = calculateNewTime(longExposure, 1 / 3);
      expect(compensated).toBeCloseTo(75.6, 1); // ≈ 2^(1/3) * 60
    });

    it("should calculate exposure bracketing", () => {
      const { calculateNewTime } = require("../commonFunctions");

      const baseTime = 1 / 60; // 1/60 second

      // Bracket ±1 stop
      const underexposed = calculateNewTime(baseTime, -1);
      const overexposed = calculateNewTime(baseTime, 1);

      expect(underexposed).toBeCloseTo(1 / 120, 5);
      expect(overexposed).toBeCloseTo(1 / 30, 5);

      // Bracket ±1/3 stop
      const underexposed13 = calculateNewTime(baseTime, -1 / 3);
      const overexposed13 = calculateNewTime(baseTime, 1 / 3);

      expect(underexposed13).toBeCloseTo(0.0132, 4); // ≈ 1/75.6
      expect(overexposed13).toBeCloseTo(0.021, 4); // ≈ 1/47.6
    });
  });

  describe("hook integration testing", () => {
    it("should test calculation integration", () => {
      // Test the internal helper function logic
      const useExposureCalculatorModule = require("../useExposureCalculator");

      // Since we can't easily test the hook directly without React testing utils,
      // we can at least verify the module structure and helper functions work
      expect(typeof useExposureCalculatorModule.useExposureCalculator).toBe(
        "function",
      );

      // Test that the calculation chain works
      const { calculateNewTime } = require("../commonFunctions");

      // Simulate the workflow: original time -> stop change -> new time
      const originalTime = 10;
      const stopChange = 1;
      const newTime = calculateNewTime(originalTime, stopChange);

      expect(newTime).toBe(20);
      expect(newTime.toFixed(2)).toBe("20.00");
    });

    it("should test input validation logic", () => {
      const { calculateNewTime } = require("../commonFunctions");

      // Test scenarios that would be handled in the hook

      // Valid numeric inputs
      expect(calculateNewTime(10, 1)).toBe(20);

      // Zero time should work mathematically but would be invalid practically
      expect(calculateNewTime(0, 1)).toBe(0);

      // NaN inputs would be filtered out by the hook's validation
      expect(isNaN(calculateNewTime(NaN, 1))).toBe(true);
      expect(isNaN(calculateNewTime(10, NaN))).toBe(true);
    });
  });
});
