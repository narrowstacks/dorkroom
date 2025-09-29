import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = vi.fn();

// Mock AbortController
global.AbortController = class AbortController {
  signal: AbortSignal = {} as AbortSignal;
  abort() {
    // Mock implementation
  }
} as unknown as typeof AbortController;

// Set up global timeout for tests
beforeEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});
