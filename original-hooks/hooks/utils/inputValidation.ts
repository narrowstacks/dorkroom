/* ------------------------------------------------------------------ *\
   inputValidation.ts
   -------------------------------------------------------------
   Utility functions for input validation and parsing
   -------------------------------------------------------------
   Exports:
     - tryNumber: Enhanced numeric parser for complete numeric literals
     - debounce: Debounce utility for input processing
     - requestIdleCallback: Polyfill for React Native
\* ------------------------------------------------------------------ */

// Enhanced numeric parser: returns a number only when the string represents a
// *complete* numeric literal (i.e. digits on both sides of the decimal if a
// decimal point is present). This avoids prematurely treating inputs like
// "0." as the number 0, which would otherwise drop the trailing dot and stop
// the user from continuing to type the decimal part on iOS.
export const tryNumber = (v: string): number | null => {
  // Matches optional leading minus, digits, optional fractional part with at
  // least one digit after the dot.
  const completeNumberRegex = /^-?\d+(?:\.\d+)?$/;

  if (!completeNumberRegex.test(v)) return null;

  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// Debounce utility for input processing
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// RequestIdleCallback polyfill for React Native
export const requestIdleCallback = (
  callback: IdleRequestCallback,
  options?: IdleRequestOptions,
) => {
  if (typeof window !== "undefined" && window.requestIdleCallback) {
    return window.requestIdleCallback(callback, options);
  }
  // Fallback for React Native
  return setTimeout(callback, 1);
};
