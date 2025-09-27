const DEBUG_ENABLED =
  (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') ||
  (typeof window !== 'undefined' &&
    (window as unknown as { __DORKROOM_DEBUG__?: boolean })
      .__DORKROOM_DEBUG__ === true);

export const debugLog: (...args: unknown[]) => void = DEBUG_ENABLED
  ? (...args) => console.log(...args)
  : () => {
      // No-op in production
    };

export const debugWarn: (...args: unknown[]) => void = DEBUG_ENABLED
  ? (...args) => console.warn(...args)
  : () => {
      // No-op in production
    };

export const debugError: (...args: unknown[]) => void = DEBUG_ENABLED
  ? (...args) => console.error(...args)
  : () => {
      // No-op in production
    };
