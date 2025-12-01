import { describe, expect, it } from 'vitest';
import {
  isValidNumericParam,
  MAX_LIMIT,
  MAX_PARAM_LENGTH,
  MIN_LIMIT,
  validateAndSanitizeQuery,
} from '../queryValidation';

describe('queryValidation', () => {
  describe('validateAndSanitizeQuery', () => {
    const allowedParams = ['query', 'limit', 'page', 'colorType'];

    it('should filter out parameters not in allowlist', () => {
      const query = {
        query: 'test',
        malicious: '<script>alert("xss")</script>',
        notAllowed: 'value',
      };

      const result = validateAndSanitizeQuery(query, allowedParams);

      expect(result.get('query')).toBe('test');
      expect(result.get('malicious')).toBeNull();
      expect(result.get('notAllowed')).toBeNull();
    });

    it('should trim whitespace from values', () => {
      const query = {
        query: '  test value  ',
        colorType: '\tcolor\n',
      };

      const result = validateAndSanitizeQuery(query, allowedParams);

      expect(result.get('query')).toBe('test value');
      expect(result.get('colorType')).toBe('color');
    });

    it('should reject values exceeding maximum length', () => {
      const longValue = 'a'.repeat(MAX_PARAM_LENGTH + 1);
      const validValue = 'a'.repeat(MAX_PARAM_LENGTH);

      const query = {
        query: longValue,
        colorType: validValue,
      };

      const result = validateAndSanitizeQuery(query, allowedParams);

      expect(result.get('query')).toBeNull();
      expect(result.get('colorType')).toBe(validValue);
    });

    it('should validate limit parameter is within bounds', () => {
      const query1 = { limit: '100' };
      const result1 = validateAndSanitizeQuery(query1, allowedParams);
      expect(result1.get('limit')).toBe('100');

      const query2 = { limit: '0' };
      const result2 = validateAndSanitizeQuery(query2, allowedParams);
      expect(result2.get('limit')).toBeNull();

      const query3 = { limit: String(MAX_LIMIT + 1) };
      const result3 = validateAndSanitizeQuery(query3, allowedParams);
      expect(result3.get('limit')).toBeNull();

      const query4 = { limit: 'notanumber' };
      const result4 = validateAndSanitizeQuery(query4, allowedParams);
      expect(result4.get('limit')).toBeNull();
    });

    it('should validate page parameter is positive', () => {
      const query1 = { page: '1' };
      const result1 = validateAndSanitizeQuery(query1, allowedParams);
      expect(result1.get('page')).toBe('1');

      const query2 = { page: '0' };
      const result2 = validateAndSanitizeQuery(query2, allowedParams);
      expect(result2.get('page')).toBeNull();

      const query3 = { page: '-1' };
      const result3 = validateAndSanitizeQuery(query3, allowedParams);
      expect(result3.get('page')).toBeNull();
    });

    it('should handle array parameters by taking first value', () => {
      const query = {
        query: ['first', 'second', 'third'],
        colorType: ['only'],
      };

      const result = validateAndSanitizeQuery(query, allowedParams);

      expect(result.get('query')).toBe('first');
      expect(result.get('colorType')).toBe('only');
    });

    it('should skip empty string values', () => {
      const query = {
        query: '',
        colorType: '   ',
      };

      const result = validateAndSanitizeQuery(query, allowedParams);

      expect(result.get('query')).toBeNull();
      expect(result.get('colorType')).toBeNull();
    });

    it('should handle undefined values gracefully', () => {
      const query = {
        query: undefined,
        colorType: 'bw',
      };

      const result = validateAndSanitizeQuery(query, allowedParams);

      expect(result.get('query')).toBeNull();
      expect(result.get('colorType')).toBe('bw');
    });
  });

  describe('isValidNumericParam', () => {
    it('should return true for valid numbers within range', () => {
      expect(isValidNumericParam('50', MIN_LIMIT, MAX_LIMIT)).toBe(true);
      expect(isValidNumericParam('1', MIN_LIMIT, MAX_LIMIT)).toBe(true);
      expect(isValidNumericParam('1000', MIN_LIMIT, MAX_LIMIT)).toBe(true);
    });

    it('should return false for numbers outside range', () => {
      expect(isValidNumericParam('0', MIN_LIMIT, MAX_LIMIT)).toBe(false);
      expect(isValidNumericParam('1001', MIN_LIMIT, MAX_LIMIT)).toBe(false);
      expect(isValidNumericParam('-5', MIN_LIMIT, MAX_LIMIT)).toBe(false);
    });

    it('should return false for non-numeric values', () => {
      expect(isValidNumericParam('abc', MIN_LIMIT, MAX_LIMIT)).toBe(false);
      expect(isValidNumericParam('12abc', MIN_LIMIT, MAX_LIMIT)).toBe(false);
      expect(isValidNumericParam('', MIN_LIMIT, MAX_LIMIT)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidNumericParam(undefined, MIN_LIMIT, MAX_LIMIT)).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should have reasonable default values', () => {
      expect(MAX_PARAM_LENGTH).toBe(200);
      expect(MIN_LIMIT).toBe(1);
      expect(MAX_LIMIT).toBe(1000);
    });
  });
});
