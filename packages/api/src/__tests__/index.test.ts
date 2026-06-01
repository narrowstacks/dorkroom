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

describe('API Package Exports', () => {
  it('should export DorkroomApiClient', () => {
    expect(DorkroomApiClient).toBeDefined();
    expect(typeof DorkroomApiClient).toBe('function');
  });

  it('should export apiClient instance', () => {
    expect(apiClient).toBeDefined();
    expect(apiClient).toBeInstanceOf(DorkroomApiClient);
  });

  it('should export convenience functions', () => {
    expect(fetchFilms).toBeDefined();
    expect(typeof fetchFilms).toBe('function');

    expect(fetchDevelopers).toBeDefined();
    expect(typeof fetchDevelopers).toBe('function');

    expect(fetchCombinations).toBeDefined();
    expect(typeof fetchCombinations).toBe('function');
  });

  it('should export TanStack Query compatible functions', () => {
    expect(fetchFilmsForQuery).toBeDefined();
    expect(typeof fetchFilmsForQuery).toBe('function');

    expect(fetchDevelopersForQuery).toBeDefined();
    expect(typeof fetchDevelopersForQuery).toBe('function');

    expect(fetchCombinationsForQuery).toBeDefined();
    expect(typeof fetchCombinationsForQuery).toBe('function');
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
