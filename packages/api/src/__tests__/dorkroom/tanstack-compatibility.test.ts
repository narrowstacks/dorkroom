import {
  fetchCombinationsForQuery,
  fetchDevelopersForQuery,
  fetchFilmsForQuery,
} from '../../dorkroom/client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TanStack Query Compatibility', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('fetchFilmsForQuery should handle QueryFunctionContext', async () => {
    const mockContext = { signal: new AbortController().signal };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchFilmsForQuery(mockContext);

    expect(mockFetch).toHaveBeenCalledWith('/api/films', {
      signal: mockContext.signal,
      headers: undefined,
    });
  });

  it('fetchDevelopersForQuery should handle QueryFunctionContext', async () => {
    const mockContext = { signal: new AbortController().signal };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchDevelopersForQuery(mockContext);

    expect(mockFetch).toHaveBeenCalledWith('/api/developers', {
      signal: mockContext.signal,
      headers: undefined,
    });
  });

  it('fetchCombinationsForQuery should handle QueryFunctionContext', async () => {
    const mockContext = { signal: new AbortController().signal };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchCombinationsForQuery(mockContext);

    expect(mockFetch).toHaveBeenCalledWith('/api/combinations', {
      signal: mockContext.signal,
      headers: undefined,
    });
  });

  it('should work without context', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchFilmsForQuery();

    expect(mockFetch).toHaveBeenCalledWith('/api/films', {
      signal: undefined,
      headers: undefined,
    });
  });
});
