import {
  createMemoKey,
  roundToPrecision,
  roundToStandardPrecision,
} from "../../utils/precision";

describe("precision utilities", () => {
  describe("roundToPrecision", () => {
    it("should round to specified decimal places", () => {
      expect(roundToPrecision(Math.PI, 2)).toBe(3.14);
      expect(roundToPrecision(Math.PI, 3)).toBe(3.142);
      expect(roundToPrecision(Math.PI, 0)).toBe(3);
    });

    it("should handle negative numbers", () => {
      expect(roundToPrecision(-Math.PI, 2)).toBe(-3.14);
      expect(roundToPrecision(-3.99999, 2)).toBe(-4);
    });

    it("should use default precision when not specified", () => {
      expect(roundToPrecision(Math.PI)).toBe(3.14); // default is 2 decimal places
    });

    it("should handle whole numbers", () => {
      expect(roundToPrecision(5, 2)).toBe(5);
      expect(roundToPrecision(5.00001, 2)).toBe(5);
    });

    it("should handle edge cases", () => {
      expect(roundToPrecision(0, 2)).toBe(0);
      expect(roundToPrecision(0.001, 2)).toBe(0);
      expect(roundToPrecision(0.005, 2)).toBe(0.01); // rounds up
    });
  });

  describe("roundToStandardPrecision", () => {
    it("should round to standard precision (hundredths)", () => {
      expect(roundToStandardPrecision(Math.PI)).toBe(3.14);
      expect(roundToStandardPrecision(3.146)).toBe(3.15);
      expect(roundToStandardPrecision(3.144)).toBe(3.14);
    });

    it("should handle negative numbers", () => {
      expect(roundToStandardPrecision(-Math.PI)).toBe(-3.14);
      expect(roundToStandardPrecision(-3.146)).toBe(-3.15);
    });

    it("should handle edge cases", () => {
      expect(roundToStandardPrecision(0)).toBe(0);
      expect(roundToStandardPrecision(0.001)).toBe(0);
      expect(roundToStandardPrecision(0.005)).toBe(0.01);
    });

    it("should handle very small numbers", () => {
      expect(roundToStandardPrecision(0.0001)).toBe(0);
      expect(roundToStandardPrecision(0.0051)).toBe(0.01);
    });
  });

  describe("createMemoKey", () => {
    it("should create consistent keys for the same values", () => {
      const key1 = createMemoKey(1.23, 4.56, true);
      const key2 = createMemoKey(1.23, 4.56, true);
      expect(key1).toBe(key2);
    });

    it("should create different keys for different values", () => {
      const key1 = createMemoKey(1.23, 4.56, true);
      const key2 = createMemoKey(1.23, 4.56, false);
      expect(key1).not.toBe(key2);
    });

    it("should handle mixed types", () => {
      const key = createMemoKey(1.23, "test", true, 456);
      expect(typeof key).toBe("string");
      expect(key).toContain(":");
    });

    it("should round numbers for consistent keys", () => {
      const key1 = createMemoKey(1.234567);
      const key2 = createMemoKey(1.234999); // both round to 123 with ROUNDING_MULTIPLIER of 100
      expect(key1).toBe(key2);
    });

    it("should handle edge cases", () => {
      expect(createMemoKey()).toBe("");
      expect(createMemoKey(0)).toBe("0");
      expect(createMemoKey(true)).toBe("true");
      expect(createMemoKey("")).toBe("");
    });

    it("should maintain order", () => {
      const key1 = createMemoKey(1, 2, 3);
      const key2 = createMemoKey(3, 2, 1);
      expect(key1).not.toBe(key2);
    });
  });
});
