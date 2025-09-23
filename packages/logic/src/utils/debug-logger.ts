const DEBUG_ENABLED =
  (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') ||
  (typeof window !== 'undefined' &&
    (window as any).__DORKROOM_DEBUG__ === true);

export const debugLog: (...args: unknown[]) => void = DEBUG_ENABLED
  ? (...args) => console.log(...args)
  : () => {};

export const debugWarn: (...args: unknown[]) => void = DEBUG_ENABLED
  ? (...args) => console.warn(...args)
  : () => {};

export const debugError: (...args: unknown[]) => void = DEBUG_ENABLED
  ? (...args) => console.error(...args)
  : () => {};
