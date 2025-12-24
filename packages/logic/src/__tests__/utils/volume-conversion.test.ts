import {
  convertDisplayToMl,
  convertMlToDisplay,
  flozToMl,
  formatVolume,
  getDefaultVolumeMl,
  getVolumePrecision,
  getVolumeStepSize,
  getVolumeUnitLabel,
  mlToFloz,
} from '../../utils/volume-conversion';

describe('volume-conversion', () => {
  describe('mlToFloz', () => {
    it('should convert milliliters to fluid ounces', () => {
      // 29.5735 ml = 1 fl oz
      expect(mlToFloz(29.5735)).toBeCloseTo(1, 4);
      expect(mlToFloz(59.147)).toBeCloseTo(2, 2);
      expect(mlToFloz(500)).toBeCloseTo(16.907, 2);
    });

    it('should handle zero', () => {
      expect(mlToFloz(0)).toBe(0);
    });

    it('should handle common volumes', () => {
      expect(mlToFloz(300)).toBeCloseTo(10.14, 1); // Small tank
      expect(mlToFloz(500)).toBeCloseTo(16.91, 1); // Medium tank
      expect(mlToFloz(1000)).toBeCloseTo(33.81, 1); // Large tank
    });
  });

  describe('flozToMl', () => {
    it('should convert fluid ounces to milliliters', () => {
      expect(flozToMl(1)).toBeCloseTo(29.5735, 2);
      expect(flozToMl(2)).toBeCloseTo(59.147, 2);
      expect(flozToMl(16)).toBeCloseTo(473.176, 1);
    });

    it('should handle zero', () => {
      expect(flozToMl(0)).toBe(0);
    });

    it('should be inverse of mlToFloz', () => {
      const original = 500;
      const converted = mlToFloz(original);
      const backToMl = flozToMl(converted);
      expect(backToMl).toBeCloseTo(original, 4);
    });
  });

  describe('convertMlToDisplay', () => {
    it('should return ml unchanged when unit is ml', () => {
      expect(convertMlToDisplay(500, 'ml')).toBe(500);
      expect(convertMlToDisplay(1000, 'ml')).toBe(1000);
    });

    it('should convert to floz when unit is floz', () => {
      expect(convertMlToDisplay(500, 'floz')).toBeCloseTo(16.907, 2);
      expect(convertMlToDisplay(29.5735, 'floz')).toBeCloseTo(1, 4);
    });
  });

  describe('convertDisplayToMl', () => {
    it('should return ml unchanged when unit is ml', () => {
      expect(convertDisplayToMl(500, 'ml')).toBe(500);
      expect(convertDisplayToMl(1000, 'ml')).toBe(1000);
    });

    it('should convert from floz to ml when unit is floz', () => {
      expect(convertDisplayToMl(16, 'floz')).toBeCloseTo(473.176, 1);
      expect(convertDisplayToMl(1, 'floz')).toBeCloseTo(29.5735, 2);
    });

    it('should be inverse of convertMlToDisplay', () => {
      const originalMl = 500;
      const displayFloz = convertMlToDisplay(originalMl, 'floz');
      const backToMl = convertDisplayToMl(displayFloz, 'floz');
      expect(backToMl).toBeCloseTo(originalMl, 4);
    });
  });

  describe('getVolumeUnitLabel', () => {
    it('should return "ml" for ml unit', () => {
      expect(getVolumeUnitLabel('ml')).toBe('ml');
    });

    it('should return "fl oz" for floz unit', () => {
      expect(getVolumeUnitLabel('floz')).toBe('fl oz');
    });
  });

  describe('getVolumePrecision', () => {
    it('should return 0 for ml (whole numbers)', () => {
      expect(getVolumePrecision('ml')).toBe(0);
    });

    it('should return 1 for floz (one decimal place)', () => {
      expect(getVolumePrecision('floz')).toBe(1);
    });
  });

  describe('getVolumeStepSize', () => {
    it('should return 1 for ml', () => {
      expect(getVolumeStepSize('ml')).toBe(1);
    });

    it('should return 0.1 for floz', () => {
      expect(getVolumeStepSize('floz')).toBe(0.1);
    });
  });

  describe('formatVolume', () => {
    it('should format ml with 0 decimal places by default', () => {
      expect(formatVolume(500, 'ml')).toBe('500 ml');
      expect(formatVolume(499.6, 'ml')).toBe('500 ml');
      expect(formatVolume(499.4, 'ml')).toBe('499 ml');
    });

    it('should format floz with 1 decimal place by default', () => {
      expect(formatVolume(500, 'floz')).toBe('16.9 fl oz');
      expect(formatVolume(29.5735, 'floz')).toBe('1.0 fl oz');
    });

    it('should respect custom precision option', () => {
      expect(formatVolume(500, 'ml', { precision: 2 })).toBe('500.00 ml');
      expect(formatVolume(500, 'floz', { precision: 2 })).toBe('16.91 fl oz');
    });

    it('should omit unit when includeUnit is false', () => {
      expect(formatVolume(500, 'ml', { includeUnit: false })).toBe('500');
      expect(formatVolume(500, 'floz', { includeUnit: false })).toBe('16.9');
    });

    it('should handle zero', () => {
      expect(formatVolume(0, 'ml')).toBe('0 ml');
      expect(formatVolume(0, 'floz')).toBe('0.0 fl oz');
    });

    it('should handle small volumes', () => {
      expect(formatVolume(10, 'ml')).toBe('10 ml');
      expect(formatVolume(10, 'floz')).toBe('0.3 fl oz');
    });

    it('should handle large volumes', () => {
      expect(formatVolume(2000, 'ml')).toBe('2000 ml');
      expect(formatVolume(2000, 'floz')).toBe('67.6 fl oz');
    });
  });

  describe('getDefaultVolumeMl', () => {
    it('should return 500ml as default (common tank size)', () => {
      expect(getDefaultVolumeMl()).toBe(500);
    });
  });

  describe('integration - real-world scenarios', () => {
    it('should correctly calculate and format for Paterson 2-reel tank (500ml)', () => {
      const tankMl = 500;

      // Display in ml
      expect(formatVolume(tankMl, 'ml')).toBe('500 ml');

      // Display in fl oz
      expect(formatVolume(tankMl, 'floz')).toBe('16.9 fl oz');
    });

    it('should correctly calculate and format for Jobo 1500 tank (600ml)', () => {
      const tankMl = 600;

      expect(formatVolume(tankMl, 'ml')).toBe('600 ml');
      expect(formatVolume(tankMl, 'floz')).toBe('20.3 fl oz');
    });

    it('should handle user input conversion round-trip', () => {
      // User enters 17 fl oz
      const userInput = 17;
      const internalMl = convertDisplayToMl(userInput, 'floz');

      // Should be approximately 502.75ml
      expect(internalMl).toBeCloseTo(502.75, 0);

      // When displayed back, should show ~17.0 fl oz
      const displayValue = convertMlToDisplay(internalMl, 'floz');
      expect(displayValue).toBeCloseTo(17, 1);
    });
  });
});
