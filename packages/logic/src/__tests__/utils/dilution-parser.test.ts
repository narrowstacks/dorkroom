import {
  calculateVolumes,
  formatDilutionDescription,
  isStockDilution,
  parseDilution,
} from '../../utils/dilution-parser';

describe('dilution-parser', () => {
  describe('isStockDilution', () => {
    it('should return true for "Stock"', () => {
      expect(isStockDilution('Stock')).toBe(true);
      expect(isStockDilution('stock')).toBe(true);
      expect(isStockDilution('STOCK')).toBe(true);
      expect(isStockDilution('  stock  ')).toBe(true);
    });

    it('should return true for "1+0"', () => {
      expect(isStockDilution('1+0')).toBe(true);
      expect(isStockDilution(' 1+0 ')).toBe(true);
    });

    it('should return false for dilutions requiring mixing', () => {
      expect(isStockDilution('1+1')).toBe(false);
      expect(isStockDilution('1+4')).toBe(false);
      expect(isStockDilution('1:50')).toBe(false);
      expect(isStockDilution('1:100')).toBe(false);
    });
  });

  describe('parseDilution - Plus Notation', () => {
    it('should parse "1+1" as 1 part concentrate + 1 part water', () => {
      const result = parseDilution('1+1');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 1,
        waterParts: 1,
        totalParts: 2,
      });
    });

    it('should parse "1+4" as 1 part concentrate + 4 parts water', () => {
      const result = parseDilution('1+4');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 1,
        waterParts: 4,
        totalParts: 5,
      });
    });

    it('should parse "1+31" (Rodinal standard) correctly', () => {
      const result = parseDilution('1+31');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 1,
        waterParts: 31,
        totalParts: 32,
      });
    });

    it('should parse "1+0" as stock', () => {
      const result = parseDilution('1+0');
      expect(result).toEqual({
        type: 'stock',
        concentrateParts: 1,
        waterParts: 0,
        totalParts: 1,
      });
    });

    it('should handle whitespace', () => {
      const result = parseDilution('  1+4  ');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 1,
        waterParts: 4,
        totalParts: 5,
      });
    });
  });

  describe('parseDilution - Colon Notation (Dilution Factor)', () => {
    it('should parse "1:4" as 1 part in 4 total (1 concentrate + 3 water)', () => {
      const result = parseDilution('1:4');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 1,
        waterParts: 3,
        totalParts: 4,
      });
    });

    it('should parse "1:50" as 1 part in 50 total (1 concentrate + 49 water)', () => {
      const result = parseDilution('1:50');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 1,
        waterParts: 49,
        totalParts: 50,
      });
    });

    it('should parse "1:100" as 1 part in 100 total', () => {
      const result = parseDilution('1:100');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 1,
        waterParts: 99,
        totalParts: 100,
      });
    });

    it('should treat "1:1" as exception - same as "1+1" (historical convention)', () => {
      const result = parseDilution('1:1');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 1,
        waterParts: 1,
        totalParts: 2,
      });
    });

    it('should parse "2:10" as 2 parts in 10 total (2 concentrate + 8 water)', () => {
      const result = parseDilution('2:10');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 2,
        waterParts: 8,
        totalParts: 10,
      });
    });
  });

  describe('parseDilution - Stock', () => {
    it('should parse "Stock" as stock type', () => {
      const result = parseDilution('Stock');
      expect(result).toEqual({
        type: 'stock',
        concentrateParts: 1,
        waterParts: 0,
        totalParts: 1,
      });
    });

    it('should be case-insensitive for Stock', () => {
      expect(parseDilution('stock')).toEqual(parseDilution('Stock'));
      expect(parseDilution('STOCK')).toEqual(parseDilution('Stock'));
    });
  });

  describe('parseDilution - Edge Cases', () => {
    it('should return null for unparseable formats', () => {
      expect(parseDilution('invalid')).toBeNull();
      expect(parseDilution('1-1')).toBeNull();
      expect(parseDilution('1/4')).toBeNull();
      expect(parseDilution('')).toBeNull();
      expect(parseDilution('abc')).toBeNull();
    });

    it('should return null for colon notation where total < concentrate', () => {
      expect(parseDilution('5:3')).toBeNull();
    });

    it('should handle "2:2" as stock (2 parts in 2 total = no water)', () => {
      const result = parseDilution('2:2');
      expect(result).toEqual({
        type: 'stock',
        concentrateParts: 1,
        waterParts: 0,
        totalParts: 1,
      });
    });
  });

  describe('parseDilution - Plus vs Colon Difference', () => {
    it('should calculate different results for "1+4" vs "1:4"', () => {
      const plusResult = parseDilution('1+4');
      const colonResult = parseDilution('1:4');

      // 1+4 = 1 part concentrate + 4 parts water = 5 total (20% concentrate)
      expect(plusResult?.totalParts).toBe(5);
      expect(plusResult?.waterParts).toBe(4);

      // 1:4 = 1 part in 4 total = 1 part concentrate + 3 parts water (25% concentrate)
      expect(colonResult?.totalParts).toBe(4);
      expect(colonResult?.waterParts).toBe(3);
    });
  });

  describe('calculateVolumes', () => {
    it('should calculate volumes for 1+1 dilution with 500ml total', () => {
      const parsed = parseDilution('1+1')!;
      const result = calculateVolumes(500, parsed);

      expect(result.total).toBe(500);
      expect(result.concentrate).toBe(250);
      expect(result.water).toBe(250);
    });

    it('should calculate volumes for 1+4 dilution with 500ml total', () => {
      const parsed = parseDilution('1+4')!;
      const result = calculateVolumes(500, parsed);

      expect(result.total).toBe(500);
      expect(result.concentrate).toBe(100); // 500 * 1/5
      expect(result.water).toBe(400); // 500 * 4/5
    });

    it('should calculate volumes for 1:50 dilution with 500ml total', () => {
      const parsed = parseDilution('1:50')!;
      const result = calculateVolumes(500, parsed);

      expect(result.total).toBe(500);
      expect(result.concentrate).toBe(10); // 500 * 1/50
      expect(result.water).toBe(490); // 500 * 49/50
    });

    it('should return all concentrate for stock dilution', () => {
      const parsed = parseDilution('Stock')!;
      const result = calculateVolumes(500, parsed);

      expect(result.total).toBe(500);
      expect(result.concentrate).toBe(500);
      expect(result.water).toBe(0);
    });

    it('should handle decimal results correctly', () => {
      const parsed = parseDilution('1+31')!; // Rodinal 1+31
      const result = calculateVolumes(500, parsed);

      expect(result.total).toBe(500);
      expect(result.concentrate).toBeCloseTo(15.625, 2); // 500 * 1/32
      expect(result.water).toBeCloseTo(484.375, 2); // 500 * 31/32
    });

    it('should calculate correctly for common tank sizes', () => {
      const parsed = parseDilution('1+4')!;

      // 300ml (small tank)
      const small = calculateVolumes(300, parsed);
      expect(small.concentrate).toBe(60);
      expect(small.water).toBe(240);

      // 600ml (medium tank)
      const medium = calculateVolumes(600, parsed);
      expect(medium.concentrate).toBe(120);
      expect(medium.water).toBe(480);

      // 1000ml (large tank)
      const large = calculateVolumes(1000, parsed);
      expect(large.concentrate).toBe(200);
      expect(large.water).toBe(800);
    });
  });

  describe('formatDilutionDescription', () => {
    it('should format stock dilution', () => {
      const parsed = parseDilution('Stock')!;
      expect(formatDilutionDescription(parsed)).toBe(
        'Use developer stock (undiluted)'
      );
    });

    it('should format 1+1 with singular "part"', () => {
      const parsed = parseDilution('1+1')!;
      expect(formatDilutionDescription(parsed)).toBe(
        '1 part concentrate + 1 part water'
      );
    });

    it('should format 1+4 with plural "parts"', () => {
      const parsed = parseDilution('1+4')!;
      expect(formatDilutionDescription(parsed)).toBe(
        '1 part concentrate + 4 parts water'
      );
    });

    it('should format 2+8 with plural for both', () => {
      const parsed = parseDilution('2+8')!;
      expect(formatDilutionDescription(parsed)).toBe(
        '2 parts concentrate + 8 parts water'
      );
    });
  });
});
