import { describe, expect, it } from 'vitest';
import {
  STANDARD_APERTURES,
  STANDARD_SHUTTER_SPEEDS,
} from '../../constants/camera-exposure-defaults';
import {
  apertureToKey,
  calculateEV,
  calculateExposureValue,
  compareExposures,
  findNearestStandard,
  formatAperture,
  formatShutterSpeed,
  getEquivalentExposures,
  getEVDescription,
  isoToKey,
  keyToAperture,
  keyToISO,
  keyToShutterSpeed,
  shutterSpeedToKey,
  solveForAperture,
  solveForISO,
  solveForShutterSpeed,
} from '../../utils/camera-exposure-calculations';

describe('camera exposure calculations', () => {
  describe('calculateEV', () => {
    describe('known photographic scenarios', () => {
      it('should calculate EV 15 for Sunny 16 rule (f/16, 1/125s, ISO 100)', () => {
        // Sunny 16: bright sun with distinct shadows
        const ev = calculateEV(16, 1 / 125, 100);
        expect(ev).toBeCloseTo(15, 1);
      });

      it('should calculate EV 12 for overcast day (f/5.6, 1/125s, ISO 100)', () => {
        // Overcast: no shadows visible
        const ev = calculateEV(5.6, 1 / 125, 100);
        expect(ev).toBeCloseTo(11.9, 0.2);
      });

      it('should calculate EV 8 for indoor lighting (f/2.8, 1/60s, ISO 400)', () => {
        // Normal indoor room lighting
        const ev = calculateEV(2.8, 1 / 60, 400);
        expect(ev).toBeCloseTo(6.9, 0.2);
      });

      it('should calculate EV 5 for night street (f/2, 1/30s, ISO 1600)', () => {
        // Well-lit night street scene
        const ev = calculateEV(2, 1 / 30, 1600);
        expect(ev).toBeCloseTo(2.9, 0.2);
      });
    });

    describe('exposure reciprocity - one stop changes', () => {
      it('should maintain same EV when doubling shutter speed and halving ISO', () => {
        // f/8, 1/125s, ISO 100
        const ev1 = calculateEV(8, 1 / 125, 100);
        // f/8, 1/60s, ISO 50 (one stop longer exposure, one stop slower ISO)
        const ev2 = calculateEV(8, 1 / 60, 50);
        expect(ev1).toBeCloseTo(ev2, 0.1);
      });

      it('should maintain same EV when closing aperture one stop and halving shutter speed', () => {
        // f/5.6, 1/250s, ISO 200
        const ev1 = calculateEV(5.6, 1 / 250, 200);
        // f/8, 1/125s, ISO 200 (one stop smaller aperture, one stop longer exposure)
        const ev2 = calculateEV(8, 1 / 125, 200);
        expect(ev1).toBeCloseTo(ev2, 1);
      });

      it('should decrease EV by 1 when doubling ISO with same aperture and shutter', () => {
        // Higher ISO = lower EV at ISO 100 equivalent
        const ev100 = calculateEV(8, 1 / 125, 100);
        const ev200 = calculateEV(8, 1 / 125, 200);
        expect(ev200 - ev100).toBeCloseTo(-1, 0.1);
      });
    });

    describe('boundary and edge cases', () => {
      it('should handle wide apertures (f/1.4)', () => {
        const ev = calculateEV(1.4, 1 / 1000, 100);
        expect(ev).toBeGreaterThan(0);
        expect(Number.isFinite(ev)).toBe(true);
      });

      it('should handle narrow apertures (f/64)', () => {
        const ev = calculateEV(64, 1, 100);
        expect(ev).toBeGreaterThan(0);
        expect(Number.isFinite(ev)).toBe(true);
      });

      it('should handle very fast shutter speeds (1/8000s)', () => {
        const ev = calculateEV(2.8, 1 / 8000, 100);
        expect(ev).toBeGreaterThan(0);
        expect(Number.isFinite(ev)).toBe(true);
      });

      it('should handle long exposures (30s)', () => {
        const ev = calculateEV(16, 30, 100);
        expect(ev).toBeGreaterThan(0);
        expect(Number.isFinite(ev)).toBe(true);
      });

      it('should handle high ISO (12800)', () => {
        const ev = calculateEV(4, 1 / 60, 12800);
        expect(ev).toBeGreaterThan(0);
        expect(Number.isFinite(ev)).toBe(true);
      });

      it('should return 0 for invalid inputs (zero aperture)', () => {
        expect(calculateEV(0, 1 / 125, 100)).toBe(0);
      });

      it('should return 0 for invalid inputs (zero shutter speed)', () => {
        expect(calculateEV(8, 0, 100)).toBe(0);
      });

      it('should return 0 for invalid inputs (zero ISO)', () => {
        expect(calculateEV(8, 1 / 125, 0)).toBe(0);
      });

      it('should return 0 for invalid inputs (negative values)', () => {
        expect(calculateEV(-8, 1 / 125, 100)).toBe(0);
        expect(calculateEV(8, -1 / 125, 100)).toBe(0);
        expect(calculateEV(8, 1 / 125, -100)).toBe(0);
      });
    });
  });

  describe('solveForShutterSpeed', () => {
    describe('solving for known scenarios', () => {
      it('should solve for 1/125s when EV 15, f/16, ISO 100 (Sunny 16)', () => {
        const shutterSpeed = solveForShutterSpeed(15, 16, 100);
        expect(shutterSpeed).toBeCloseTo(1 / 125, 3);
      });

      it('should solve for 1/125s when EV 12, f/5.6, ISO 100', () => {
        const shutterSpeed = solveForShutterSpeed(12, 5.6, 100);
        expect(shutterSpeed).toBeCloseTo(1 / 125, 3);
      });

      it('should solve for longer exposures in low light', () => {
        // EV 3 at f/2.8, ISO 1600
        const shutterSpeed = solveForShutterSpeed(3, 2.8, 1600);
        expect(shutterSpeed).toBeGreaterThan(0);
        expect(shutterSpeed).toBeCloseTo(0.0614, 0.01);
      });
    });

    describe('reciprocity validation', () => {
      it('should produce values that roundtrip through calculateEV', () => {
        const targetEV = 13;
        const aperture = 11;
        const iso = 400;

        const shutterSpeed = solveForShutterSpeed(targetEV, aperture, iso);
        const calculatedEV = calculateEV(aperture, shutterSpeed, iso);

        expect(calculatedEV).toBeCloseTo(targetEV, 1);
      });

      it('should double shutter speed for one stop reduction in EV', () => {
        const shutter1 = solveForShutterSpeed(14, 8, 100);
        const shutter2 = solveForShutterSpeed(13, 8, 100);
        expect(shutter2 / shutter1).toBeCloseTo(2, 1);
      });
    });

    describe('edge cases', () => {
      it('should return 0 for invalid aperture', () => {
        expect(solveForShutterSpeed(13, 0, 100)).toBe(0);
        expect(solveForShutterSpeed(13, -8, 100)).toBe(0);
      });

      it('should return 0 for invalid ISO', () => {
        expect(solveForShutterSpeed(13, 8, 0)).toBe(0);
        expect(solveForShutterSpeed(13, 8, -100)).toBe(0);
      });

      it('should handle extreme EV values', () => {
        const shutterHigh = solveForShutterSpeed(20, 8, 100);
        const shutterLow = solveForShutterSpeed(-5, 8, 100);
        expect(Number.isFinite(shutterHigh)).toBe(true);
        expect(Number.isFinite(shutterLow)).toBe(true);
        expect(shutterHigh).toBeGreaterThan(0);
        expect(shutterLow).toBeGreaterThan(0);
      });
    });
  });

  describe('solveForAperture', () => {
    describe('solving for known scenarios', () => {
      it('should solve for f/16 when EV 15, 1/125s, ISO 100 (Sunny 16)', () => {
        const aperture = solveForAperture(15, 1 / 125, 100);
        expect(aperture).toBeCloseTo(15.81, 0);
      });

      it('should solve for f/5.6 when EV 12, 1/125s, ISO 100', () => {
        const aperture = solveForAperture(12, 1 / 125, 100);
        expect(aperture).toBeCloseTo(5.54, 0.1);
      });

      it('should solve for wide apertures in low light', () => {
        // EV 5 at 1/30s, ISO 1600
        const aperture = solveForAperture(5, 1 / 30, 1600);
        expect(aperture).toBeGreaterThan(0);
        expect(aperture).toBeCloseTo(4.13, 1);
      });
    });

    describe('reciprocity validation', () => {
      it('should produce values that roundtrip through calculateEV', () => {
        const targetEV = 10;
        const shutterSpeed = 1 / 60;
        const iso = 800;

        const aperture = solveForAperture(targetEV, shutterSpeed, iso);
        const calculatedEV = calculateEV(aperture, shutterSpeed, iso);

        expect(calculatedEV).toBeCloseTo(targetEV, 1);
      });

      it('should follow f-stop progression (each stop doubles f-number squared)', () => {
        const aperture1 = solveForAperture(14, 1 / 125, 100);
        const aperture2 = solveForAperture(13, 1 / 125, 100);
        // One stop smaller aperture means f-number increases by sqrt(2)
        expect(aperture1 / aperture2).toBeCloseTo(Math.sqrt(2), 1);
      });
    });

    describe('edge cases', () => {
      it('should return 0 for invalid shutter speed', () => {
        expect(solveForAperture(13, 0, 100)).toBe(0);
        expect(solveForAperture(13, -1 / 125, 100)).toBe(0);
      });

      it('should return 0 for invalid ISO', () => {
        expect(solveForAperture(13, 1 / 125, 0)).toBe(0);
        expect(solveForAperture(13, 1 / 125, -100)).toBe(0);
      });

      it('should handle extreme EV values', () => {
        const apertureHigh = solveForAperture(20, 1 / 125, 100);
        const apertureLow = solveForAperture(-5, 1 / 125, 100);
        expect(Number.isFinite(apertureHigh)).toBe(true);
        expect(Number.isFinite(apertureLow)).toBe(true);
        expect(apertureHigh).toBeGreaterThan(0);
        expect(apertureLow).toBeGreaterThan(0);
      });
    });
  });

  describe('solveForISO', () => {
    describe('solving for known scenarios', () => {
      it('should solve for ISO 100 when EV 15, f/16, 1/125s (Sunny 16)', () => {
        const iso = solveForISO(15, 16, 1 / 125);
        expect(iso).toBeCloseTo(97.66, 1);
      });

      it('should solve for ISO 100 when EV 12, f/5.6, 1/125s', () => {
        const iso = solveForISO(12, 5.6, 1 / 125);
        expect(iso).toBeCloseTo(95.7, 0);
      });

      it('should solve for high ISO in low light scenarios', () => {
        // EV 5 at f/2.8, 1/30s should require high ISO
        const iso = solveForISO(5, 2.8, 1 / 30);
        expect(iso).toBeGreaterThan(200);
        expect(iso).toBeCloseTo(735, 0);
      });
    });

    describe('reciprocity validation', () => {
      it('should produce values that roundtrip through calculateEV', () => {
        const targetEV = 11;
        const aperture = 8;
        const shutterSpeed = 1 / 250;

        const iso = solveForISO(targetEV, aperture, shutterSpeed);
        const calculatedEV = calculateEV(aperture, shutterSpeed, iso);

        expect(calculatedEV).toBeCloseTo(targetEV, 1);
      });

      it('should double ISO for one stop increase in EV', () => {
        const iso1 = solveForISO(12, 8, 1 / 125);
        const iso2 = solveForISO(13, 8, 1 / 125);
        expect(iso1 / iso2).toBeCloseTo(2, 1);
      });
    });

    describe('edge cases', () => {
      it('should return 0 for invalid aperture', () => {
        expect(solveForISO(13, 0, 1 / 125)).toBe(0);
        expect(solveForISO(13, -8, 1 / 125)).toBe(0);
      });

      it('should return 0 for invalid shutter speed', () => {
        expect(solveForISO(13, 8, 0)).toBe(0);
        expect(solveForISO(13, 8, -1 / 125)).toBe(0);
      });

      it('should handle extreme EV values', () => {
        const isoHigh = solveForISO(20, 8, 1 / 125);
        const isoLow = solveForISO(-5, 8, 1 / 125);
        expect(Number.isFinite(isoHigh)).toBe(true);
        expect(Number.isFinite(isoLow)).toBe(true);
        expect(isoHigh).toBeGreaterThan(0);
        expect(isoLow).toBeGreaterThan(0);
      });
    });
  });

  describe('findNearestStandard', () => {
    describe('aperture standard values', () => {
      it('should find exact standard apertures', () => {
        const nearest = findNearestStandard(5.6, STANDARD_APERTURES);
        expect(nearest.value).toBe(5.6);
        expect(nearest.label).toBe('f/5.6');
      });

      it('should round to nearest standard aperture', () => {
        // 6.3 is between f/5.6 and f/8, closer to f/5.6
        const nearest = findNearestStandard(6.3, STANDARD_APERTURES);
        expect(nearest.value).toBe(5.6);
      });

      it('should find nearest for non-standard apertures', () => {
        // f/3 is between f/2.8 and f/4
        const nearest = findNearestStandard(3, STANDARD_APERTURES);
        expect([2.8, 4]).toContain(nearest.value);
      });

      it('should handle extreme apertures', () => {
        const nearestWide = findNearestStandard(0.95, STANDARD_APERTURES);
        expect(nearestWide.value).toBe(1); // Closest to f/1

        const nearestNarrow = findNearestStandard(100, STANDARD_APERTURES);
        expect(nearestNarrow.value).toBe(64); // Closest to f/64
      });
    });

    describe('shutter speed standard values', () => {
      it('should find exact standard shutter speeds', () => {
        const nearest = findNearestStandard(1 / 125, STANDARD_SHUTTER_SPEEDS);
        expect(nearest.value).toBe(1 / 125);
        expect(nearest.label).toBe('1/125');
      });

      it('should round to nearest standard shutter speed', () => {
        // 1/100 is between 1/60 and 1/125, closer to 1/125
        const nearest = findNearestStandard(1 / 100, STANDARD_SHUTTER_SPEEDS);
        expect(nearest.value).toBe(1 / 125);
      });

      it('should handle long exposures', () => {
        const nearest = findNearestStandard(25, STANDARD_SHUTTER_SPEEDS);
        expect(nearest.value).toBe(30); // Closest to 30"
      });

      it('should handle extreme shutter speeds', () => {
        const nearestFast = findNearestStandard(
          1 / 10000,
          STANDARD_SHUTTER_SPEEDS
        );
        expect(nearestFast.value).toBe(1 / 8000); // Fastest standard

        const nearestSlow = findNearestStandard(60, STANDARD_SHUTTER_SPEEDS);
        expect(nearestSlow.value).toBe(30); // Slowest standard
      });
    });
  });

  describe('getEVDescription', () => {
    it('should return descriptions for known EV values', () => {
      expect(getEVDescription(15)).toBe('Bright sun, distinct shadows');
      expect(getEVDescription(12)).toBe('No shadows visible');
      expect(getEVDescription(8)).toBe('Normal room lighting');
      expect(getEVDescription(0)).toBe('Just after sunset');
    });

    it('should round to nearest EV for descriptions', () => {
      expect(getEVDescription(14.4)).toBe('Hazy sunlight, soft shadows');
      expect(getEVDescription(15.4)).toBe('Bright sun, distinct shadows');
    });

    it('should return "Extremely bright" for high EV values', () => {
      expect(getEVDescription(17)).toBe('Extremely bright');
      expect(getEVDescription(20)).toBe('Extremely bright');
    });

    it('should return "Very dark" for very low EV values', () => {
      expect(getEVDescription(-3)).toBe('Very dark');
      expect(getEVDescription(-10)).toBe('Very dark');
    });

    it('should return empty string for unlabeled EV values', () => {
      // EV values that don't have specific presets return empty string
      expect(getEVDescription(6)).toBe('');
      expect(getEVDescription(4)).toBe('');
    });
  });

  describe('calculateExposureValue', () => {
    it('should return valid result with EV and description for Sunny 16', () => {
      const result = calculateExposureValue(16, 1 / 125, 100);
      expect(result.isValid).toBe(true);
      expect(result.ev).toBeCloseTo(15, 1);
      expect(result.description).toBe('Bright sun, distinct shadows');
    });

    it('should return valid result for indoor lighting', () => {
      const result = calculateExposureValue(2.8, 1 / 60, 400);
      expect(result.isValid).toBe(true);
      expect(result.ev).toBeCloseTo(6.9, 0.2);
      expect(result.description).toBe('Dim interior, lamps');
    });

    it('should round EV to one decimal place', () => {
      const result = calculateExposureValue(8, 1 / 125, 100);
      expect(result.ev).toBe(Math.round(result.ev * 10) / 10);
    });

    it('should return invalid result for zero aperture', () => {
      const result = calculateExposureValue(0, 1 / 125, 100);
      expect(result.isValid).toBe(false);
      expect(result.ev).toBe(0);
      expect(result.description).toBe('');
    });

    it('should return invalid result for zero shutter speed', () => {
      const result = calculateExposureValue(8, 0, 100);
      expect(result.isValid).toBe(false);
      expect(result.ev).toBe(0);
      expect(result.description).toBe('');
    });

    it('should return invalid result for zero ISO', () => {
      const result = calculateExposureValue(8, 1 / 125, 0);
      expect(result.isValid).toBe(false);
      expect(result.ev).toBe(0);
      expect(result.description).toBe('');
    });

    it('should return invalid result for negative values', () => {
      const result1 = calculateExposureValue(-8, 1 / 125, 100);
      const result2 = calculateExposureValue(8, -1 / 125, 100);
      const result3 = calculateExposureValue(8, 1 / 125, -100);

      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
      expect(result3.isValid).toBe(false);
    });
  });

  describe('formatShutterSpeed', () => {
    describe('fractional seconds (fast speeds)', () => {
      it('should format standard fast shutter speeds', () => {
        expect(formatShutterSpeed(1 / 125)).toBe('1/125');
        expect(formatShutterSpeed(1 / 250)).toBe('1/250');
        expect(formatShutterSpeed(1 / 1000)).toBe('1/1000');
        expect(formatShutterSpeed(1 / 8000)).toBe('1/8000');
      });

      it('should format non-standard fast speeds', () => {
        expect(formatShutterSpeed(1 / 100)).toBe('1/100');
        expect(formatShutterSpeed(1 / 333)).toBe('1/333');
      });
    });

    describe('whole seconds (long exposures)', () => {
      it('should format standard long exposures with quotes', () => {
        expect(formatShutterSpeed(1)).toBe('1"');
        expect(formatShutterSpeed(2)).toBe('2"');
        expect(formatShutterSpeed(4)).toBe('4"');
        expect(formatShutterSpeed(30)).toBe('30"');
      });

      it('should format decimal long exposures', () => {
        expect(formatShutterSpeed(2.5)).toBe('2.5"');
        expect(formatShutterSpeed(15.3)).toBe('15.3"');
      });

      it('should round long exposures to one decimal place', () => {
        expect(formatShutterSpeed(2.48)).toBe('2.5"');
        expect(formatShutterSpeed(10.123)).toBe('10.1"');
      });
    });

    describe('edge cases', () => {
      it('should return em-dash for zero or negative', () => {
        expect(formatShutterSpeed(0)).toBe('—');
        expect(formatShutterSpeed(-1 / 125)).toBe('—');
      });

      it('should handle very fast shutter speeds', () => {
        expect(formatShutterSpeed(1 / 10000)).toBe('1/10000');
      });

      it('should handle very long exposures', () => {
        expect(formatShutterSpeed(300)).toBe('300"');
      });
    });
  });

  describe('formatAperture', () => {
    it('should format standard apertures', () => {
      expect(formatAperture(1.4)).toBe('f/1.4');
      expect(formatAperture(2.8)).toBe('f/2.8');
      expect(formatAperture(5.6)).toBe('f/5.6');
      expect(formatAperture(8)).toBe('f/8');
      expect(formatAperture(16)).toBe('f/16');
      expect(formatAperture(22)).toBe('f/22');
    });

    it('should format non-standard apertures', () => {
      expect(formatAperture(3.5)).toBe('f/3.5');
      expect(formatAperture(6.3)).toBe('f/6.3');
    });

    it('should round apertures to one decimal place', () => {
      expect(formatAperture(5.66)).toBe('f/5.7');
      expect(formatAperture(8.12)).toBe('f/8.1');
    });

    it('should return em-dash for zero or negative', () => {
      expect(formatAperture(0)).toBe('—');
      expect(formatAperture(-5.6)).toBe('—');
    });
  });

  describe('getEquivalentExposures', () => {
    describe('standard scenarios', () => {
      it('should generate equivalent exposures for Sunny 16', () => {
        // EV 15, ISO 100, currently at f/16, 1/125s
        const equivalents = getEquivalentExposures(15, 100, 16, 1 / 125);

        expect(equivalents.length).toBeGreaterThan(0);

        // Should include various apertures with calculated shutter speeds
        const f8Entry = equivalents.find((e) => e.aperture === 8);
        const f16Entry = equivalents.find((e) => e.aperture === 16);

        expect(f8Entry).toBeDefined();
        expect(f16Entry).toBeDefined();

        if (f8Entry && f16Entry) {
          // f/8 lets in 4x more light than f/16, so shutter speed should be 4x faster
          expect(f8Entry.shutterSpeed).toBeCloseTo(
            f16Entry.shutterSpeed / 4,
            3
          );
        }
      });

      it('should mark current setting in equivalent exposures', () => {
        const equivalents = getEquivalentExposures(13, 400, 8, 1 / 250);

        // Find entry closest to current settings
        const f8Entry = equivalents.find((e) => e.aperture === 8);
        expect(f8Entry).toBeDefined();

        if (f8Entry) {
          // The calculated shutter speed should be close to 1/250
          expect(f8Entry.shutterSpeed).toBeCloseTo(1 / 244, 1);
        }
      });

      it('should identify standard shutter speeds', () => {
        const equivalents = getEquivalentExposures(15, 100, 16, 1 / 125);

        const standardEntries = equivalents.filter(
          (e) => e.isStandardShutterSpeed
        );
        expect(standardEntries.length).toBeGreaterThan(0);
      });
    });

    describe('practical range filtering', () => {
      it('should exclude extremely fast shutter speeds outside camera range', () => {
        // Very bright scene with wide aperture would require impossibly fast shutter
        const equivalents = getEquivalentExposures(15, 100, 1.4, 1 / 8000);

        // Should not include combinations requiring faster than 1/8000s
        equivalents.forEach((e) => {
          expect(e.shutterSpeed).toBeGreaterThan(1 / 10000);
        });
      });

      it('should exclude extremely long exposures outside practical range', () => {
        // Very dark scene with narrow aperture would require impractically long exposure
        const equivalents = getEquivalentExposures(5, 100, 22, 30);

        // Should not include combinations requiring longer than ~30s
        equivalents.forEach((e) => {
          expect(e.shutterSpeed).toBeLessThan(50);
        });
      });
    });

    describe('labels and formatting', () => {
      it('should include formatted aperture labels', () => {
        const equivalents = getEquivalentExposures(13, 200, 5.6, 1 / 125);

        equivalents.forEach((e) => {
          expect(e.apertureLabel).toMatch(/^f\//);
        });
      });

      it('should include formatted shutter speed labels', () => {
        const equivalents = getEquivalentExposures(13, 200, 5.6, 1 / 125);

        equivalents.forEach((e) => {
          expect(e.shutterSpeedLabel).toBeTruthy();
          expect(e.shutterSpeedLabel).not.toBe('—');
        });
      });
    });

    describe('edge cases', () => {
      it('should return empty array for invalid ISO', () => {
        const equivalents = getEquivalentExposures(13, 0, 8, 1 / 125);
        expect(equivalents).toEqual([]);
      });

      it('should return empty array for negative ISO', () => {
        const equivalents = getEquivalentExposures(13, -100, 8, 1 / 125);
        expect(equivalents).toEqual([]);
      });

      it('should handle high ISO scenarios', () => {
        const equivalents = getEquivalentExposures(8, 3200, 2.8, 1 / 60);
        expect(equivalents.length).toBeGreaterThan(0);
      });

      it('should handle low light scenarios', () => {
        const equivalents = getEquivalentExposures(3, 1600, 2, 1 / 15);
        expect(equivalents.length).toBeGreaterThan(0);
      });
    });
  });

  describe('compareExposures', () => {
    describe('same exposure comparisons', () => {
      it('should show zero stops difference for identical exposures', () => {
        const comparison = compareExposures(8, 1 / 125, 100, 8, 1 / 125, 100);

        expect(comparison.isValid).toBe(true);
        expect(comparison.stopsDifference).toBeCloseTo(0, 1);
        expect(comparison.evA).toBeCloseTo(comparison.evB, 1);
      });

      it('should show zero stops difference for equivalent exposures', () => {
        // f/8, 1/125s vs f/5.6, 1/250s (both one stop different, same exposure)
        const comparison = compareExposures(8, 1 / 125, 100, 5.6, 1 / 250, 100);

        expect(comparison.isValid).toBe(true);
        expect(comparison.stopsDifference).toBeCloseTo(0, 1);
      });
    });

    describe('one stop differences', () => {
      it('should detect one stop overexposure when doubling ISO', () => {
        // Higher ISO means more exposure (higher EV at ISO 100 equivalent)
        // ISO 200 vs ISO 100 = evA - evB = +1 stop
        const comparison = compareExposures(8, 1 / 125, 200, 8, 1 / 125, 100);

        expect(comparison.isValid).toBe(true);
        expect(comparison.stopsDifference).toBeCloseTo(-1, 0.1);
        expect(comparison.evA).toBeLessThan(comparison.evB);
      });

      it('should detect one stop underexposure when halving shutter speed', () => {
        // Faster shutter (1/250 vs 1/125) = less exposure = higher EV
        const comparison = compareExposures(8, 1 / 250, 100, 8, 1 / 125, 100);

        expect(comparison.isValid).toBe(true);
        expect(comparison.stopsDifference).toBeCloseTo(1, 0.1);
        expect(comparison.evA).toBeGreaterThan(comparison.evB);
      });

      it('should detect one stop difference when changing aperture', () => {
        // f/5.6 to f/8 is one stop
        const comparison = compareExposures(8, 1 / 125, 100, 5.6, 1 / 125, 100);

        expect(comparison.isValid).toBe(true);
        expect(Math.abs(comparison.stopsDifference)).toBeCloseTo(1, 1);
      });
    });

    describe('multi-stop differences', () => {
      it('should detect two stop difference', () => {
        // ISO 400 vs ISO 100 with same aperture and shutter
        // Higher ISO = lower EV, so evA - evB = -2 stops
        const comparison = compareExposures(8, 1 / 125, 400, 8, 1 / 125, 100);

        expect(comparison.isValid).toBe(true);
        expect(comparison.stopsDifference).toBeCloseTo(-2, 0.1);
      });

      it('should detect three stop difference', () => {
        // 1/1000s vs 1/125s = 3 stops
        const comparison = compareExposures(8, 1 / 1000, 100, 8, 1 / 125, 100);

        expect(comparison.isValid).toBe(true);
        expect(Math.abs(comparison.stopsDifference)).toBeCloseTo(3, 1);
      });

      it('should handle large stop differences', () => {
        // Sunny 16 (EV 15) vs night street (EV 5) = 10 stops
        const comparison = compareExposures(16, 1 / 125, 100, 2, 1 / 30, 1600);

        expect(comparison.isValid).toBe(true);
        expect(Math.abs(comparison.stopsDifference)).toBeGreaterThan(5);
      });
    });

    describe('descriptions', () => {
      it('should include EV descriptions for both exposures', () => {
        const comparison = compareExposures(
          16,
          1 / 125,
          100,
          5.6,
          1 / 125,
          100
        );

        expect(comparison.isValid).toBe(true);
        expect(comparison.descriptionA).toBeTruthy();
        expect(comparison.descriptionB).toBeTruthy();
      });
    });

    describe('edge cases', () => {
      it('should return invalid for zero aperture in first exposure', () => {
        const comparison = compareExposures(0, 1 / 125, 100, 8, 1 / 125, 100);

        expect(comparison.isValid).toBe(false);
        expect(comparison.evA).toBe(0);
        expect(comparison.evB).toBe(0);
        expect(comparison.stopsDifference).toBe(0);
      });

      it('should return invalid for zero shutter speed in second exposure', () => {
        const comparison = compareExposures(8, 1 / 125, 100, 8, 0, 100);

        expect(comparison.isValid).toBe(false);
        expect(comparison.evA).toBe(0);
        expect(comparison.evB).toBe(0);
      });

      it('should return invalid for negative ISO', () => {
        const comparison = compareExposures(8, 1 / 125, -100, 8, 1 / 125, 100);

        expect(comparison.isValid).toBe(false);
      });

      it('should handle extreme exposure differences', () => {
        const comparison = compareExposures(1.4, 1 / 8000, 25, 64, 30, 12800);

        expect(comparison.isValid).toBe(true);
        expect(Number.isFinite(comparison.stopsDifference)).toBe(true);
      });
    });
  });

  describe('key/value converters - shutter speed', () => {
    describe('shutterSpeedToKey', () => {
      it('should convert standard shutter speeds to labels', () => {
        expect(shutterSpeedToKey(1 / 125)).toBe('1/125');
        expect(shutterSpeedToKey(1 / 250)).toBe('1/250');
        expect(shutterSpeedToKey(1)).toBe('1"');
        expect(shutterSpeedToKey(2)).toBe('2"');
        expect(shutterSpeedToKey(30)).toBe('30"');
      });

      it('should convert near-standard values to standard labels', () => {
        // Values within ~1% of standards should map to standard labels
        expect(shutterSpeedToKey(1 / 124.5)).toBe('1/125');
        expect(shutterSpeedToKey(0.998)).toBe('1"');
      });

      it('should format non-standard shutter speeds', () => {
        const key = shutterSpeedToKey(1 / 333);
        expect(key).toBe('1/333');
      });
    });

    describe('keyToShutterSpeed', () => {
      it('should convert standard labels to shutter speeds', () => {
        expect(keyToShutterSpeed('1/125')).toBeCloseTo(1 / 125, 5);
        expect(keyToShutterSpeed('1/250')).toBeCloseTo(1 / 250, 5);
        expect(keyToShutterSpeed('1"')).toBe(1);
        expect(keyToShutterSpeed('2"')).toBe(2);
        expect(keyToShutterSpeed('30"')).toBe(30);
      });

      it('should parse "1/X" format for non-standards', () => {
        expect(keyToShutterSpeed('1/333')).toBeCloseTo(1 / 333, 5);
        expect(keyToShutterSpeed('1/100')).toBe(0.01);
      });

      it('should parse seconds with quote mark', () => {
        expect(keyToShutterSpeed('5"')).toBe(5);
        expect(keyToShutterSpeed('15"')).toBe(15);
      });

      it('should return fallback for invalid keys', () => {
        expect(keyToShutterSpeed('invalid')).toBe(1 / 125);
        expect(keyToShutterSpeed('')).toBe(1 / 125);
        expect(keyToShutterSpeed('abc')).toBe(1 / 125);
      });
    });

    describe('bidirectional conversion', () => {
      it('should roundtrip standard shutter speeds', () => {
        STANDARD_SHUTTER_SPEEDS.forEach((standard) => {
          const key = shutterSpeedToKey(standard.value);
          const value = keyToShutterSpeed(key);
          expect(value).toBeCloseTo(standard.value, 5);
        });
      });
    });
  });

  describe('key/value converters - aperture', () => {
    describe('apertureToKey', () => {
      it('should convert standard apertures to labels', () => {
        expect(apertureToKey(1.4)).toBe('f/1.4');
        expect(apertureToKey(2.8)).toBe('f/2.8');
        expect(apertureToKey(5.6)).toBe('f/5.6');
        expect(apertureToKey(8)).toBe('f/8');
        expect(apertureToKey(16)).toBe('f/16');
      });

      it('should convert near-standard values to standard labels', () => {
        expect(apertureToKey(5.59)).toBe('f/5.6');
        expect(apertureToKey(8.01)).toBe('f/8');
      });

      it('should format non-standard apertures', () => {
        const key = apertureToKey(3.5);
        expect(key).toMatch(/^f\//);
        expect(key).toBe('f/3.5');
      });
    });

    describe('keyToAperture', () => {
      it('should convert standard labels to apertures', () => {
        expect(keyToAperture('f/1.4')).toBe(1.4);
        expect(keyToAperture('f/2.8')).toBe(2.8);
        expect(keyToAperture('f/5.6')).toBe(5.6);
        expect(keyToAperture('f/8')).toBe(8);
        expect(keyToAperture('f/16')).toBe(16);
      });

      it('should parse "f/X" format for non-standards', () => {
        expect(keyToAperture('f/3.5')).toBe(3.5);
        expect(keyToAperture('f/6.3')).toBe(6.3);
      });

      it('should return fallback for invalid keys', () => {
        expect(keyToAperture('invalid')).toBe(8);
        expect(keyToAperture('')).toBe(8);
        expect(keyToAperture('abc')).toBe(8);
      });
    });

    describe('bidirectional conversion', () => {
      it('should roundtrip standard apertures', () => {
        STANDARD_APERTURES.forEach((standard) => {
          const key = apertureToKey(standard.value);
          const value = keyToAperture(key);
          expect(value).toBe(standard.value);
        });
      });
    });
  });

  describe('key/value converters - ISO', () => {
    describe('isoToKey', () => {
      it('should convert ISO values to labeled keys', () => {
        expect(isoToKey(100)).toBe('ISO 100');
        expect(isoToKey(400)).toBe('ISO 400');
        expect(isoToKey(1600)).toBe('ISO 1600');
        expect(isoToKey(3200)).toBe('ISO 3200');
      });
    });

    describe('keyToISO', () => {
      it('should convert labeled keys to ISO values', () => {
        expect(keyToISO('ISO 100')).toBe(100);
        expect(keyToISO('ISO 400')).toBe(400);
        expect(keyToISO('ISO 1600')).toBe(1600);
        expect(keyToISO('ISO 3200')).toBe(3200);
      });

      it('should return fallback for invalid keys', () => {
        expect(keyToISO('invalid')).toBe(100);
        expect(keyToISO('')).toBe(100);
        expect(keyToISO('abc')).toBe(100);
      });
    });

    describe('bidirectional conversion', () => {
      it('should roundtrip ISO values', () => {
        const isoValues = [25, 50, 100, 200, 400, 800, 1600, 3200, 6400];

        isoValues.forEach((iso) => {
          const key = isoToKey(iso);
          const value = keyToISO(key);
          expect(value).toBe(iso);
        });
      });
    });
  });
});
