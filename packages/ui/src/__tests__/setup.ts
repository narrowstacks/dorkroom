import '@testing-library/jest-dom';
import { vi } from 'vitest';

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

// Mock useId for consistent test IDs
let mockIdCounter = 0;
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useId: () => `test-id-${++mockIdCounter}`,
  };
});

// Reset ID counter before each test
beforeEach(() => {
  mockIdCounter = 0;
});
