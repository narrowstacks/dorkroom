import {
  parseDilutionRatio,
  normalizeDilution,
  formatDilution,
  isValidDilution,
  getDilutionParts,
  describeDilution,
} from '../dilutionUtils';

describe('dilutionUtils', () => {
  describe('parseDilutionRatio', () => {
    it('should parse colon notation correctly', () => {
      expect(parseDilutionRatio('1:9')).toBeCloseTo(0.1);
      expect(parseDilutionRatio('1:31')).toBeCloseTo(1 / 32);
      expect(parseDilutionRatio('2:8')).toBeCloseTo(0.2);
    });

    it('should parse plus notation correctly', () => {
      expect(parseDilutionRatio('1+9')).toBeCloseTo(0.1);
      expect(parseDilutionRatio('1+31')).toBeCloseTo(1 / 32);
      expect(parseDilutionRatio('2+8')).toBeCloseTo(0.2);
    });

    it('should treat colon and plus notation as equivalent', () => {
      expect(parseDilutionRatio('1:9')).toBe(parseDilutionRatio('1+9'));
      expect(parseDilutionRatio('1:31')).toBe(parseDilutionRatio('1+31'));
      expect(parseDilutionRatio('2:8')).toBe(parseDilutionRatio('2+8'));
    });

    it('should handle stock solutions', () => {
      expect(parseDilutionRatio('Stock')).toBe(1);
      expect(parseDilutionRatio('stock')).toBe(1);
      expect(parseDilutionRatio('')).toBe(1);
    });

    it('should handle percentage format', () => {
      expect(parseDilutionRatio('10%')).toBe(0.1);
      expect(parseDilutionRatio('50%')).toBe(0.5);
    });
  });

  describe('normalizeDilution', () => {
    it('should convert colon notation to plus notation', () => {
      expect(normalizeDilution('1:9')).toBe('1+9');
      expect(normalizeDilution('1:31')).toBe('1+31');
      expect(normalizeDilution('2:8')).toBe('2+8');
    });

    it('should leave plus notation unchanged', () => {
      expect(normalizeDilution('1+9')).toBe('1+9');
      expect(normalizeDilution('1+31')).toBe('1+31');
    });

    it('should handle stock and percentage formats', () => {
      expect(normalizeDilution('Stock')).toBe('Stock');
      expect(normalizeDilution('stock')).toBe('stock');
      expect(normalizeDilution('10%')).toBe('10%');
    });

    it('should handle whitespace', () => {
      expect(normalizeDilution('1 : 9')).toBe('1+9');
      expect(normalizeDilution(' 1:31 ')).toBe('1+31');
    });

    it('should handle empty input', () => {
      expect(normalizeDilution('')).toBe('Stock');
      expect(normalizeDilution('   ')).toBe('Stock');
    });
  });

  describe('formatDilution', () => {
    it('should format dilutions consistently', () => {
      expect(formatDilution('1:9')).toBe('1+9');
      expect(formatDilution('1+9')).toBe('1+9');
      expect(formatDilution('Stock')).toBe('Stock');
    });
  });

  describe('isValidDilution', () => {
    it('should validate correct formats', () => {
      expect(isValidDilution('1:9')).toBe(true);
      expect(isValidDilution('1+9')).toBe(true);
      expect(isValidDilution('Stock')).toBe(true);
      expect(isValidDilution('stock')).toBe(true);
      expect(isValidDilution('10%')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidDilution('')).toBe(false);
      expect(isValidDilution('invalid')).toBe(false);
      expect(isValidDilution('1:')).toBe(false);
      expect(isValidDilution(':9')).toBe(false);
    });
  });

  describe('getDilutionParts', () => {
    it('should extract parts correctly', () => {
      expect(getDilutionParts('1:9')).toEqual({
        developerParts: 1,
        waterParts: 9,
      });
      expect(getDilutionParts('1+31')).toEqual({
        developerParts: 1,
        waterParts: 31,
      });
      expect(getDilutionParts('2:8')).toEqual({
        developerParts: 2,
        waterParts: 8,
      });
    });

    it('should handle stock solutions', () => {
      expect(getDilutionParts('Stock')).toEqual({
        developerParts: 1,
        waterParts: 0,
      });
      expect(getDilutionParts('stock')).toEqual({
        developerParts: 1,
        waterParts: 0,
      });
    });

    it('should return null for invalid input', () => {
      expect(getDilutionParts('invalid')).toBeNull();
      expect(getDilutionParts('10%')).toBeNull();
    });
  });

  describe('describeDilution', () => {
    it('should create human-readable descriptions', () => {
      expect(describeDilution('1:9')).toBe('1 part developer + 9 parts water');
      expect(describeDilution('1+31')).toBe(
        '1 part developer + 31 parts water'
      );
      expect(describeDilution('2:8')).toBe('2 parts developer + 8 parts water');
    });

    it('should handle stock solutions', () => {
      expect(describeDilution('Stock')).toBe('Stock solution (undiluted)');
      expect(describeDilution('stock')).toBe('Stock solution (undiluted)');
    });

    it('should handle percentage format', () => {
      expect(describeDilution('10%')).toBe('10% developer solution');
    });

    it('should handle edge cases', () => {
      expect(describeDilution('1:0')).toBe('Stock solution (undiluted)');
      expect(describeDilution('invalid')).toBe('invalid');
    });
  });
});
