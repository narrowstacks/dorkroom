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
    details: () => [...queryKeys.films.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.films.details(), id] as const,
  },

  // Developers
  developers: {
    all: () => ['developers'] as const,
    lists: () => [...queryKeys.developers.all(), 'list'] as const,
    list: () => [...queryKeys.developers.lists()] as const,
    details: () => [...queryKeys.developers.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.developers.details(), id] as const,
  },

  // Combinations
  combinations: {
    all: () => ['combinations'] as const,
    lists: () => [...queryKeys.combinations.all(), 'list'] as const,
    list: () => [...queryKeys.combinations.lists()] as const,
    listByFilm: (filmId: string) =>
      [...queryKeys.combinations.lists(), 'film', filmId] as const,
    listByDeveloper: (developerId: string) =>
      [...queryKeys.combinations.lists(), 'developer', developerId] as const,
    details: () => [...queryKeys.combinations.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.combinations.details(), id] as const,
  },

  // Custom Recipes
  customRecipes: {
    all: () => ['customRecipes'] as const,
    lists: () => [...queryKeys.customRecipes.all(), 'list'] as const,
    list: () => [...queryKeys.customRecipes.lists()] as const,
    details: () => [...queryKeys.customRecipes.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.customRecipes.details(), id] as const,
  },

  // Filmdev Import
  filmdev: {
    all: () => ['filmdev'] as const,
    imports: () => [...queryKeys.filmdev.all(), 'import'] as const,
    import: (recipeId: string) =>
      [...queryKeys.filmdev.imports(), recipeId] as const,
  },
};
