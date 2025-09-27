import '@testing-library/jest-dom';
import { vi } from 'vitest';

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
