import { describe, expect, it } from 'vitest';
import {
  formatTemperatureWithUnit,
  isNonStandardTemperature,
  STANDARD_TEMP_F,
} from '../../lib/temperature';

describe('temperature utilities', () => {
  describe('isNonStandardTemperature', () => {
    it('returns false for standard temperatures', () => {
      expect(isNonStandardTemperature(STANDARD_TEMP_F)).toBe(false);
      expect(isNonStandardTemperature(68.05)).toBe(false); // Within tolerance
    });

    it('returns true for non-standard temperatures', () => {
      expect(isNonStandardTemperature(75)).toBe(true);
      expect(isNonStandardTemperature(60)).toBe(true);
      expect(isNonStandardTemperature(68.2)).toBe(true); // Outside tolerance
    });

    it('handles edge cases near standard temperature', () => {
      expect(isNonStandardTemperature(67.95)).toBe(false); // Just within tolerance
      expect(isNonStandardTemperature(68.15)).toBe(true); // Just outside tolerance
    });
  });

  describe('formatTemperatureWithUnit', () => {
    describe('fahrenheit unit', () => {
      it('formats valid fahrenheit temperature', () => {
        const result = formatTemperatureWithUnit(75.5, null, 'fahrenheit');
        expect(result).toEqual({
          text: '75.5°F',
          isNonStandard: true,
        });
      });

      it('formats standard fahrenheit temperature', () => {
        const result = formatTemperatureWithUnit(68, null, 'fahrenheit');
        expect(result).toEqual({
          text: '68.0°F',
          isNonStandard: false,
        });
      });

      it('converts from celsius when fahrenheit is null', () => {
        const result = formatTemperatureWithUnit(null, 25, 'fahrenheit');
        expect(result).toEqual({
          text: '77.0°F',
          isNonStandard: true,
        });
      });
    });

    describe('celsius unit', () => {
      it('formats valid celsius temperature', () => {
        const result = formatTemperatureWithUnit(null, 25.5, 'celsius');
        expect(result).toEqual({
          text: '25.5°C',
          isNonStandard: true,
        });
      });

      it('formats standard celsius temperature', () => {
        const result = formatTemperatureWithUnit(null, 20, 'celsius');
        expect(result).toEqual({
          text: '20.0°C',
          isNonStandard: false,
        });
      });

      it('converts from fahrenheit when celsius is null', () => {
        const result = formatTemperatureWithUnit(77, null, 'celsius');
        expect(result).toEqual({
          text: '25.0°C',
          isNonStandard: true,
        });
      });
    });

    describe('edge cases', () => {
      it('returns dash when both temperatures are null', () => {
        const result = formatTemperatureWithUnit(null, null, 'fahrenheit');
        expect(result).toEqual({
          text: '—',
          isNonStandard: false,
        });
      });

      it('handles invalid numbers', () => {
        const result = formatTemperatureWithUnit(NaN, null, 'fahrenheit');
        expect(result).toEqual({
          text: '—',
          isNonStandard: false,
        });
      });

      it('handles Infinity', () => {
        const result = formatTemperatureWithUnit(Infinity, null, 'fahrenheit');
        expect(result).toEqual({
          text: '—',
          isNonStandard: false,
        });
      });

      it('uses fahrenheit for non-standard detection even in celsius mode', () => {
        const result = formatTemperatureWithUnit(75, null, 'celsius');
        expect(result).toEqual({
          text: '23.9°C',
          isNonStandard: true, // Because 75°F is non-standard
        });
      });
    });

    describe('temperature conversion accuracy', () => {
      it('converts common temperatures correctly', () => {
        // 32°F = 0°C
        const freezing = formatTemperatureWithUnit(32, null, 'celsius');
        expect(freezing.text).toBe('0.0°C');

        // 100°F = 37.8°C (rounded)
        const body = formatTemperatureWithUnit(100, null, 'celsius');
        expect(body.text).toBe('37.8°C');

        // 0°C = 32°F
        const celsius0 = formatTemperatureWithUnit(null, 0, 'fahrenheit');
        expect(celsius0.text).toBe('32.0°F');
      });
    });
  });
});
