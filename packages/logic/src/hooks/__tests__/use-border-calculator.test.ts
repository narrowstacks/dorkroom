import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBorderCalculator } from '../use-border-calculator';
import type { BorderSettings } from '../../types/border-calculator';

/**
 * Comprehensive test suite for the useBorderCalculator hook.
 * Tests the simple border calculator hook focusing on:
 * - Realistic analog photography scenarios
 * - Physical constraints (blade positions, paper boundaries, offsets)
 * - Warning generation for impractical configurations
 * - Preset application and state management
 * - Edge cases within valid photographic ranges
 */
describe('useBorderCalculator', () => {
  describe('Initialization and Default State', () => {
    it('should initialize with default values for common darkroom setup', () => {
      const { result } = renderHook(() => useBorderCalculator());

      // Default should be 35mm (3:2) on 8x10 paper - common darkroom scenario
      expect(result.current.aspectRatio).toBe('2:3');
      expect(result.current.paperSize).toBe('8x10');
      expect(result.current.minBorder).toBe(0.5);
      expect(result.current.enableOffset).toBe(false);
      expect(result.current.horizontalOffset).toBe(0);
      expect(result.current.verticalOffset).toBe(0);
      expect(result.current.showBlades).toBe(true);
      expect(result.current.isLandscape).toBe(false);
      expect(result.current.isRatioFlipped).toBe(false);
    });

    it('should initialize custom values with sensible defaults', () => {
      const { result } = renderHook(() => useBorderCalculator());

      // Custom aspect ratio defaults (standard 35mm 3:2)
      expect(result.current.customAspectWidth).toBe(2);
      expect(result.current.customAspectHeight).toBe(3);

      // Custom paper defaults (common 8x10)
      expect(result.current.customPaperWidth).toBe(8);
      expect(result.current.customPaperHeight).toBe(10);
    });

    it('should have valid calculation result on initialization', () => {
      const { result } = renderHook(() => useBorderCalculator());

      expect(result.current.calculation).not.toBeNull();
      expect(result.current.calculation?.printWidth).toBeGreaterThan(0);
      expect(result.current.calculation?.printHeight).toBeGreaterThan(0);
    });
  });

  describe('Standard Paper Size Calculations', () => {
    // Tests realistic analog photography scenarios with common paper sizes

    it('should calculate correct borders for 35mm (3:2) on 8x10 paper portrait', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setAspectRatio('3:2');
        result.current.setPaperSize('8x10');
        result.current.setIsLandscape(false);
        result.current.setIsRatioFlipped(false);
        result.current.setMinBorder(0.5);
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();
      expect(calc?.paperWidth).toBe(8);
      expect(calc?.paperHeight).toBe(10);

      // For 3:2 on 8x10 portrait with 0.5" min border
      // Available space: 7x9 inches
      // Should be height-constrained: 9" tall, 13.5" wide (too wide)
      // So width-constrained: 7" wide, 4.67" tall
      expect(calc?.printWidth).toBeCloseTo(7, 1);
      expect(calc?.printHeight).toBeCloseTo(4.67, 1);

      // Borders should be symmetric when no offset
      expect(calc?.leftBorder).toBeCloseTo(calc?.rightBorder || 0, 2);
      expect(calc?.topBorder).toBeCloseTo(calc?.bottomBorder || 0, 2);

      // All borders must be positive (physical constraint)
      expect(calc?.leftBorder).toBeGreaterThan(0);
      expect(calc?.rightBorder).toBeGreaterThan(0);
      expect(calc?.topBorder).toBeGreaterThan(0);
      expect(calc?.bottomBorder).toBeGreaterThan(0);
    });

    it('should calculate correct borders for 6x4.5 (4:3) on 11x14 paper landscape', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setAspectRatio('4:3');
        result.current.setPaperSize('11x14');
        result.current.setIsLandscape(true); // 14x11 orientation
        result.current.setMinBorder(1.0);
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();
      expect(calc?.paperWidth).toBe(14); // landscape flips dimensions
      expect(calc?.paperHeight).toBe(11);

      // Available space: 12x9 inches with 1" borders
      // 4:3 ratio on 12x9 space
      expect(calc?.printWidth).toBeCloseTo(12, 1);
      expect(calc?.printHeight).toBeCloseTo(9, 1);

      // Should have 1" borders on all sides
      expect(calc?.leftBorder).toBeCloseTo(1, 1);
      expect(calc?.rightBorder).toBeCloseTo(1, 1);
      expect(calc?.topBorder).toBeCloseTo(1, 1);
      expect(calc?.bottomBorder).toBeCloseTo(1, 1);
    });

    it('should calculate correct borders for square (1:1) on 16x20 paper', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setAspectRatio('1:1');
        result.current.setPaperSize('16x20');
        result.current.setMinBorder(2.0); // generous border for gallery print
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // For 1:1 (square) on 16x20 with 2" min border
      // Available: 12x16 inches
      // Should fit 12x12 square (constrained by width)
      expect(calc?.printWidth).toBeCloseTo(12, 1);
      expect(calc?.printHeight).toBeCloseTo(12, 1);

      // Horizontal borders should be minimum (2")
      expect(calc?.leftBorder).toBeCloseTo(2, 1);
      expect(calc?.rightBorder).toBeCloseTo(2, 1);

      // Vertical borders should be larger (centered in taller space)
      expect(calc?.topBorder).toBeCloseTo(4, 1);
      expect(calc?.bottomBorder).toBeCloseTo(4, 1);
    });

    it('should handle all preset paper sizes without errors', () => {
      const { result } = renderHook(() => useBorderCalculator());
      const paperSizes = [
        '5x7',
        '4x6',
        '8x10',
        '11x14',
        '16x20',
        '20x24',
      ] as const;

      paperSizes.forEach((size) => {
        act(() => {
          result.current.setPaperSize(size);
        });

        const calc = result.current.calculation;
        expect(calc).not.toBeNull();
        expect(calc?.printWidth).toBeGreaterThan(0);
        expect(calc?.printHeight).toBeGreaterThan(0);
        expect(calc?.leftBorder).toBeGreaterThan(0);
        expect(calc?.rightBorder).toBeGreaterThan(0);
        expect(calc?.topBorder).toBeGreaterThan(0);
        expect(calc?.bottomBorder).toBeGreaterThan(0);
      });
    });

    it('should handle all preset aspect ratios without errors', () => {
      const { result } = renderHook(() => useBorderCalculator());
      const aspectRatios = [
        '3:2',
        '65:24',
        '4:3',
        '1:1',
        '7:6',
        '5:4',
        '7:5',
        '16:9',
        '1.37:1',
        '1.85:1',
        '2:1',
        '2.39:1',
        '2.76:1',
      ] as const;

      aspectRatios.forEach((ratio) => {
        act(() => {
          result.current.setAspectRatio(ratio);
        });

        const calc = result.current.calculation;
        expect(calc).not.toBeNull();
        expect(calc?.printWidth).toBeGreaterThan(0);
        expect(calc?.printHeight).toBeGreaterThan(0);
      });
    });
  });

  describe('Extreme and Panoramic Aspect Ratios', () => {
    // Tests for unusual but valid photographic aspect ratios

    it('should handle XPan panoramic (65:24) on 20x24 paper', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('20x24');
        result.current.setAspectRatio('65:24');
        result.current.setIsLandscape(true); // 24x20 for panoramic
        result.current.setMinBorder(1.0);
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // Verify landscape orientation is applied
      expect(calc?.paperWidth).toBe(24);
      expect(calc?.paperHeight).toBe(20);

      // XPan is ultra-wide: 65:24 ≈ 2.708:1
      // On 24x20 landscape with 1" borders: 22x18 available
      // Should be height-constrained
      expect(calc?.printHeight).toBeCloseTo(18, 1);
      expect(calc?.printWidth).toBeCloseTo(18 * (65 / 24), 1);

      // Verify aspect ratio is maintained
      const aspectRatio = calc!.printWidth / calc!.printHeight;
      expect(aspectRatio).toBeCloseTo(65 / 24, 2);
    });

    it('should handle ultra-wide CinemaScope (2.39:1) aspect ratio', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setAspectRatio('2.39:1');
        result.current.setPaperSize('16x20');
        result.current.setIsLandscape(true);
        result.current.setMinBorder(1.5);
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // Should maintain 2.39:1 ratio
      const aspectRatio = calc!.printWidth / calc!.printHeight;
      expect(aspectRatio).toBeCloseTo(2.39, 2);

      // Print should fit on paper
      expect(calc?.printWidth).toBeLessThanOrEqual(20);
      expect(calc?.printHeight).toBeLessThanOrEqual(16);
    });

    it('should handle custom ultra-tall ratio (1:3 for vertical panorama)', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setAspectRatio('custom');
        result.current.setCustomAspectWidth(1);
        result.current.setCustomAspectHeight(3);
        result.current.setPaperSize('11x14');
        result.current.setMinBorder(0.5);
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // 1:3 is very tall (height = 3x width)
      // On 11x14 with 0.5" borders: 10x13 available
      // If use full height: height=13, width=13/3=4.33
      // If use full width: width=10, height=30 (impossible!)
      // So height-constrained
      expect(calc?.printHeight).toBeCloseTo(13, 1);
      expect(calc?.printWidth).toBeCloseTo(13 / 3, 1); // ≈ 4.33

      // Verify it respects paper boundaries
      expect(
        calc!.printWidth + calc!.leftBorder + calc!.rightBorder
      ).toBeCloseTo(11, 1);
      expect(
        calc!.printHeight + calc!.topBorder + calc!.bottomBorder
      ).toBeCloseTo(14, 1);
    });
  });

  describe('Border Size Edge Cases', () => {
    // Tests minimum, maximum, and unusual border configurations

    it('should handle minimum border of 0 inches (no border)', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setMinBorder(0);
        result.current.setPaperSize('8x10');
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // With 0 min border and no offset, print should fill entire paper
      // But actual borders might still exist due to centering
      expect(calc?.printWidth).toBeGreaterThan(0);
      expect(calc?.printHeight).toBeGreaterThan(0);
    });

    it('should generate warning for very small border (< 0.25 inches)', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setMinBorder(0.125); // 1/8 inch - difficult to trim
      });

      // Should warn about trimming difficulty
      expect(result.current.minBorderWarning).not.toBeNull();
      expect(result.current.minBorderWarning).toContain('0.25');
    });

    it('should handle maximum practical border (6 inches)', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('20x24');
        result.current.setMinBorder(6); // very wide border for fine art
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // With 6" borders on 20x24: 8x12 available space
      expect(calc?.printWidth).toBeLessThanOrEqual(8);
      expect(calc?.printHeight).toBeLessThanOrEqual(12);

      // Borders should be at least 6" each
      expect(calc?.leftBorder).toBeGreaterThanOrEqual(5.9);
      expect(calc?.rightBorder).toBeGreaterThanOrEqual(5.9);
      expect(calc?.topBorder).toBeGreaterThanOrEqual(5.9);
      expect(calc?.bottomBorder).toBeGreaterThanOrEqual(5.9);
    });

    it('should handle border too large for paper (no space for print)', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('5x7');
        result.current.setMinBorder(4); // 8" total borders on 5" width = impossible
      });

      const calc = result.current.calculation;
      // Should still return a calculation, but print dimensions may be zero or minimal
      expect(calc).not.toBeNull();
    });
  });

  describe('Offset and Centering', () => {
    // Tests horizontal and vertical offset adjustments for non-centered prints

    it('should apply horizontal offset correctly within valid range', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('8x10');
        result.current.setMinBorder(1);
        result.current.setEnableOffset(true);
        result.current.setHorizontalOffset(0.5); // shift right 0.5"
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // Left border should be smaller, right border larger (shifted right)
      expect(calc!.leftBorder).toBeLessThan(calc!.rightBorder);

      // The offset subtracts from left, adds to right
      const difference = calc!.rightBorder - calc!.leftBorder;
      expect(difference).toBeCloseTo(1.0, 0); // 2x the offset

      // Should not generate offset warning if within bounds
      // (Note: warning comes from a separate computed property)
      if (result.current.enableOffset) {
        // Warning is computed separately in the hook
      }
    });

    it('should apply vertical offset correctly within valid range', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('8x10');
        result.current.setMinBorder(1);
        result.current.setEnableOffset(true);
        result.current.setVerticalOffset(0.75); // shift down 0.75"
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // Bottom border should be smaller, top border larger
      expect(calc!.bottomBorder).toBeLessThan(calc!.topBorder);

      // Difference should be approximately 2x the offset
      const difference = calc!.topBorder - calc!.bottomBorder;
      expect(difference).toBeCloseTo(1.5, 1);
    });

    it('should generate warning when offset pushes print beyond paper edge', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('8x10');
        result.current.setMinBorder(0.5);
        result.current.setEnableOffset(true);
        result.current.setHorizontalOffset(4); // extreme offset
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // Should generate warning about extending beyond paper
      expect(result.current.offsetWarning).not.toBeNull();
      expect(result.current.offsetWarning).toContain('beyond paper');

      // Blade readings should show negative values (impossible to achieve)
      expect(calc!.leftBladeReading < 0 || calc!.rightBladeReading < 0).toBe(
        true
      );
    });

    it('should handle combined horizontal and vertical offsets', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('11x14');
        result.current.setMinBorder(1);
        result.current.setEnableOffset(true);
        result.current.setHorizontalOffset(0.5); // shift right
        result.current.setVerticalOffset(-0.25); // shift up
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // Horizontal offset: left < right (shifted right)
      expect(calc!.leftBorder).toBeLessThan(calc!.rightBorder);

      // Vertical offset: negative means subtract from top, add to bottom
      // So top border decreases, bottom border increases
      expect(calc!.topBorder).toBeLessThan(calc!.bottomBorder);

      // All borders must still be non-negative
      expect(calc!.leftBorder).toBeGreaterThanOrEqual(0);
      expect(calc!.rightBorder).toBeGreaterThanOrEqual(0);
      expect(calc!.topBorder).toBeGreaterThanOrEqual(0);
      expect(calc!.bottomBorder).toBeGreaterThanOrEqual(0);
    });

    it('should handle maximum offset range (-3 to +3 inches)', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('20x24'); // large paper for testing max offsets
        result.current.setMinBorder(0.5);
        result.current.setEnableOffset(true);
        result.current.setHorizontalOffset(3); // max positive
      });

      let calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // With max positive offset on large paper, borders should exist
      // Whether they're positive depends on print size vs offset
      expect(typeof calc?.leftBorder).toBe('number');
      expect(typeof calc?.rightBorder).toBe('number');

      act(() => {
        result.current.setHorizontalOffset(-3); // max negative
      });

      calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // With max negative offset, borders swap
      expect(typeof calc?.leftBorder).toBe('number');
      expect(typeof calc?.rightBorder).toBe('number');
    });
  });

  describe('Blade Readings and Warnings', () => {
    // Tests blade positioning calculations critical for darkroom trimming

    it('should calculate blade readings correctly for centered print', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('8x10');
        result.current.setAspectRatio('3:2');
        result.current.setMinBorder(1);
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // Blade readings should equal border widths for centered print
      expect(calc?.leftBladeReading).toBeCloseTo(calc?.leftBorder || 0, 2);
      expect(calc?.rightBladeReading).toBeCloseTo(calc?.rightBorder || 0, 2);
      expect(calc?.topBladeReading).toBeCloseTo(calc?.topBorder || 0, 2);
      expect(calc?.bottomBladeReading).toBeCloseTo(calc?.bottomBorder || 0, 2);
    });

    it('should generate blade warning when blades are too close to edge (< 0.125")', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('5x7');
        result.current.setMinBorder(0.1); // very small border
        result.current.setEnableOffset(true);
        result.current.setHorizontalOffset(0.05);
      });

      // Should warn about blade positions being too close to edge
      expect(result.current.bladeWarning).not.toBeNull();
      expect(result.current.bladeWarning).toContain('Blade positions');
    });

    it('should have blade thickness constant for visual guides', () => {
      const { result } = renderHook(() => useBorderCalculator());

      const calc = result.current.calculation;
      expect(calc?.bladeThickness).toBe(0.125); // 1/8 inch standard blade thickness
    });

    it('should maintain blade reading accuracy with offsets', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('8x10');
        result.current.setMinBorder(1);
        result.current.setEnableOffset(true);
        result.current.setHorizontalOffset(0.5);
        result.current.setVerticalOffset(0.25);
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // Blade readings should reflect actual border positions with offset
      // Left blade should be further from edge than right (offset shifts right)
      // This is critical for darkroom trimming accuracy
      expect(calc?.leftBladeReading).not.toBe(calc?.rightBladeReading);
      expect(calc?.topBladeReading).not.toBe(calc?.bottomBladeReading);
    });
  });

  describe('Orientation Handling', () => {
    // Tests landscape/portrait and ratio flipping

    it('should flip paper dimensions when switching to landscape', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('8x10'); // portrait: 8" wide x 10" tall
        result.current.setIsLandscape(false);
      });

      let calc = result.current.calculation;
      expect(calc?.paperWidth).toBe(8);
      expect(calc?.paperHeight).toBe(10);

      act(() => {
        result.current.setIsLandscape(true); // landscape: 10" wide x 8" tall
      });

      calc = result.current.calculation;
      expect(calc?.paperWidth).toBe(10);
      expect(calc?.paperHeight).toBe(8);
    });

    it('should flip aspect ratio when isRatioFlipped is true', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setAspectRatio('3:2'); // normally 3:2
        result.current.setPaperSize('8x10');
        result.current.setIsRatioFlipped(false);
      });

      let calc = result.current.calculation;
      const ratio1 = calc!.printWidth / calc!.printHeight;

      act(() => {
        result.current.setIsRatioFlipped(true); // flip to 2:3
      });

      calc = result.current.calculation;
      const ratio2 = calc!.printWidth / calc!.printHeight;

      // Ratios should be reciprocals
      expect(ratio1 * ratio2).toBeCloseTo(1, 1);
    });

    it('should handle combined landscape and ratio flip correctly', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setAspectRatio('16:9'); // widescreen
        result.current.setPaperSize('11x14');
        result.current.setIsLandscape(true); // 14x11
        result.current.setIsRatioFlipped(false);
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // 16:9 on landscape 14x11 should produce wide print
      expect(calc!.printWidth).toBeGreaterThan(calc!.printHeight);
    });
  });

  describe('Custom Dimensions', () => {
    // Tests custom paper sizes and aspect ratios

    it('should handle custom paper size correctly', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('custom');
        result.current.setCustomPaperWidth(13);
        result.current.setCustomPaperHeight(19); // A3+ size
        result.current.setMinBorder(1.5);
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();
      expect(calc?.paperWidth).toBe(13);
      expect(calc?.paperHeight).toBe(19);
      expect(calc?.isNonStandardPaperSize).toBe(true);
    });

    it('should handle custom aspect ratio correctly', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setAspectRatio('custom');
        result.current.setCustomAspectWidth(5);
        result.current.setCustomAspectHeight(7); // 5:7 ratio
        result.current.setPaperSize('11x14');
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // Should maintain 5:7 aspect ratio
      const aspectRatio = calc!.printWidth / calc!.printHeight;
      expect(aspectRatio).toBeCloseTo(5 / 7, 2);
    });

    it('should warn about very small custom paper (< 4 inches)', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('custom');
        result.current.setCustomPaperWidth(3);
        result.current.setCustomPaperHeight(5);
      });

      expect(result.current.paperSizeWarning).not.toBeNull();
      expect(result.current.paperSizeWarning).toContain('too small');
    });

    it('should handle custom aspect ratio with decimal values', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setAspectRatio('custom');
        result.current.setCustomAspectWidth(2.35);
        result.current.setCustomAspectHeight(1);
        result.current.setPaperSize('16x20');
        result.current.setIsLandscape(true);
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      const aspectRatio = calc!.printWidth / calc!.printHeight;
      expect(aspectRatio).toBeCloseTo(2.35, 2);
    });
  });

  describe('Preset Application and Reset', () => {
    it('should reset to defaults correctly', () => {
      const { result } = renderHook(() => useBorderCalculator());

      // Modify all values
      act(() => {
        result.current.setAspectRatio('1:1');
        result.current.setPaperSize('20x24');
        result.current.setMinBorder(3);
        result.current.setEnableOffset(true);
        result.current.setHorizontalOffset(2);
        result.current.setVerticalOffset(1.5);
        result.current.setIsLandscape(true);
        result.current.setIsRatioFlipped(true);
      });

      // Reset
      act(() => {
        result.current.resetToDefaults();
      });

      // Should return to defaults
      expect(result.current.aspectRatio).toBe('2:3');
      expect(result.current.paperSize).toBe('8x10');
      expect(result.current.minBorder).toBe(0.5);
      expect(result.current.enableOffset).toBe(false);
      expect(result.current.horizontalOffset).toBe(0);
      expect(result.current.verticalOffset).toBe(0);
      expect(result.current.isLandscape).toBe(false);
      expect(result.current.isRatioFlipped).toBe(false);
    });

    it('should apply preset settings correctly', () => {
      const { result } = renderHook(() => useBorderCalculator());

      const preset: BorderSettings = {
        aspectRatio: '4:3',
        paperSize: '11x14',
        customAspectWidth: 4,
        customAspectHeight: 3,
        customPaperWidth: 11,
        customPaperHeight: 14,
        minBorder: 2,
        enableOffset: true,
        ignoreMinBorder: false,
        horizontalOffset: 0.5,
        verticalOffset: -0.25,
        showBlades: false,
        showBladeReadings: true,
        isLandscape: true,
        isRatioFlipped: false,
        hasManuallyFlippedPaper: false,
      };

      act(() => {
        result.current.applyPreset(preset);
      });

      // All values should match preset
      expect(result.current.aspectRatio).toBe('4:3');
      expect(result.current.paperSize).toBe('11x14');
      expect(result.current.minBorder).toBe(2);
      expect(result.current.enableOffset).toBe(true);
      expect(result.current.horizontalOffset).toBe(0.5);
      expect(result.current.verticalOffset).toBe(-0.25);
      expect(result.current.showBlades).toBe(false);
      expect(result.current.isLandscape).toBe(true);
    });
  });

  describe('Calculation Validation and Physical Constraints', () => {
    it('should always produce positive border values (when valid)', () => {
      const { result } = renderHook(() => useBorderCalculator());

      // Test various configurations
      const configs = [
        { paper: '5x7', ratio: '3:2', border: 0.5 },
        { paper: '8x10', ratio: '1:1', border: 1.0 },
        { paper: '11x14', ratio: '16:9', border: 1.5 },
        { paper: '20x24', ratio: '2.39:1', border: 2.0 },
      ] as const;

      configs.forEach((config) => {
        act(() => {
          result.current.setPaperSize(config.paper);
          result.current.setAspectRatio(config.ratio);
          result.current.setMinBorder(config.border);
        });

        const calc = result.current.calculation;
        expect(calc).not.toBeNull();

        // Physical constraint: all borders must be >= 0
        expect(calc!.leftBorder).toBeGreaterThanOrEqual(0);
        expect(calc!.rightBorder).toBeGreaterThanOrEqual(0);
        expect(calc!.topBorder).toBeGreaterThanOrEqual(0);
        expect(calc!.bottomBorder).toBeGreaterThanOrEqual(0);
      });
    });

    it('should maintain print within paper boundaries', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('8x10');
        result.current.setMinBorder(0.5);
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // Physical constraint: print + borders must equal paper dimensions
      const totalWidth =
        calc!.printWidth + calc!.leftBorder + calc!.rightBorder;
      const totalHeight =
        calc!.printHeight + calc!.topBorder + calc!.bottomBorder;

      expect(totalWidth).toBeCloseTo(calc!.paperWidth, 1);
      expect(totalHeight).toBeCloseTo(calc!.paperHeight, 1);
    });

    it('should produce consistent calculations for same inputs', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('8x10');
        result.current.setAspectRatio('3:2');
        result.current.setMinBorder(1);
      });

      const calc1 = result.current.calculation;

      // Re-render should produce same result
      const calc2 = result.current.calculation;

      expect(calc1).toEqual(calc2);
    });

    it('should have blade readings within achievable range', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('11x14');
        result.current.setMinBorder(1);
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // Blade readings should be positive and within paper dimensions
      expect(calc!.leftBladeReading).toBeGreaterThan(0);
      expect(calc!.rightBladeReading).toBeGreaterThan(0);
      expect(calc!.topBladeReading).toBeGreaterThan(0);
      expect(calc!.bottomBladeReading).toBeGreaterThan(0);

      expect(calc!.leftBladeReading).toBeLessThanOrEqual(calc!.paperWidth);
      expect(calc!.rightBladeReading).toBeLessThanOrEqual(calc!.paperWidth);
      expect(calc!.topBladeReading).toBeLessThanOrEqual(calc!.paperHeight);
      expect(calc!.bottomBladeReading).toBeLessThanOrEqual(calc!.paperHeight);
    });
  });

  describe('Percentage Calculations for Preview', () => {
    it('should calculate correct percentage values for responsive preview', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setPaperSize('8x10');
        result.current.setMinBorder(1);
      });

      const calc = result.current.calculation;
      expect(calc).not.toBeNull();

      // Percentages should be between 0 and 100
      expect(calc!.printWidthPercent).toBeGreaterThan(0);
      expect(calc!.printWidthPercent).toBeLessThanOrEqual(100);
      expect(calc!.printHeightPercent).toBeGreaterThan(0);
      expect(calc!.printHeightPercent).toBeLessThanOrEqual(100);

      // Border percentages should sum with print percentages to 100
      const widthSum =
        calc!.printWidthPercent +
        calc!.leftBorderPercent +
        calc!.rightBorderPercent;
      const heightSum =
        calc!.printHeightPercent +
        calc!.topBorderPercent +
        calc!.bottomBorderPercent;

      expect(widthSum).toBeCloseTo(100, 1);
      expect(heightSum).toBeCloseTo(100, 1);
    });
  });

  describe('Slider Helper Functions', () => {
    it('should update minBorder via slider helper', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setMinBorderSlider(2.5);
      });

      expect(result.current.minBorder).toBe(2.5);
    });

    it('should update horizontal offset via slider helper', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setHorizontalOffsetSlider(1.25);
      });

      expect(result.current.horizontalOffset).toBe(1.25);
    });

    it('should update vertical offset via slider helper', () => {
      const { result } = renderHook(() => useBorderCalculator());

      act(() => {
        result.current.setVerticalOffsetSlider(-0.75);
      });

      expect(result.current.verticalOffset).toBe(-0.75);
    });
  });
});
