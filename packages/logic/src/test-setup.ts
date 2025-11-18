import '@testing-library/jest-dom';

// Fix for "The current testing environment is not configured to support act(...)"
// @ts-expect-error - Global property
global.IS_REACT_ACT_ENVIRONMENT = true;

// Mock localStorage if not fully available
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: function (key: string) {
      return store[key] || null;
    },
    setItem: function (key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem: function (key: string) {
      delete store[key];
    },
    clear: function () {
      store = {};
    },
    key: function (index: number) {
        return Object.keys(store)[index] || null;
    },
    get length() {
        return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});
