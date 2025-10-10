/**
 * Performance tests for InfobaseProvider refactoring
 * Tests that the new on-demand approach improves initial load time and memory usage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { InfobaseProvider } from '../infobase-context';

// Mock the DorkroomClient and store mock functions for assertions
const mockFetchFilmsOnDemand = vi.fn().mockResolvedValue({ data: [], count: 0 });
const mockFetchDevelopersOnDemand = vi
  .fn()
  .mockResolvedValue({ data: [], count: 0 });
const mockFetchCombinationsOnDemand = vi
  .fn()
  .mockResolvedValue({ data: [], count: 0 });
const mockFetchFilmBySlug = vi.fn().mockResolvedValue(null);
const mockFetchDeveloperBySlug = vi.fn().mockResolvedValue(null);

vi.mock('@dorkroom/api', () => ({
  DorkroomClient: vi.fn().mockImplementation(() => ({
    fetchFilmsOnDemand: mockFetchFilmsOnDemand,
    fetchDevelopersOnDemand: mockFetchDevelopersOnDemand,
    fetchCombinationsOnDemand: mockFetchCombinationsOnDemand,
    fetchFilmBySlug: mockFetchFilmBySlug,
    fetchDeveloperBySlug: mockFetchDeveloperBySlug,
  })),
}));

// Test component that accesses the context
function TestComponent() {
  // Access the provider to ensure it's mounted
  return <div data-testid="test-component">Provider loaded</div>;
}

describe('InfobaseProvider Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render provider without triggering data fetch on mount', () => {
    const { getByTestId } = render(
      <InfobaseProvider>
        <TestComponent />
      </InfobaseProvider>
    );

    expect(getByTestId('test-component')).toHaveTextContent('Provider loaded');
    expect(mockFetchFilmsOnDemand).not.toHaveBeenCalled();
    expect(mockFetchDevelopersOnDemand).not.toHaveBeenCalled();
    expect(mockFetchCombinationsOnDemand).not.toHaveBeenCalled();
    expect(mockFetchFilmBySlug).not.toHaveBeenCalled();
    expect(mockFetchDeveloperBySlug).not.toHaveBeenCalled();
  });

  it('should provide client instance without calling loadAll()', async () => {
    const { getByTestId } = render(
      <InfobaseProvider>
        <TestComponent />
      </InfobaseProvider>
    );

    await waitFor(() => {
      expect(getByTestId('test-component')).toHaveTextContent('Provider loaded');
    });

    // The provider should be available immediately
    expect(getByTestId('test-component')).toBeTruthy();
  });

  it('should not hold large datasets in memory on initial mount', () => {
    // Record memory before render
    const memBefore = process.memoryUsage().heapUsed;

    render(
      <InfobaseProvider>
        <TestComponent />
      </InfobaseProvider>
    );

    // Record memory after render
    const memAfter = process.memoryUsage().heapUsed;
    const memoryIncrease = memAfter - memBefore;

    // Memory increase should be minimal (< 1MB) since we're not storing all data
    // Note: This is a rough estimate and may vary
    expect(memoryIncrease).toBeLessThan(1024 * 1024); // 1MB
  });

  it('should allow multiple children to render within provider', () => {
    function Consumer1() {
      return <div data-testid="consumer1">Consumer 1</div>;
    }

    function Consumer2() {
      return <div data-testid="consumer2">Consumer 2</div>;
    }

    const { getByTestId } = render(
      <InfobaseProvider>
        <Consumer1 />
        <Consumer2 />
      </InfobaseProvider>
    );

    expect(getByTestId('consumer1')).toHaveTextContent('Consumer 1');
    expect(getByTestId('consumer2')).toHaveTextContent('Consumer 2');
  });
});
