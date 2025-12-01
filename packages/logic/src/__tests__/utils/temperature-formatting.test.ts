import {
  formatTemperature,
  type TemperatureData,
} from '../../utils/temperature-formatting';

describe('temperature formatting', () => {
  describe('formatTemperature', () => {
    it('should format both Fahrenheit and Celsius when both are provided', () => {
      const temp: TemperatureData = { temperatureF: 68, temperatureC: 20 };
      expect(formatTemperature(temp)).toBe('68.0°F (20.0°C)');

      const temp2: TemperatureData = { temperatureF: 72.5, temperatureC: 22.5 };
      expect(formatTemperature(temp2)).toBe('72.5°F (22.5°C)');
    });

    it('should format only Fahrenheit when only F is provided', () => {
      const temp: TemperatureData = { temperatureF: 68 };
      expect(formatTemperature(temp)).toBe('68.0°F');

      const temp2: TemperatureData = { temperatureF: 72.5 };
      expect(formatTemperature(temp2)).toBe('72.5°F');
    });

    it('should format only Celsius when only C is provided', () => {
      const temp: TemperatureData = { temperatureC: 20 };
      expect(formatTemperature(temp)).toBe('20.0°C');

      const temp2: TemperatureData = { temperatureC: 22.5 };
      expect(formatTemperature(temp2)).toBe('22.5°C');
    });

    it('should show only Fahrenheit when F is provided and C is explicitly null', () => {
      const temp: TemperatureData = { temperatureF: 32, temperatureC: null };
      expect(formatTemperature(temp)).toBe('32.0°F');

      const temp2: TemperatureData = { temperatureF: 212, temperatureC: null };
      expect(formatTemperature(temp2)).toBe('212.0°F');

      const temp3: TemperatureData = { temperatureF: 68, temperatureC: null };
      expect(formatTemperature(temp3)).toBe('68.0°F');
    });

    it('should display both units when both are explicitly provided', () => {
      // Test that both units are shown when both are provided
      const freezing: TemperatureData = { temperatureF: 32, temperatureC: 0 };
      expect(formatTemperature(freezing)).toBe('32.0°F (0.0°C)');

      const boiling: TemperatureData = { temperatureF: 212, temperatureC: 100 };
      expect(formatTemperature(boiling)).toBe('212.0°F (100.0°C)');

      const bodyTemp: TemperatureData = {
        temperatureF: 98.6,
        temperatureC: 37,
      };
      expect(formatTemperature(bodyTemp)).toBe('98.6°F (37.0°C)');
    });

    it('should return em dash when no valid temperatures are provided', () => {
      expect(formatTemperature({})).toBe('—');
      expect(formatTemperature({ temperatureF: null })).toBe('—');
      expect(formatTemperature({ temperatureC: null })).toBe('—');
      expect(
        formatTemperature({ temperatureF: null, temperatureC: null })
      ).toBe('—');
    });

    it('should handle invalid numeric values', () => {
      expect(formatTemperature({ temperatureF: NaN })).toBe('—');
      expect(formatTemperature({ temperatureC: NaN })).toBe('—');
      expect(formatTemperature({ temperatureF: Infinity })).toBe('—');
      expect(formatTemperature({ temperatureC: -Infinity })).toBe('—');
    });

    it('should handle undefined values', () => {
      expect(formatTemperature({ temperatureF: undefined })).toBe('—');
      expect(formatTemperature({ temperatureC: undefined })).toBe('—');
      expect(
        formatTemperature({ temperatureF: undefined, temperatureC: undefined })
      ).toBe('—');
    });

    it('should prioritize provided Celsius over conversion when both F and C are given', () => {
      // When both are provided, it should use both without conversion
      const temp: TemperatureData = { temperatureF: 68, temperatureC: 25 }; // Not exact conversion
      expect(formatTemperature(temp)).toBe('68.0°F (25.0°C)');
    });

    it('should handle zero temperatures', () => {
      expect(formatTemperature({ temperatureF: 0 })).toBe('0.0°F');
      expect(formatTemperature({ temperatureC: 0 })).toBe('0.0°C');
      expect(formatTemperature({ temperatureF: 0, temperatureC: 0 })).toBe(
        '0.0°F (0.0°C)'
      );
    });

    it('should handle negative temperatures', () => {
      expect(formatTemperature({ temperatureF: -40 })).toBe('-40.0°F');
      expect(formatTemperature({ temperatureC: -10 })).toBe('-10.0°C');
      expect(formatTemperature({ temperatureF: 14, temperatureC: -10 })).toBe(
        '14.0°F (-10.0°C)'
      );
    });

    it('should format decimal places consistently', () => {
      expect(formatTemperature({ temperatureF: 68.123 })).toBe('68.1°F');
      expect(formatTemperature({ temperatureC: 20.987 })).toBe('21.0°C');
      expect(
        formatTemperature({ temperatureF: 70.0, temperatureC: 21.1 })
      ).toBe('70.0°F (21.1°C)');
    });
  });
});
