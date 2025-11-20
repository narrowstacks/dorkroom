import {
  fetchFilmsForQuery,
  fetchDevelopersForQuery,
  fetchCombinationsForQuery,
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

    expect(mockFetch).toHaveBeenCalledWith('https://dorkroom.art/api/films', {
      signal: mockContext.signal,
    });
  });

  it('fetchDevelopersForQuery should handle QueryFunctionContext', async () => {
    const mockContext = { signal: new AbortController().signal };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchDevelopersForQuery(mockContext);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://dorkroom.art/api/developers',
      {
        signal: mockContext.signal,
      }
    );
  });

  it('fetchCombinationsForQuery should handle QueryFunctionContext', async () => {
    const mockContext = { signal: new AbortController().signal };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchCombinationsForQuery(mockContext);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://dorkroom.art/api/combinations',
      {
        signal: mockContext.signal,
      }
    );
  });

  it('should work without context', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchFilmsForQuery();

    expect(mockFetch).toHaveBeenCalledWith('https://dorkroom.art/api/films', {
      signal: undefined,
    });
  });
});
