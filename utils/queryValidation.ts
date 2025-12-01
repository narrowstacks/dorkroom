/**
 * Shared query parameter validation utilities for API endpoints.
 * Provides security-hardened validation with length limits and type checking.
 */

// Maximum length for string parameters to prevent DoS attacks
export const MAX_PARAM_LENGTH = 200;

// Valid range for limit parameter
export const MIN_LIMIT = 1;
export const MAX_LIMIT = 1000;

// Numeric parameters that need special validation
const NUMERIC_PARAMS = ['limit', 'count', 'page'];

export interface QueryValidationOptions {
  /** Maximum length for string parameters (default: 200) */
  maxParamLength?: number;
  /** Maximum value for limit parameter (default: 1000) */
  maxLimit?: number;
  /** Minimum value for limit parameter (default: 1) */
  minLimit?: number;
}

/**
 * Validates and sanitizes query parameters for API endpoints.
 *
 * Security features:
 * - Only allows parameters in the allowlist
 * - Enforces maximum string length to prevent DoS
 * - Validates numeric parameters (limit, count, page) are within bounds
 * - Trims whitespace from values
 * - Handles array parameters by taking first value
 *
 * @param query - The incoming request query object
 * @param allowedParams - Array of allowed parameter names
 * @param options - Optional configuration for validation limits
 * @returns URLSearchParams containing only valid, sanitized parameters
 */
export function validateAndSanitizeQuery(
  query: Record<string, string | string[] | undefined>,
  allowedParams: string[],
  options: QueryValidationOptions = {}
): URLSearchParams {
  const {
    maxParamLength = MAX_PARAM_LENGTH,
    maxLimit = MAX_LIMIT,
    minLimit = MIN_LIMIT,
  } = options;

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    // Skip parameters not in allowlist
    if (!allowedParams.includes(key)) continue;

    // Extract string value from potential array
    let stringValue: string | undefined;
    if (typeof value === 'string') {
      stringValue = value;
    } else if (Array.isArray(value) && value.length > 0) {
      stringValue = value[0];
    }

    // Skip empty or non-string values
    if (typeof stringValue !== 'string') continue;

    const trimmed = stringValue.trim();

    // Skip empty trimmed values
    if (!trimmed) continue;

    // Enforce maximum length for all parameters
    if (trimmed.length > maxParamLength) continue;

    // Special validation for numeric parameters
    if (NUMERIC_PARAMS.includes(key)) {
      const numValue = parseInt(trimmed, 10);

      // Skip non-numeric values
      if (isNaN(numValue)) continue;

      // Enforce bounds for limit-type parameters
      if (key === 'limit' || key === 'count') {
        if (numValue < minLimit || numValue > maxLimit) continue;
      }

      // Page must be positive
      if (key === 'page' && numValue < 1) continue;

      params.set(key, String(numValue));
    } else {
      params.set(key, trimmed);
    }
  }

  return params;
}

/**
 * Type guard to check if a value is a valid numeric string within bounds.
 *
 * @param value - The value to check
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns true if value is a valid number within bounds
 */
export function isValidNumericParam(
  value: string | undefined,
  min: number,
  max: number
): boolean {
  if (!value) return false;
  const num = parseInt(value, 10);
  return !isNaN(num) && num >= min && num <= max;
}
