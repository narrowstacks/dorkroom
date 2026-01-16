/*
 * Determines if debug logging is enabled based on environment variables and global flags.
 * Debug logging is enabled in development environments or when explicitly enabled via
 * the global `__DORKROOM_DEBUG__` flag.
 */
const DEBUG_ENABLED =
  (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') ||
  (typeof window !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- checking for debug flag on window object
    (window as unknown as { __DORKROOM_DEBUG__?: boolean })
      .__DORKROOM_DEBUG__ === true);

/**
 * Debug logging function that outputs to console.log in development environments.
 * In production, this function becomes a no-op to avoid performance overhead.
 *
 * @public
 * @param args - Arguments to pass to console.log
 * @returns void
 *
 * @example
 * ```typescript
 * debugLog('User action:', userAction, { timestamp: Date.now() });
 * // Output in development: "User action: click { timestamp: 1234567890 }"
 * // No output in production
 * ```
 */
export const debugLog: (...args: unknown[]) => void = DEBUG_ENABLED
  ? (...args) => console.log(...args)
  : () => {
      // No-op in production
    };

/**
 * Debug warning function that outputs to console.warn in development environments.
 * In production, this function becomes a no-op to avoid performance overhead.
 *
 * @public
 * @param args - Arguments to pass to console.warn
 * @returns void
 *
 * @example
 * ```typescript
 * debugWarn('Deprecated API usage:', apiName, 'Use', newApiName, 'instead');
 * // Output in development with warning styling
 * // No output in production
 * ```
 */
export const debugWarn: (...args: unknown[]) => void = DEBUG_ENABLED
  ? (...args) => console.warn(...args)
  : () => {
      // No-op in production
    };

/**
 * Debug error function that outputs to console.error in development environments.
 * In production, this function becomes a no-op to avoid performance overhead.
 *
 * @public
 * @param args - Arguments to pass to console.error
 * @returns void
 *
 * @example
 * ```typescript
 * debugError('Calculation failed:', error.message, { input: calculationInput });
 * // Output in development with error styling
 * // No output in production
 * ```
 */
export const debugError: (...args: unknown[]) => void = DEBUG_ENABLED
  ? (...args) => console.error(...args)
  : () => {
      // No-op in production
    };
