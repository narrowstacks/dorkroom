/**
 * True when a DOM `window` is present. Read through `globalThis` because the
 * DOM lib types `window` as always defined.
 */
export const isBrowser = (): boolean => globalThis.window !== undefined;
