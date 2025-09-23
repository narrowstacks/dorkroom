const DEBUG_ENABLED =
  (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') ||
  (typeof window !== 'undefined' && (window as { __DORKROOM_DEBUG__?: boolean }).__DORKROOM_DEBUG__ === true);

export const debugLog: (...args: unknown[]) => void = DEBUG_ENABLED
  ? (...args) => console.log(...args)
  : () => { /* no-op */ };

export const debugWarn: (...args: unknown[]) => void = DEBUG_ENABLED
  ? (...args) => console.warn(...args)
  : () => { /* no-op */ };

export const debugError: (...args: unknown[]) => void = DEBUG_ENABLED
  ? (...args) => console.error(...args)
  : () => { /* no-op */ };

export type DebugLogger = {
  debug: typeof debugLog;
  warn: typeof debugWarn;
  error: typeof debugError;
};
