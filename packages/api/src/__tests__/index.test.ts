// eslint-disable-next-line react-doctor/no-barrel-import -- this suite verifies the package barrel ('../index.js') re-exports everything; importing from source modules would defeat its purpose
import {
  apiClient,
  DorkroomApiClient,
  fetchCombinations,
  fetchCombinationsForQuery,
  fetchDevelopers,
  fetchDevelopersForQuery,
  fetchFilms,
  fetchFilmsForQuery,
  INTERNAL_API_BASE_URL,
  PUBLIC_API_BASE_URL,
} from '../index.js';

/** Spies on the singleton the convenience wrappers are supposed to delegate to. */
function spyOnClientFetches() {
  return {
    films: vi.spyOn(apiClient, 'fetchFilms').mockResolvedValue([]),
    developers: vi.spyOn(apiClient, 'fetchDevelopers').mockResolvedValue([]),
    combinations: vi
      .spyOn(apiClient, 'fetchCombinations')
      .mockResolvedValue([]),
  };
}

describe('API Package Exports', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export DorkroomApiClient', () => {
    expect(new DorkroomApiClient()).toBeInstanceOf(DorkroomApiClient);
  });

  it('should export apiClient instance', () => {
    expect(apiClient).toBeInstanceOf(DorkroomApiClient);
  });

  it('should export convenience functions bound to the shared client', async () => {
    const { films, developers, combinations } = spyOnClientFetches();

    await Promise.all([fetchFilms(), fetchDevelopers(), fetchCombinations()]);

    expect(films).toHaveBeenCalledTimes(1);
    expect(developers).toHaveBeenCalledTimes(1);
    expect(combinations).toHaveBeenCalledTimes(1);
  });

  it('should export TanStack Query compatible functions that forward the query signal', async () => {
    const { films, developers, combinations } = spyOnClientFetches();
    const { signal } = new AbortController();

    await Promise.all([
      fetchFilmsForQuery({ signal }),
      fetchDevelopersForQuery({ signal }),
      fetchCombinationsForQuery({ signal }),
    ]);

    expect(films).toHaveBeenCalledWith({ signal });
    expect(developers).toHaveBeenCalledWith({ signal });
    expect(combinations).toHaveBeenCalledWith({ signal });
  });

  it('should export PUBLIC_API_BASE_URL', () => {
    expect(PUBLIC_API_BASE_URL).toBe('https://api.dorkroom.art');
  });

  it('should export INTERNAL_API_BASE_URL', () => {
    expect(INTERNAL_API_BASE_URL).toBe('/api');
  });

  it('should export types', () => {
    // TypeScript types are exported and can be used for type safety
    // Film, Developer, Combination, etc. are all available from the module
    expect(DorkroomApiClient).toBeDefined();
  });
});
