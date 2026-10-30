// eslint-disable-next-line react-doctor/no-barrel-import -- this suite verifies the package barrel ('../index.js') re-exports everything; importing from source modules would defeat its purpose
import {
  apiClient,
  fetchCombinations,
  fetchDevelopers,
  fetchFilms,
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

  it('should export convenience functions bound to the shared client', async () => {
    const { films, developers, combinations } = spyOnClientFetches();

    await Promise.all([fetchFilms(), fetchDevelopers(), fetchCombinations()]);

    expect(films).toHaveBeenCalledTimes(1);
    expect(developers).toHaveBeenCalledTimes(1);
    expect(combinations).toHaveBeenCalledTimes(1);
  });

  it('should forward the TanStack Query signal from the convenience functions', async () => {
    const { films, developers, combinations } = spyOnClientFetches();
    const { signal } = new AbortController();

    await Promise.all([
      fetchFilms({ signal }),
      fetchDevelopers({ signal }),
      fetchCombinations({ signal }),
    ]);

    expect(films).toHaveBeenCalledWith({ signal });
    expect(developers).toHaveBeenCalledWith({ signal });
    expect(combinations).toHaveBeenCalledWith({ signal });
  });
});
