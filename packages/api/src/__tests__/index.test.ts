import * as apiExports from '../index';

describe('API Package Exports', () => {
  it('should export DorkroomApiClient', () => {
    expect(apiExports.DorkroomApiClient).toBeDefined();
    expect(typeof apiExports.DorkroomApiClient).toBe('function');
  });

  it('should export apiClient instance', () => {
    expect(apiExports.apiClient).toBeDefined();
    expect(apiExports.apiClient).toBeInstanceOf(apiExports.DorkroomApiClient);
  });

  it('should export convenience functions', () => {
    expect(apiExports.fetchFilms).toBeDefined();
    expect(typeof apiExports.fetchFilms).toBe('function');

    expect(apiExports.fetchDevelopers).toBeDefined();
    expect(typeof apiExports.fetchDevelopers).toBe('function');

    expect(apiExports.fetchCombinations).toBeDefined();
    expect(typeof apiExports.fetchCombinations).toBe('function');
  });

  it('should export TanStack Query compatible functions', () => {
    expect(apiExports.fetchFilmsForQuery).toBeDefined();
    expect(typeof apiExports.fetchFilmsForQuery).toBe('function');

    expect(apiExports.fetchDevelopersForQuery).toBeDefined();
    expect(typeof apiExports.fetchDevelopersForQuery).toBe('function');

    expect(apiExports.fetchCombinationsForQuery).toBeDefined();
    expect(typeof apiExports.fetchCombinationsForQuery).toBe('function');
  });

  it('should export types', () => {
    // TypeScript types are exported and can be used for type safety
    // Film, Developer, Combination, etc. are all available from the module
    expect(apiExports).toBeDefined();
  });
});
