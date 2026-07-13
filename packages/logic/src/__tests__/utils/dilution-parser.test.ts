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

  describe('parseDilution - Colon Notation (concentrate+water, matches manufacturer usage)', () => {
    it('should parse "1:4" as 1 part concentrate + 4 parts water', () => {
      const result = parseDilution('1:4');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 1,
        waterParts: 4,
        totalParts: 5,
      });
    });

    it('should parse "1:50" as 1 part concentrate + 50 parts water', () => {
      const result = parseDilution('1:50');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 1,
        waterParts: 50,
        totalParts: 51,
      });
    });

    it('should parse "1:100" as 1 part concentrate + 100 parts water', () => {
      const result = parseDilution('1:100');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 1,
        waterParts: 100,
        totalParts: 101,
      });
    });

    it('should parse "1:31" (Ilfotec HC dilution B) as 1 part concentrate + 31 parts water', () => {
      const result = parseDilution('1:31');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 1,
        waterParts: 31,
        totalParts: 32,
      });
    });

    it('should parse "1:1" as 1 part concentrate + 1 part water (falls out of the general rule now, no special case needed)', () => {
      const result = parseDilution('1:1');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 1,
        waterParts: 1,
        totalParts: 2,
      });
    });

    it('should parse "2:10" as 2 parts concentrate + 10 parts water', () => {
      const result = parseDilution('2:10');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 2,
        waterParts: 10,
        totalParts: 12,
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

    it('should parse "5:3" as 5 parts concentrate + 3 parts water (no longer null: colon is concentrate:water, not "total < concentrate")', () => {
      const result = parseDilution('5:3');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 5,
        waterParts: 3,
        totalParts: 8,
      });
    });

    it('should parse "2:2" as 2 parts concentrate + 2 parts water (no longer collapses to stock)', () => {
      const result = parseDilution('2:2');
      expect(result).toEqual({
        type: 'ratio',
        concentrateParts: 2,
        waterParts: 2,
        totalParts: 4,
      });
    });

    it('should parse "1:0" as stock (0 parts water)', () => {
      const result = parseDilution('1:0');
      expect(result).toEqual({
        type: 'stock',
        concentrateParts: 1,
        waterParts: 0,
        totalParts: 1,
      });
    });
  });

  describe('parseDilution - Plus vs Colon Equivalence', () => {
    it('should calculate identical results for "1+4" and "1:4" (same convention, matches manufacturer usage)', () => {
      const plusResult = parseDilution('1+4');
      const colonResult = parseDilution('1:4');

      expect(colonResult).toEqual(plusResult);
      expect(plusResult?.totalParts).toBe(5);
      expect(plusResult?.waterParts).toBe(4);
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

    it('should calculate volumes for 1:50 dilution with 500ml total (51 total parts)', () => {
      const parsed = parseDilution('1:50')!;
      const result = calculateVolumes(500, parsed);

      expect(result.total).toBe(500);
      expect(result.concentrate).toBeCloseTo(9.803922, 5); // 500 * 1/51
      expect(result.water).toBeCloseTo(490.196078, 5); // 500 * 50/51
    });

    it('should calculate volumes for 1:31 (Ilfotec HC dilution B) with 500ml total', () => {
      const parsed = parseDilution('1:31')!;
      const result = calculateVolumes(500, parsed);

      expect(result.total).toBe(500);
      expect(result.concentrate).toBeCloseTo(15.625, 2); // 500 * 1/32
      expect(result.water).toBeCloseTo(484.375, 2); // 500 * 31/32
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
