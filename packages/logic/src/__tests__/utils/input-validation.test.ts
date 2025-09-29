import {
  tryNumber,
  debounce,
  isValidNumberInProgress,
  isValidNumericInput,
} from '../../utils/input-validation';

describe('input validation utilities', () => {
  describe('tryNumber', () => {
    it('should parse complete valid numbers', () => {
      expect(tryNumber('123')).toBe(123);
      expect(tryNumber('123.45')).toBe(123.45);
      expect(tryNumber('-123.45')).toBe(-123.45);
      expect(tryNumber('0')).toBe(0);
      expect(tryNumber('0.5')).toBe(0.5);
    });

    it('should return null for incomplete numbers', () => {
      expect(tryNumber('123.')).toBeNull();
      expect(tryNumber('.')).toBeNull();
      expect(tryNumber('-')).toBeNull();
      expect(tryNumber('')).toBeNull();
    });

    it('should return null for invalid formats', () => {
      expect(tryNumber('abc')).toBeNull();
      expect(tryNumber('12.34.56')).toBeNull();
      expect(tryNumber('12-34')).toBeNull();
      expect(tryNumber('12 34')).toBeNull();
    });

    it('should handle edge cases', () => {
      expect(tryNumber('Infinity')).toBeNull();
      expect(tryNumber('NaN')).toBeNull();
      expect(tryNumber('+123')).toBeNull(); // doesn't match regex
    });

    it('should handle leading zeros', () => {
      expect(tryNumber('0123')).toBe(123);
      expect(tryNumber('00.5')).toBe(0.5);
    });

    it('should handle very large and small numbers', () => {
      expect(tryNumber('999999999999')).toBe(999999999999);
      expect(tryNumber('0.000001')).toBe(0.000001);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should delay function execution', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should reset delay on multiple calls', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      vi.advanceTimersByTime(50);
      debouncedFn(); // resets timer
      vi.advanceTimersByTime(50);
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to the debounced function', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should use latest arguments when called multiple times', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('first');
      debouncedFn('second');
      vi.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('second');
    });
  });

  describe('isValidNumberInProgress', () => {
    it('should accept valid in-progress numbers', () => {
      expect(isValidNumberInProgress('')).toBe(true);
      expect(isValidNumberInProgress('1')).toBe(true);
      expect(isValidNumberInProgress('12')).toBe(true);
      expect(isValidNumberInProgress('12.')).toBe(true);
      expect(isValidNumberInProgress('-')).toBe(true);
      expect(isValidNumberInProgress('-1')).toBe(true);
      expect(isValidNumberInProgress('-12.')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidNumberInProgress('12.34')).toBe(false);
      expect(isValidNumberInProgress('abc')).toBe(false);
      expect(isValidNumberInProgress('1.2.3')).toBe(false);
      expect(isValidNumberInProgress('1-2')).toBe(false);
      expect(isValidNumberInProgress('1 2')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidNumberInProgress('.')).toBe(true);
      expect(isValidNumberInProgress('-.')).toBe(false);
      expect(isValidNumberInProgress('--')).toBe(false);
    });
  });

  describe('isValidNumericInput', () => {
    it('should accept complete valid numbers', () => {
      expect(isValidNumericInput('123')).toBe(true);
      expect(isValidNumericInput('123.45')).toBe(true);
      expect(isValidNumericInput('-123.45')).toBe(true);
    });

    it('should accept valid in-progress numbers', () => {
      expect(isValidNumericInput('')).toBe(true);
      expect(isValidNumericInput('123.')).toBe(true);
      expect(isValidNumericInput('-')).toBe(true);
      expect(isValidNumericInput('-123.')).toBe(true);
    });

    it('should reject invalid inputs', () => {
      expect(isValidNumericInput('abc')).toBe(false);
      expect(isValidNumericInput('12.34.56')).toBe(false);
      expect(isValidNumericInput('12-34')).toBe(false);
    });

    it('should be consistent with tryNumber and isValidNumberInProgress', () => {
      const testInputs = ['123', '123.', '123.45', 'abc', '', '-', '12.34.56'];

      testInputs.forEach((input) => {
        const isValid = isValidNumericInput(input);
        const hasNumber = tryNumber(input) !== null;
        const isInProgress = isValidNumberInProgress(input);

        expect(isValid).toBe(hasNumber || isInProgress);
      });
    });
  });
});
