/* ------------------------------------------------------------------ *
   input-validation.ts
   -------------------------------------------------------------
   Utility functions for input validation and parsing
   -------------------------------------------------------------
   Exports:
     - tryNumber: Enhanced numeric parser for complete numeric literals
     - debounce: Debounce utility for input processing
\* ------------------------------------------------------------------ */

/**
 * Enhanced numeric parser that returns a number only for complete numeric literals.
 * Prevents premature parsing of incomplete inputs like "0." which would lose the decimal point.
 * This allows users to continue typing decimal numbers without input interruption.
 *
 * @param v - String to parse as a number
 * @returns Parsed number if string represents a complete numeric literal, null otherwise
 * @example
 * ```typescript
 * const complete = tryNumber('15.5'); // 15.5
 * const incomplete = tryNumber('15.'); // null (incomplete decimal)
 * const invalid = tryNumber('abc'); // null
 * const negative = tryNumber('-42.5'); // -42.5
 * const integer = tryNumber('100'); // 100
 * ```
 */
export const tryNumber = (v: string): number | null => {
  // Matches optional leading minus, digits, optional fractional part with at
  // least one digit after the dot.
  const completeNumberRegex = /^-?\d+(?:\.\d+)?$/;

  if (!completeNumberRegex.test(v)) return null;

  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Debounce utility for input processing that delays function execution.
 * Prevents excessive function calls during rapid user input by waiting for a pause.
 *
 * @param func - Function to debounce
 * @param wait - Delay in milliseconds before executing the function
 * @returns Debounced version of the function
 * @example
 * ```typescript
 * const debouncedSave = debounce((value: string) => {
 *   console.log('Saving:', value);
 * }, 300);
 *
 * // Multiple rapid calls will only execute once after 300ms pause
 * debouncedSave('a');
 * debouncedSave('ab');
 * debouncedSave('abc'); // Only this will execute after 300ms
 * ```
 */
export const debounce = <A extends unknown[], R>(
  func: (...args: A) => R,
  wait: number
): ((...args: A) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: A) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Validates if a string represents a valid in-progress number entry.
 * Allows incomplete number inputs during typing (e.g., empty string, "5.", "-42").
 *
 * @param v - String to validate as in-progress number
 * @returns True if the string represents valid partial number input
 * @example
 * ```typescript
 * const empty = isValidNumberInProgress(''); // true (user starting to type)
 * const decimal = isValidNumberInProgress('5.'); // true (typing decimal)
 * const negative = isValidNumberInProgress('-'); // true (typing negative)
 * const invalid = isValidNumberInProgress('-.'); // false (invalid pattern)
 * const letters = isValidNumberInProgress('abc'); // false
 * ```
 */
export const isValidNumberInProgress = (v: string): boolean => {
  // Allow empty string, optional minus, digits, optional decimal point
  // But don't allow minus immediately followed by decimal point without digits
  return /^-?\d*\.?$/.test(v) && !/^-\.$/.test(v);
};

/**
 * Checks if input is either a complete numeric value or valid in-progress typing.
 * Combines validation for both complete numbers and partial number entry.
 *
 * @param v - String to validate as numeric input
 * @returns True if input is a valid complete number or valid partial number
 * @example
 * ```typescript
 * const complete = isValidNumericInput('42.5'); // true (complete number)
 * const partial = isValidNumericInput('42.'); // true (valid partial)
 * const starting = isValidNumericInput('-'); // true (starting negative)
 * const invalid = isValidNumericInput('abc'); // false
 * ```
 */
export const isValidNumericInput = (v: string): boolean => {
  return tryNumber(v) !== null || isValidNumberInProgress(v);
};
