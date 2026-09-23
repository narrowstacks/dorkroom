/* ------------------------------------------------------------------ *
   input-validation.ts
   -------------------------------------------------------------
   Utility functions for input validation and parsing
   -------------------------------------------------------------
   Exports:
     - tryNumber: Enhanced numeric parser for complete numeric literals
     - parseDecimalInput: Locale-tolerant parser for typed decimals ("12,5")
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
 * Matches an optionally signed decimal with at most one separator, which may
 * be "." or ",". At least one digit is required somewhere; either side of the
 * separator may be empty (".5", "12.").
 */
const DECIMAL_INPUT_REGEX = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/;

/**
 * Parses a number typed into a text field, accepting either "." or "," as the
 * decimal separator. iOS decimal keyboards type "," in comma-decimal regions
 * (de_DE, fr_FR, pt_BR, …), where `parseFloat("12,5")` silently returns 12.
 *
 * Rules:
 * - Surrounding whitespace is trimmed.
 * - Exactly zero or one separator. Input with two separators ("1,234.5",
 *   "1.2.3") is NaN rather than a guess, because "," and "." each mean
 *   "thousands" in some locale.
 * - A leading "-" or "+" is allowed; callers that need a positive value must
 *   check the sign themselves.
 * - The whole string must be numeric: unlike `parseFloat`, "12abc" is NaN,
 *   and so are exponents ("1e3") and internal spaces.
 * - Mid-typing input with a trailing separator ("12." or "12,") parses to 12,
 *   matching `Number("12.")`, so a controlled field keeps its result while the
 *   user types the next digit. A bare separator or sign ("," / "-") is NaN.
 *
 * Only the number is normalised. Callers should keep and display the user's
 * string as typed.
 *
 * @param text - Raw text from an input field
 * @returns The parsed number, or NaN when the text is empty or not a number
 * @example
 * ```typescript
 * parseDecimalInput('12,5'); // 12.5
 * parseDecimalInput('12.5'); // 12.5
 * parseDecimalInput('12,'); // 12 (mid-typing)
 * parseDecimalInput('1,234.5'); // NaN (ambiguous)
 * parseDecimalInput('12abc'); // NaN
 * ```
 */
export const parseDecimalInput = (text: string): number => {
  const trimmed = text.trim();
  if (!DECIMAL_INPUT_REGEX.test(trimmed)) return Number.NaN;
  return Number(trimmed.replace(',', '.'));
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
