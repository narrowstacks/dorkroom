/**
 * Debounce delay for resize observations in milliseconds.
 * This prevents the virtualizer from recalculating on every frame during
 * rapid window resizing, which can cause browser lockups.
 */
export const RESIZE_DEBOUNCE_MS = 100;
