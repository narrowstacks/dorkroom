/**
 * Query key factory for TanStack Query
 * Provides type-safe and organized query keys for all API data
 */

export const queryKeys = {
  // Films
  films: {
    all: () => ['films'] as const,
    lists: () => [...queryKeys.films.all(), 'list'] as const,
    list: () => [...queryKeys.films.lists()] as const,
  },

  // Developers
  developers: {
    all: () => ['developers'] as const,
    lists: () => [...queryKeys.developers.all(), 'list'] as const,
    list: () => [...queryKeys.developers.lists()] as const,
  },

  // Combinations
  combinations: {
    all: () => ['combinations'] as const,
    lists: () => [...queryKeys.combinations.all(), 'list'] as const,
    list: () => [...queryKeys.combinations.lists()] as const,
  },

  // Stats
  stats: {
    all: () => ['stats'] as const,
    counts: () => [...queryKeys.stats.all(), 'counts'] as const,
  },
};
