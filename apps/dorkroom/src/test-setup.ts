/**
 * Test setup for Vitest with jsdom environment.
 *
 * This file is loaded before each test via vite.config.ts setupFiles.
 */
import '@testing-library/jest-dom';

/**
 * Required for React 19 with Testing Library in jsdom.
 *
 * Without this, React warns: "The current testing environment is not configured
 * to support act(...)". This is still needed with React 19 + Testing Library v16
 * when using vitest's jsdom environment.
 *
 * @see https://react.dev/blog/2022/03/08/react-18-upgrade-guide#configuring-your-testing-environment
 */
// @ts-expect-error - Global property not typed
global.IS_REACT_ACT_ENVIRONMENT = true;

// Mock localStorage if not fully available
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});
