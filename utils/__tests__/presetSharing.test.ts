import type { BorderPresetSettings } from '@/types/borderPresetTypes';
import { decodePreset, encodePreset } from '../presetSharing';

describe('presetSharing', () => {
  // Test data with standard aspect ratio and paper size
  const standardPresetSettings: BorderPresetSettings = {
    aspectRatio: '3:2',
    paperSize: '8x10',
    customAspectWidth: 0,
    customAspectHeight: 0,
    customPaperWidth: 0,
    customPaperHeight: 0,
    minBorder: 0.75,
    enableOffset: false,
    ignoreMinBorder: false,
    horizontalOffset: 0,
    verticalOffset: 0,
    showBlades: true,
    isLandscape: false,
    isRatioFlipped: false,
  };

  // Test data with custom aspect ratio and paper size
  const customPresetSettings: BorderPresetSettings = {
    aspectRatio: 'custom',
    paperSize: 'custom',
    customAspectWidth: 2.5,
    customAspectHeight: 3.5,
    customPaperWidth: 12,
    customPaperHeight: 16,
    minBorder: 1.25,
    enableOffset: true,
    ignoreMinBorder: true,
    horizontalOffset: 0.5,
    verticalOffset: -0.25,
    showBlades: false,
    isLandscape: true,
    isRatioFlipped: true,
  };

  // Test data with all boolean flags set
  const allFlagsPresetSettings: BorderPresetSettings = {
    aspectRatio: '16:9',
    paperSize: '11x14',
    customAspectWidth: 0,
    customAspectHeight: 0,
    customPaperWidth: 0,
    customPaperHeight: 0,
    minBorder: 2.0,
    enableOffset: true,
    ignoreMinBorder: true,
    horizontalOffset: 1.0,
    verticalOffset: 1.5,
    showBlades: true,
    isLandscape: true,
    isRatioFlipped: true,
  };

  describe('encodePreset', () => {
    it('should encode a standard preset correctly', () => {
      const preset = {
        name: 'Standard Test',
        settings: standardPresetSettings,
      };
      const encoded = encodePreset(preset);

      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
      // Verify base64 URL-safe encoding (no +, /, = characters)
      expect(encoded).not.toMatch(/[+/=]/);
    });

    it('should encode a custom preset correctly', () => {
      const preset = { name: 'Custom Test', settings: customPresetSettings };
      const encoded = encodePreset(preset);

      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
      expect(encoded).not.toMatch(/[+/=]/);
    });

    it('should encode preset with all boolean flags set', () => {
      const preset = { name: 'All Flags', settings: allFlagsPresetSettings };
      const encoded = encodePreset(preset);

      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
      expect(encoded).not.toMatch(/[+/=]/);
    });

    it('should handle preset names with special characters', () => {
      const preset = {
        name: 'Test & Special Characters: 35mm/120',
        settings: standardPresetSettings,
      };
      const encoded = encodePreset(preset);

      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should handle empty preset name', () => {
      const preset = { name: '', settings: standardPresetSettings };
      const encoded = encodePreset(preset);

      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should return empty string for invalid aspect ratio', () => {
      const invalidSettings = {
        ...standardPresetSettings,
        aspectRatio: 'invalid-ratio',
      };
      const preset = { name: 'Invalid', settings: invalidSettings };

      let encoded = '';
      try {
        encoded = encodePreset(preset);
      } catch (_error) {
        encoded = '';
      }

      expect(encoded).toBe('');
    });

    it('should return empty string for invalid paper size', () => {
      const invalidSettings = {
        ...standardPresetSettings,
        paperSize: 'invalid-size',
      };
      const preset = { name: 'Invalid', settings: invalidSettings };

      let encoded = '';
      try {
        encoded = encodePreset(preset);
      } catch (_error) {
        encoded = '';
      }

      expect(encoded).toBe('');
    });
  });

  describe('decodePreset', () => {
    it('should decode a standard preset correctly', () => {
      const originalPreset = {
        name: 'Standard Test',
        settings: standardPresetSettings,
      };
      const encoded = encodePreset(originalPreset);
      const decoded = decodePreset(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe('Standard Test');
      expect(decoded?.settings.aspectRatio).toBe('3:2');
      expect(decoded?.settings.paperSize).toBe('8x10');
      expect(decoded?.settings.minBorder).toBeCloseTo(0.75);
      expect(decoded?.settings.showBlades).toBe(true);
      expect(decoded?.settings.isLandscape).toBe(false);
    });

    it('should decode a custom preset correctly', () => {
      const originalPreset = {
        name: 'Custom Test',
        settings: customPresetSettings,
      };
      const encoded = encodePreset(originalPreset);
      const decoded = decodePreset(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe('Custom Test');
      expect(decoded?.settings.aspectRatio).toBe('custom');
      expect(decoded?.settings.paperSize).toBe('custom');
      expect(decoded?.settings.customAspectWidth).toBeCloseTo(2.5);
      expect(decoded?.settings.customAspectHeight).toBeCloseTo(3.5);
      expect(decoded?.settings.customPaperWidth).toBeCloseTo(12);
      expect(decoded?.settings.customPaperHeight).toBeCloseTo(16);
      expect(decoded?.settings.enableOffset).toBe(true);
      expect(decoded?.settings.ignoreMinBorder).toBe(true);
      expect(decoded?.settings.isLandscape).toBe(true);
      expect(decoded?.settings.isRatioFlipped).toBe(true);
    });

    it('should return null for invalid base64', () => {
      const result = decodePreset('invalid-base64-string');
      expect(result).toBeNull();
    });

    it('should return null for malformed data', () => {
      const result = decodePreset('YWJjZGVm'); // Valid base64 but invalid data
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = decodePreset('');
      expect(result).toBeNull();
    });

    it('should handle base64 strings that need padding', () => {
      const originalPreset = { name: 'Test', settings: standardPresetSettings };
      const encoded = encodePreset(originalPreset);
      // Remove padding if it exists and test with various padding scenarios
      const withoutPadding = encoded.replace(/=/g, '');
      const decoded = decodePreset(withoutPadding);

      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe('Test');
    });
  });

  describe('encode/decode symmetry', () => {
    const testCases = [
      { name: 'Standard Settings', settings: standardPresetSettings },
      { name: 'Custom Settings', settings: customPresetSettings },
      { name: 'All Flags', settings: allFlagsPresetSettings },
    ];

    testCases.forEach(({ name, settings }) => {
      it(`should maintain data integrity for ${name}`, () => {
        const originalPreset = { name, settings };
        const encoded = encodePreset(originalPreset);
        const decoded = decodePreset(encoded);

        expect(decoded).not.toBeNull();
        expect(decoded?.name).toBe(name);

        // Check all settings are preserved
        expect(decoded?.settings.aspectRatio).toBe(settings.aspectRatio);
        expect(decoded?.settings.paperSize).toBe(settings.paperSize);
        expect(decoded?.settings.minBorder).toBeCloseTo(settings.minBorder);
        expect(decoded?.settings.horizontalOffset).toBeCloseTo(
          settings.horizontalOffset
        );
        expect(decoded?.settings.verticalOffset).toBeCloseTo(
          settings.verticalOffset
        );
        expect(decoded?.settings.enableOffset).toBe(settings.enableOffset);
        expect(decoded?.settings.ignoreMinBorder).toBe(
          settings.ignoreMinBorder
        );
        expect(decoded?.settings.showBlades).toBe(settings.showBlades);
        expect(decoded?.settings.isLandscape).toBe(settings.isLandscape);
        expect(decoded?.settings.isRatioFlipped).toBe(settings.isRatioFlipped);

        if (settings.aspectRatio === 'custom') {
          expect(decoded?.settings.customAspectWidth).toBeCloseTo(
            settings.customAspectWidth
          );
          expect(decoded?.settings.customAspectHeight).toBeCloseTo(
            settings.customAspectHeight
          );
        }

        if (settings.paperSize === 'custom') {
          expect(decoded?.settings.customPaperWidth).toBeCloseTo(
            settings.customPaperWidth
          );
          expect(decoded?.settings.customPaperHeight).toBeCloseTo(
            settings.customPaperHeight
          );
        }
      });
    });

    it('should handle extreme decimal values', () => {
      const extremeSettings: BorderPresetSettings = {
        ...standardPresetSettings,
        minBorder: 0.001,
        horizontalOffset: 99.999,
        verticalOffset: -50.555,
      };
      const originalPreset = {
        name: 'Extreme Values',
        settings: extremeSettings,
      };
      const encoded = encodePreset(originalPreset);
      const decoded = decodePreset(encoded);

      expect(decoded).not.toBeNull();
      // Values are rounded to centimeters (2 decimal places)
      expect(decoded?.settings.minBorder).toBeCloseTo(0.0, 2);
      expect(decoded?.settings.horizontalOffset).toBeCloseTo(100.0, 1);
      expect(decoded?.settings.verticalOffset).toBeCloseTo(-50.55, 2);
    });

    it('should handle zero values', () => {
      const zeroSettings: BorderPresetSettings = {
        ...standardPresetSettings,
        minBorder: 0,
        horizontalOffset: 0,
        verticalOffset: 0,
        customAspectWidth: 0,
        customAspectHeight: 0,
        customPaperWidth: 0,
        customPaperHeight: 0,
      };
      const originalPreset = { name: 'Zero Values', settings: zeroSettings };
      const encoded = encodePreset(originalPreset);
      const decoded = decodePreset(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded?.settings.minBorder).toBe(0);
      expect(decoded?.settings.horizontalOffset).toBe(0);
      expect(decoded?.settings.verticalOffset).toBe(0);
    });
  });

  describe('boolean bitmask functionality', () => {
    it('should encode and decode all boolean combinations correctly', () => {
      const booleanCombinations = [
        [false, false, false, false, false],
        [true, false, false, false, false],
        [false, true, false, false, false],
        [false, false, true, false, false],
        [false, false, false, true, false],
        [false, false, false, false, true],
        [true, true, true, true, true],
        [true, false, true, false, true],
      ];

      booleanCombinations.forEach((bools, index) => {
        const testSettings: BorderPresetSettings = {
          ...standardPresetSettings,
          enableOffset: bools[0],
          ignoreMinBorder: bools[1],
          showBlades: bools[2],
          isLandscape: bools[3],
          isRatioFlipped: bools[4],
        };

        const originalPreset = {
          name: `Boolean Test ${index}`,
          settings: testSettings,
        };
        const encoded = encodePreset(originalPreset);
        const decoded = decodePreset(encoded);

        expect(decoded).not.toBeNull();
        expect(decoded?.settings.enableOffset).toBe(bools[0]);
        expect(decoded?.settings.ignoreMinBorder).toBe(bools[1]);
        expect(decoded?.settings.showBlades).toBe(bools[2]);
        expect(decoded?.settings.isLandscape).toBe(bools[3]);
        expect(decoded?.settings.isRatioFlipped).toBe(bools[4]);
      });
    });
  });

  describe('precision and rounding', () => {
    it('should round values to centimeters consistently', () => {
      const preciseSettings: BorderPresetSettings = {
        ...standardPresetSettings,
        minBorder: 1.234567,
        horizontalOffset: 2.987654,
        verticalOffset: -1.555555,
      };
      const originalPreset = {
        name: 'Precision Test',
        settings: preciseSettings,
      };
      const encoded = encodePreset(originalPreset);
      const decoded = decodePreset(encoded);

      expect(decoded).not.toBeNull();
      // Values should be rounded to 2 decimal places (centimeters)
      expect(decoded?.settings.minBorder).toBeCloseTo(1.23, 2);
      expect(decoded?.settings.horizontalOffset).toBeCloseTo(2.99, 2);
      expect(decoded?.settings.verticalOffset).toBeCloseTo(-1.56, 2);
    });

    it('should handle custom dimensions precision', () => {
      const customPreciseSettings: BorderPresetSettings = {
        ...customPresetSettings,
        customAspectWidth: Math.PI,
        customAspectHeight: Math.E,
        customPaperWidth: 12.9876,
        customPaperHeight: 16.1234,
      };
      const originalPreset = {
        name: 'Custom Precision',
        settings: customPreciseSettings,
      };
      const encoded = encodePreset(originalPreset);
      const decoded = decodePreset(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded?.settings.customAspectWidth).toBeCloseTo(3.14, 2);
      expect(decoded?.settings.customAspectHeight).toBeCloseTo(2.72, 2);
      expect(decoded?.settings.customPaperWidth).toBeCloseTo(12.99, 2);
      expect(decoded?.settings.customPaperHeight).toBeCloseTo(16.12, 2);
    });
  });

  describe('URL safety', () => {
    it('should produce URL-safe base64 strings', () => {
      const presets = [
        { name: 'Test 1', settings: standardPresetSettings },
        { name: 'Test 2', settings: customPresetSettings },
        { name: 'Test 3', settings: allFlagsPresetSettings },
      ];

      presets.forEach((preset) => {
        const encoded = encodePreset(preset);

        // URL-safe base64 should not contain +, /, or = characters
        expect(encoded).not.toMatch(/\+/);
        expect(encoded).not.toMatch(/\//);
        expect(encoded).not.toMatch(/=/);

        // Should only contain URL-safe characters
        expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/);
      });
    });
  });

  describe('error handling', () => {
    it('should handle encoding errors gracefully', () => {
      // Test with object that might cause encoding issues
      const problematicPreset = {
        name: 'Test',
        settings: {
          ...standardPresetSettings,
          aspectRatio: 'invalid-aspect-ratio',
        },
      };

      const result = encodePreset(problematicPreset);
      expect(result).toBe('');
    });

    it('should handle decoding errors gracefully', () => {
      const invalidInputs = [
        'not-base64',
        '12345',
        'invalid!@#$%',
        'SGVsbG8gV29ybGQ', // Valid base64 but invalid preset data
      ];

      invalidInputs.forEach((input) => {
        const result = decodePreset(input);
        expect(result).toBeNull();
      });
    });
  });
});
