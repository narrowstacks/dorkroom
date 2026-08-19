import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Clear localStorage before each test
beforeEach(() => {
  localStorageMock.clear();
});

// Mock CSS.supports for color-mix testing
Object.defineProperty(window, 'CSS', {
  value: {
    supports: (property: string, value: string) => {
      // Mock CSS color-mix support detection
      if (property === 'color' && value.includes('color-mix')) {
        return true;
      }
      return false;
    },
  },
  writable: true,
});
