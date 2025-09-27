/* ------------------------------------------------------------------ *
   input-validation.ts
   -------------------------------------------------------------
   Utility functions for input validation and parsing
   -------------------------------------------------------------
   Exports:
     - tryNumber: Enhanced numeric parser for complete numeric literals
     - debounce: Debounce utility for input processing
\* ------------------------------------------------------------------ */

// Enhanced numeric parser: returns a number only when the string represents a
// *complete* numeric literal (i.e. digits on both sides of the decimal if a
// decimal point is present). This avoids prematurely treating inputs like
// "0." as the number 0, which would otherwise drop the trailing dot and stop
// the user from continuing to type the decimal part.
export const tryNumber = (v: string): number | null => {
  // Matches optional leading minus, digits, optional fractional part with at
  // least one digit after the dot.
  const completeNumberRegex = /^-?\d+(?:\.\d+)?$/;

  if (!completeNumberRegex.test(v)) return null;

  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// Debounce utility for input processing
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

// Validate if a string represents a valid in-progress number
export const isValidNumberInProgress = (v: string): boolean => {
  // Allow empty string, optional minus, digits, optional decimal point
  // But don't allow minus immediately followed by decimal point without digits
  return /^-?\d*\.?$/.test(v) && !/^-\.$/.test(v);
};

// Check if input is a complete numeric value or valid in-progress typing
export const isValidNumericInput = (v: string): boolean => {
  return tryNumber(v) !== null || isValidNumberInProgress(v);
};
