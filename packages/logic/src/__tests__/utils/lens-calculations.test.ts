import type { SensorFormat } from '../../types/lens-calculator';
import {
  calculateEquivalentFocalLength,
  calculateFieldOfView,
  formatFocalLength,
} from '../../utils/lens-calculations';

// Helper to create test sensor formats with realistic values
const createTestFormat = (
  id: string,
  width: number,
  height: number
): SensorFormat => {
  const diagonal = Math.sqrt(width * width + height * height);
  const fullFrameDiagonal = Math.sqrt(36 * 36 + 24 * 24); // ~43.27mm
  const cropFactor = fullFrameDiagonal / diagonal;

  return {
    id,
    name: `Test ${id}`,
    shortName: id,
    category: 'digital',
    width,
    height,
    diagonal,
    cropFactor,
  };
};

// Commonly used sensor formats for testing (matching production values)
const formats = {
  fullFrame: createTestFormat('full-frame', 36, 24), // crop: 1.0
  halfFrame: createTestFormat('half-frame', 24, 18), // crop: ~1.44
  apscNikon: createTestFormat('aps-c-nikon', 23.5, 15.6), // crop: ~1.53
  apscCanon: createTestFormat('aps-c-canon', 22.3, 14.9), // crop: ~1.61
  mft: createTestFormat('mft', 17.3, 13), // crop: ~2.0
  mediumFormatDigital: createTestFormat('mf-digital', 43.8, 32.9), // crop: ~0.79
  film6x6: createTestFormat('6x6', 56, 56), // crop: ~0.55
  film6x7: createTestFormat('6x7', 70, 56), // crop: ~0.48
  film4x5: createTestFormat('4x5', 127, 101.6), // crop: ~0.27
  film8x10: createTestFormat('8x10', 254, 203.2), // crop: ~0.13
};

describe('lens calculations', () => {
  describe('calculateEquivalentFocalLength', () => {
    describe('same format conversions', () => {
      it('should return identical focal length when source and target are the same', () => {
        expect(
          calculateEquivalentFocalLength(
            50,
            formats.fullFrame,
            formats.fullFrame
          )
        ).toBe(50);
        expect(
          calculateEquivalentFocalLength(
            35,
            formats.apscNikon,
            formats.apscNikon
          )
        ).toBe(35);
        expect(
          calculateEquivalentFocalLength(80, formats.film6x7, formats.film6x7)
        ).toBe(80);
      });
    });

    describe('APS-C to full frame conversions', () => {
      it('should convert APS-C Nikon 50mm to equivalent full frame focal length', () => {
        // 50mm on APS-C (crop ~1.53) → ~76.7mm on full frame
        const result = calculateEquivalentFocalLength(
          50,
          formats.apscNikon,
          formats.fullFrame
        );
        expect(result).toBeCloseTo(76.7, 0);
      });

      it('should convert APS-C Canon 35mm to equivalent full frame focal length', () => {
        // 35mm on APS-C Canon (crop ~1.61) → ~56.5mm on full frame
        const result = calculateEquivalentFocalLength(
          35,
          formats.apscCanon,
          formats.fullFrame
        );
        expect(result).toBeCloseTo(56.5, 0);
      });

      it('should convert APS-C Nikon 24mm wide angle to full frame equivalent', () => {
        // 24mm on APS-C Nikon → ~36.8mm on full frame
        const result = calculateEquivalentFocalLength(
          24,
          formats.apscNikon,
          formats.fullFrame
        );
        expect(result).toBeCloseTo(36.8, 0);
      });
    });

    describe('full frame to APS-C conversions', () => {
      it('should convert full frame 50mm to equivalent APS-C Nikon focal length', () => {
        // 50mm on full frame → ~32.6mm on APS-C Nikon
        const result = calculateEquivalentFocalLength(
          50,
          formats.fullFrame,
          formats.apscNikon
        );
        expect(result).toBeCloseTo(32.6, 0);
      });

      it('should convert full frame 85mm portrait lens to APS-C equivalent', () => {
        // 85mm on full frame → ~55.4mm on APS-C Nikon
        const result = calculateEquivalentFocalLength(
          85,
          formats.fullFrame,
          formats.apscNikon
        );
        expect(result).toBeCloseTo(55.4, 0);
      });
    });

    describe('Micro Four Thirds conversions', () => {
      it('should convert MFT 25mm to full frame equivalent', () => {
        // 25mm on MFT (crop ~2.0) → ~50mm on full frame
        const result = calculateEquivalentFocalLength(
          25,
          formats.mft,
          formats.fullFrame
        );
        expect(result).toBeCloseTo(50, 1);
      });

      it('should convert full frame 50mm to MFT equivalent', () => {
        // 50mm on full frame → ~25mm on MFT
        const result = calculateEquivalentFocalLength(
          50,
          formats.fullFrame,
          formats.mft
        );
        expect(result).toBeCloseTo(25, 1);
      });
    });

    describe('medium format to full frame conversions', () => {
      it('should convert medium format digital 80mm to full frame equivalent', () => {
        // 80mm on MF digital (crop ~0.79) → ~63.2mm on full frame
        const result = calculateEquivalentFocalLength(
          80,
          formats.mediumFormatDigital,
          formats.fullFrame
        );
        expect(result).toBeCloseTo(63.2, 0);
      });

      it('should convert 6x7 film 90mm to full frame equivalent', () => {
        // 90mm on 6x7 (crop ~0.48) → ~43.4mm on full frame
        const result = calculateEquivalentFocalLength(
          90,
          formats.film6x7,
          formats.fullFrame
        );
        expect(result).toBeCloseTo(43.4, 0);
      });

      it('should convert 6x6 film 80mm to full frame equivalent', () => {
        // 80mm on 6x6 (crop ~0.55) → ~43.7mm on full frame
        const result = calculateEquivalentFocalLength(
          80,
          formats.film6x6,
          formats.fullFrame
        );
        expect(result).toBeCloseTo(43.7, 0);
      });
    });

    describe('large format to full frame conversions', () => {
      it('should convert 4x5 150mm to full frame equivalent', () => {
        // 150mm on 4x5 (crop ~0.27) → ~39.9mm on full frame
        const result = calculateEquivalentFocalLength(
          150,
          formats.film4x5,
          formats.fullFrame
        );
        expect(result).toBeCloseTo(39.9, 0);
      });

      it('should convert 8x10 300mm to full frame equivalent', () => {
        // 300mm on 8x10 (crop ~0.13) → ~39.9mm on full frame
        const result = calculateEquivalentFocalLength(
          300,
          formats.film8x10,
          formats.fullFrame
        );
        expect(result).toBeCloseTo(39.9, 0);
      });
    });

    describe('full frame to large format conversions', () => {
      it('should convert full frame 50mm to 4x5 equivalent', () => {
        // 50mm on full frame → ~188mm on 4x5
        const result = calculateEquivalentFocalLength(
          50,
          formats.fullFrame,
          formats.film4x5
        );
        expect(result).toBeCloseTo(188, 0);
      });

      it('should convert full frame 35mm wide to 8x10 equivalent', () => {
        // 35mm on full frame → ~263mm on 8x10
        const result = calculateEquivalentFocalLength(
          35,
          formats.fullFrame,
          formats.film8x10
        );
        expect(result).toBeCloseTo(263, 0);
      });
    });

    describe('edge cases', () => {
      it('should handle very short focal lengths', () => {
        // 1mm fisheye on full frame → ~0.65mm on APS-C Nikon
        const result = calculateEquivalentFocalLength(
          1,
          formats.fullFrame,
          formats.apscNikon
        );
        expect(result).toBeCloseTo(0.65, 1);
      });

      it('should handle very long focal lengths', () => {
        // 2000mm super telephoto on full frame → ~1304mm on APS-C Nikon
        const result = calculateEquivalentFocalLength(
          2000,
          formats.fullFrame,
          formats.apscNikon
        );
        expect(result).toBeCloseTo(1304, 0);
      });

      it('should handle cross-category conversions', () => {
        // MFT 25mm → 6x7 film equivalent: ~104mm
        const result = calculateEquivalentFocalLength(
          25,
          formats.mft,
          formats.film6x7
        );
        expect(result).toBeCloseTo(104, 0);
      });
    });
  });

  describe('calculateFieldOfView', () => {
    describe('classic focal lengths on full frame', () => {
      it('should calculate FOV for 50mm normal lens on full frame', () => {
        // 50mm on full frame diagonal FOV ≈ 46.8°
        const result = calculateFieldOfView(50, formats.fullFrame);
        expect(result).toBeCloseTo(46.8, 0);
      });

      it('should calculate FOV for 35mm wide angle on full frame', () => {
        // 35mm on full frame diagonal FOV ≈ 63.4°
        const result = calculateFieldOfView(35, formats.fullFrame);
        expect(result).toBeCloseTo(63.4, 0);
      });

      it('should calculate FOV for 24mm wide angle on full frame', () => {
        // 24mm on full frame diagonal FOV ≈ 84.1°
        const result = calculateFieldOfView(24, formats.fullFrame);
        expect(result).toBeCloseTo(84.1, 0);
      });

      it('should calculate FOV for 85mm portrait lens on full frame', () => {
        // 85mm on full frame diagonal FOV ≈ 28.6°
        const result = calculateFieldOfView(85, formats.fullFrame);
        expect(result).toBeCloseTo(28.6, 0);
      });

      it('should calculate FOV for 200mm telephoto on full frame', () => {
        // 200mm on full frame diagonal FOV ≈ 12.3°
        const result = calculateFieldOfView(200, formats.fullFrame);
        expect(result).toBeCloseTo(12.3, 0);
      });
    });

    describe('same focal length on different formats', () => {
      it('should show wider FOV for larger sensor with same focal length', () => {
        // 50mm on different sensors
        const fullFrameFOV = calculateFieldOfView(50, formats.fullFrame);
        const apscFOV = calculateFieldOfView(50, formats.apscNikon);
        const mftFOV = calculateFieldOfView(50, formats.mft);

        // Full frame should have widest FOV, MFT narrowest
        expect(fullFrameFOV).toBeGreaterThan(apscFOV);
        expect(apscFOV).toBeGreaterThan(mftFOV);
        expect(fullFrameFOV).toBeCloseTo(46.8, 0);
        expect(apscFOV).toBeCloseTo(31.6, 0);
        expect(mftFOV).toBeCloseTo(24.4, 0);
      });

      it('should show much wider FOV on large format vs full frame', () => {
        // 150mm on 4x5 vs full frame
        const largeFormatFOV = calculateFieldOfView(150, formats.film4x5);
        const fullFrameFOV = calculateFieldOfView(150, formats.fullFrame);

        expect(largeFormatFOV).toBeGreaterThan(fullFrameFOV);
        expect(largeFormatFOV).toBeCloseTo(56.9, 0);
        expect(fullFrameFOV).toBeCloseTo(16.3, 0);
      });
    });

    describe('medium format', () => {
      it('should calculate FOV for 80mm on 6x6 square format', () => {
        // 80mm on 6x6 diagonal FOV ≈ 52.7°
        const result = calculateFieldOfView(80, formats.film6x6);
        expect(result).toBeCloseTo(52.7, 0);
      });

      it('should calculate FOV for 90mm on 6x7 format', () => {
        // 90mm on 6x7 diagonal FOV ≈ 52.9°
        const result = calculateFieldOfView(90, formats.film6x7);
        expect(result).toBeCloseTo(52.9, 0);
      });

      it('should calculate FOV for 80mm on medium format digital', () => {
        // 80mm on MF digital diagonal FOV ≈ 37.8°
        const result = calculateFieldOfView(80, formats.mediumFormatDigital);
        expect(result).toBeCloseTo(37.8, 0);
      });
    });

    describe('large format', () => {
      it('should calculate FOV for 150mm on 4x5', () => {
        // 150mm on 4x5 diagonal FOV ≈ 56.9°
        const result = calculateFieldOfView(150, formats.film4x5);
        expect(result).toBeCloseTo(56.9, 0);
      });

      it('should calculate FOV for 300mm on 8x10', () => {
        // 300mm on 8x10 diagonal FOV ≈ 56.9°
        const result = calculateFieldOfView(300, formats.film8x10);
        expect(result).toBeCloseTo(56.9, 0);
      });
    });

    describe('extreme focal lengths', () => {
      it('should calculate very wide FOV for short focal lengths', () => {
        // 10mm ultra-wide on full frame diagonal FOV ≈ 130.4°
        const result = calculateFieldOfView(10, formats.fullFrame);
        expect(result).toBeCloseTo(130.4, 0);
        expect(result).toBeLessThan(180); // Should never exceed 180°
      });

      it('should calculate very narrow FOV for long focal lengths', () => {
        // 500mm super telephoto on full frame diagonal FOV ≈ 5.0°
        const result = calculateFieldOfView(500, formats.fullFrame);
        expect(result).toBeCloseTo(5.0, 0);
        expect(result).toBeGreaterThan(0);
      });

      it('should handle fisheye focal lengths approaching 180° FOV', () => {
        // 7mm fisheye on full frame ≈ 144.1°
        const result = calculateFieldOfView(7, formats.fullFrame);
        expect(result).toBeCloseTo(144.1, 0);
        expect(result).toBeLessThan(180);
      });
    });

    describe('verification: wider focal length means wider FOV', () => {
      it('should show decreasing FOV as focal length increases', () => {
        const fov24 = calculateFieldOfView(24, formats.fullFrame);
        const fov35 = calculateFieldOfView(35, formats.fullFrame);
        const fov50 = calculateFieldOfView(50, formats.fullFrame);
        const fov85 = calculateFieldOfView(85, formats.fullFrame);

        expect(fov24).toBeGreaterThan(fov35);
        expect(fov35).toBeGreaterThan(fov50);
        expect(fov50).toBeGreaterThan(fov85);
      });
    });
  });

  describe('formatFocalLength', () => {
    describe('integer focal lengths', () => {
      it('should format exact integers without decimals', () => {
        expect(formatFocalLength(50)).toBe('50mm');
        expect(formatFocalLength(35)).toBe('35mm');
        expect(formatFocalLength(85)).toBe('85mm');
        expect(formatFocalLength(200)).toBe('200mm');
      });
    });

    describe('near-integer values', () => {
      it('should round values very close to integers', () => {
        expect(formatFocalLength(49.97)).toBe('50mm');
        expect(formatFocalLength(50.03)).toBe('50mm');
        expect(formatFocalLength(84.98)).toBe('85mm');
        expect(formatFocalLength(35.02)).toBe('35mm');
      });

      it('should round values within 0.05 of an integer', () => {
        expect(formatFocalLength(49.96)).toBe('50mm'); // 50 - 0.04 < 0.05
        expect(formatFocalLength(50.04)).toBe('50mm'); // 50.04 - 50 < 0.05
        expect(formatFocalLength(74.96)).toBe('75mm');
      });
    });

    describe('non-integer focal lengths', () => {
      it('should format one decimal place for non-integer values', () => {
        expect(formatFocalLength(32.7)).toBe('32.7mm');
        expect(formatFocalLength(76.5)).toBe('76.5mm');
        expect(formatFocalLength(56.4)).toBe('56.4mm');
      });

      it('should handle values that round to .0 decimal', () => {
        expect(formatFocalLength(75.02)).toBe('75mm'); // rounds to 75.0, displays as 75mm
        expect(formatFocalLength(49.98)).toBe('50mm'); // rounds to 50.0, displays as 50mm
      });

      it('should format repeating decimals', () => {
        expect(formatFocalLength(33.33)).toBe('33.3mm');
        expect(formatFocalLength(66.67)).toBe('66.7mm');
        expect(formatFocalLength(16.67)).toBe('16.7mm');
      });
    });

    describe('values with precision rounding', () => {
      it('should apply standard precision rounding before formatting', () => {
        // roundToStandardPrecision rounds to 2 decimal places
        // 32.748 → 32.75 → "32.8mm" (after .toFixed(1))
        expect(formatFocalLength(32.748)).toBe('32.8mm');
        // 76.456 → 76.46 → "76.5mm"
        expect(formatFocalLength(76.456)).toBe('76.5mm');
        // 50.001 → 50.0 → "50mm"
        expect(formatFocalLength(50.001)).toBe('50mm');
      });
    });

    describe('edge cases', () => {
      it('should handle very small focal lengths', () => {
        expect(formatFocalLength(1)).toBe('1mm');
        expect(formatFocalLength(5.6)).toBe('5.6mm');
        expect(formatFocalLength(7.5)).toBe('7.5mm');
      });

      it('should handle very large focal lengths', () => {
        expect(formatFocalLength(2000)).toBe('2000mm');
        expect(formatFocalLength(1307.5)).toBe('1307.5mm');
        expect(formatFocalLength(999)).toBe('999mm');
      });

      it('should handle zero', () => {
        expect(formatFocalLength(0)).toBe('0mm');
      });

      it('should handle values between 0 and 1', () => {
        expect(formatFocalLength(0.5)).toBe('0.5mm');
        expect(formatFocalLength(0.65)).toBe('0.7mm'); // 0.65 → 0.7 after toFixed(1)
      });
    });

    describe('real-world conversion examples', () => {
      it('should format typical APS-C to full frame conversions', () => {
        // 50mm APS-C → 76.7mm full frame
        const focalLength = calculateEquivalentFocalLength(
          50,
          formats.apscNikon,
          formats.fullFrame
        );
        expect(formatFocalLength(focalLength)).toBe('76.7mm');
      });

      it('should format typical MFT to full frame conversions', () => {
        // 25mm MFT → 50mm full frame
        const focalLength = calculateEquivalentFocalLength(
          25,
          formats.mft,
          formats.fullFrame
        );
        expect(formatFocalLength(focalLength)).toBe('50mm');
      });

      it('should format medium format to full frame conversions', () => {
        // 80mm 6x6 → ~43.7mm full frame
        const focalLength = calculateEquivalentFocalLength(
          80,
          formats.film6x6,
          formats.fullFrame
        );
        expect(formatFocalLength(focalLength)).toBe('43.7mm');
      });
    });
  });
});
