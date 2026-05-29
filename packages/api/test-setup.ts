import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = vi.fn();

// NOTE: AbortController is intentionally NOT mocked — the jsdom/node
// environment provides a spec-compliant native one. Vitest 4 attaches an
// abort listener to each test's signal, so a stubbed AbortController whose
// `signal` lacks `addEventListener` crashes the runner.

// Set up global timeout for tests
beforeEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});
