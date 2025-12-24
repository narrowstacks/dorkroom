import type { Combination, Developer, Film } from '@dorkroom/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  InitialUrlState,
  RecipeUrlParams,
  UrlValidationConfig,
  UrlValidationResult,
} from '../../types/development-recipes-url';
import type { ImportedCustomRecipe } from './use-custom-recipe-sharing';
import { useCustomRecipeSharing } from './use-custom-recipe-sharing';

const VALIDATION_CONFIG: UrlValidationConfig = {
  maxSlugLength: 100,
  isoRange: { min: 6, max: 25600 },
  dilutionPatterns: [/^stock$/i, /^\d+:\d+$/, /^\d+\+\d+$/, /^\d+$/],
};

const MANAGED_QUERY_KEYS: Array<keyof RecipeUrlParams> = [
  'film',
  'developer',
  'dilution',
  'iso',
  'recipe',
  'source',
  'view',
];

/**
 * Convert managed URL search parameters into a recipe parameter object.
 *
 * @param searchParams - Source URLSearchParams instance to inspect
 * @returns Object containing managed query keys and their values
 */
const parseSearchParams = (searchParams: URLSearchParams): RecipeUrlParams => {
  const result: RecipeUrlParams = {};

  MANAGED_QUERY_KEYS.forEach((key) => {
    const value = searchParams.get(key);
    if (value) {
      if (key === 'source') {
        if (value === 'share') {
          result.source = 'share';
        }
      } else if (key === 'view') {
        if (value === 'favorites' || value === 'custom') {
          result.view = value;
        }
      } else {
        result[key as Exclude<keyof RecipeUrlParams, 'source' | 'view'>] =
          value;
      }
    }
  });

  return result;
};

/**
 * Read the current browser URL and extract managed query parameters.
 *
 * @returns Current recipe URL parameters or an empty object during SSR
 */
const getCurrentParams = (): RecipeUrlParams => {
  if (typeof window === 'undefined') {
    return {};
  }

  return parseSearchParams(new URLSearchParams(window.location.search));
};

/**
 * Find a film entity by slug helper.
 *
 * @param slug - Film slug from the URL
 * @param films - Available film collection to search
 * @returns Matching film or null when not found
 */
export const slugToFilm = (slug: string, films: Film[]): Film | null => {
  if (!slug || !films.length) return null;
  return films.find((film) => film.slug === slug) || null;
};

/**
 * Convert a film entity to its slug string.
 *
 * @param film - Film entity to convert
 * @returns Slug string or empty string when no film is provided
 */
export const filmToSlug = (film: Film | null): string => film?.slug || '';

/**
 * Find a developer entity by slug helper.
 *
 * @param slug - Developer slug from the URL
 * @param developers - Available developer collection to search
 * @returns Matching developer or null when not found
 */
export const slugToDeveloper = (
  slug: string,
  developers: Developer[]
): Developer | null => {
  if (!slug || !developers.length) return null;
  return developers.find((developer) => developer.slug === slug) || null;
};

/**
 * Convert a developer entity to its slug string.
 *
 * @param developer - Developer entity to convert
 * @returns Slug string or empty string when no developer is provided
 */
export const developerToSlug = (developer: Developer | null): string =>
  developer?.slug || '';

/**
 * Validate and sanitize recipe URL parameters against expected formats.
 *
 * @param params - Raw parameters extracted from the URL
 * @returns Validation result with sanitized values and error details
 */
export const validateUrlParams = (
  params: RecipeUrlParams
): UrlValidationResult => {
  const errors: string[] = [];
  const sanitized: RecipeUrlParams = {};

  if (params.film) {
    if (params.film.length > VALIDATION_CONFIG.maxSlugLength) {
      errors.push('Film slug too long');
    } else if (/^[a-z0-9-]+$/.test(params.film)) {
      sanitized.film = params.film;
    } else {
      errors.push('Invalid film slug format');
    }
  }

  if (params.developer) {
    if (params.developer.length > VALIDATION_CONFIG.maxSlugLength) {
      errors.push('Developer slug too long');
    } else if (/^[a-z0-9-]+$/.test(params.developer)) {
      sanitized.developer = params.developer;
    } else {
      errors.push('Invalid developer slug format');
    }
  }

  if (params.iso) {
    const isoNum = parseInt(params.iso, 10);
    if (
      Number.isNaN(isoNum) ||
      isoNum < VALIDATION_CONFIG.isoRange.min ||
      isoNum > VALIDATION_CONFIG.isoRange.max
    ) {
      errors.push('Invalid ISO value');
    } else {
      sanitized.iso = params.iso;
    }
  }

  if (params.dilution) {
    const isValidDilution = VALIDATION_CONFIG.dilutionPatterns.some((pattern) =>
      pattern.test(params.dilution as string)
    );
    if (isValidDilution) {
      sanitized.dilution = params.dilution;
    } else {
      errors.push('Invalid dilution format');
    }
  }

  if (params.recipe) {
    if (
      params.recipe.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      ) ||
      params.recipe.length > 20
    ) {
      sanitized.recipe = params.recipe;
    } else {
      errors.push('Invalid recipe format');
    }
  }

  if (params.source === 'share') {
    sanitized.source = 'share';
  }

  if (params.view) {
    if (params.view === 'favorites' || params.view === 'custom') {
      sanitized.view = params.view;
    } else {
      errors.push('Invalid view format');
    }
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors,
  };
};

export interface UseRecipeUrlStateReturn {
  initialUrlState: InitialUrlState & {
    sharedRecipe?: Combination;
    sharedCustomRecipe?: ImportedCustomRecipe['recipe'];
    isLoadingSharedRecipe?: boolean;
    sharedRecipeError?: string;
    hasSharedRecipe?: boolean;
    hasSharedCustomRecipe?: boolean;
  };
  updateUrl: (newParams: Partial<RecipeUrlParams>) => void;
  hasUrlState: boolean;
  sharedRecipe: Combination | null;
  sharedCustomRecipe: ImportedCustomRecipe['recipe'] | null;
  isLoadingSharedRecipe: boolean;
  sharedRecipeError: string | null;
  hasSharedRecipe: boolean;
  hasSharedCustomRecipe: boolean;
}

/**
 * Hook that keeps development recipe state synchronized with URL parameters.
 * Validates parameters, resolves shared recipes, and exposes helpers for updates.
 *
 * @param films - Available film list used to resolve slug selections
 * @param developers - Available developer list used to resolve slug selections
 * @param currentState - Current selection/filter state from the UI
 * @param recipesByUuid - Optional map of recipes for lookup when sharing
 * @returns URL-driven state values, helpers, and metadata about shared recipes
 */
export const useRecipeUrlState = (
  films: Film[],
  developers: Developer[],
  currentState: {
    selectedFilm: Film | null;
    selectedDeveloper: Developer | null;
    dilutionFilter: string;
    isoFilter: string;
    favoritesOnly?: boolean;
    customRecipeFilter?: string;
    selectedRecipeId?: string | null;
  },
  recipesByUuid?: Map<string, Combination>
): UseRecipeUrlStateReturn => {
  const [params, setParams] = useState<RecipeUrlParams>(() =>
    getCurrentParams()
  );
  const isInitializedRef = useRef(false);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handlePopState = () => {
      setParams(getCurrentParams());
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const { decodeSharedCustomRecipe, isCustomRecipeUrl } =
    useCustomRecipeSharing();

  const [sharedRecipe, setSharedRecipe] = useState<Combination | null>(null);
  const [sharedCustomRecipe, setSharedCustomRecipe] = useState<
    ImportedCustomRecipe['recipe'] | null
  >(null);
  const [isLoadingSharedRecipe, setIsLoadingSharedRecipe] = useState(false);
  const [sharedRecipeError, setSharedRecipeError] = useState<string | null>(
    null
  );
  const isProcessingSharedRecipeRef = useRef(false);

  const initialUrlState = useMemo<InitialUrlState>(() => {
    if (!films.length || !developers.length) {
      return {};
    }

    if (isInitializedRef.current) {
      const hasValidParams = MANAGED_QUERY_KEYS.some((key) => params[key]);
      if (!hasValidParams) {
        return {};
      }
    }

    const validation = validateUrlParams(params);
    if (!validation.isValid) {
      return {};
    }

    const state: InitialUrlState = { fromUrl: true };

    if (validation.sanitized.film) {
      const film = slugToFilm(validation.sanitized.film, films);
      if (film) {
        state.selectedFilm = film;
      }
    }

    if (validation.sanitized.developer) {
      const developer = slugToDeveloper(
        validation.sanitized.developer,
        developers
      );
      if (developer) {
        state.selectedDeveloper = developer;
      }
    }

    if (validation.sanitized.dilution) {
      state.dilutionFilter = validation.sanitized.dilution;
    }

    if (validation.sanitized.iso) {
      state.isoFilter = validation.sanitized.iso;
    }

    if (validation.sanitized.view) {
      state.view = validation.sanitized.view;
    }

    if (validation.sanitized.recipe) {
      state.recipeId = validation.sanitized.recipe;

      const isFromShare = validation.sanitized.source === 'share';

      if (isFromShare) {
        // Check if this is a shared API recipe (has film/developer params and source=share)
        const hasFilmDeveloper =
          validation.sanitized.film && validation.sanitized.developer;
        if (hasFilmDeveloper) {
          state.isSharedApiRecipe = true;
        }
      } else {
        // Recipe in URL without source=share means direct selection (bookmark/link)
        state.isDirectSelection = true;
      }
    }

    isInitializedRef.current = true;
    return state;
  }, [params, films, developers]);

  const updateUrl = useCallback(
    (newParams: Partial<RecipeUrlParams>) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }

      updateTimeoutRef.current = setTimeout(() => {
        // Clear the timeout ref immediately to prevent duplicate cleanup
        updateTimeoutRef.current = null;

        if (!isInitializedRef.current || typeof window === 'undefined') {
          return;
        }

        const searchParams = new URLSearchParams(window.location.search);

        MANAGED_QUERY_KEYS.forEach((key) => {
          searchParams.delete(key);
        });

        const mergedParams: RecipeUrlParams = { ...params, ...newParams };

        Object.entries(mergedParams).forEach(([key, value]) => {
          if (value) {
            searchParams.set(key, value as string);
          }
        });

        const searchString = searchParams.toString();
        const newUrl = `${window.location.pathname}${
          searchString ? `?${searchString}` : ''
        }${window.location.hash ?? ''}`;
        window.history.replaceState(null, '', newUrl);
        setParams(parseSearchParams(searchParams));
      }, 300);
    },
    [params]
  );

  useEffect(() => {
    const handleSharedRecipeLookup = async () => {
      const validation = validateUrlParams(params);
      const recipeId = validation.sanitized.recipe;
      const isFromShare = validation.sanitized.source === 'share';

      if (!recipeId || !isFromShare) {
        setSharedRecipe(null);
        setSharedCustomRecipe(null);
        setIsLoadingSharedRecipe(false);
        setSharedRecipeError(null);
        isProcessingSharedRecipeRef.current = false;
        return;
      }

      // Prevent infinite loop: don't process if we're already processing
      if (isProcessingSharedRecipeRef.current) {
        return;
      }

      isProcessingSharedRecipeRef.current = true;
      setIsLoadingSharedRecipe(true);
      setSharedRecipeError(null);

      try {
        if (isCustomRecipeUrl(recipeId)) {
          const importedRecipe = decodeSharedCustomRecipe(recipeId);

          if (importedRecipe?.isValid) {
            setSharedCustomRecipe(importedRecipe.recipe);
            setSharedRecipe(null);
            // Remove recipe param from URL after successful load
            updateUrl({ recipe: '' });
          } else {
            setSharedRecipeError('Invalid custom recipe data');
            setSharedRecipe(null);
            setSharedCustomRecipe(null);
          }
        } else {
          // Standard recipe lookup
          if (!recipesByUuid || recipesByUuid.size === 0) {
            // Wait for recipes to load - keep loading state true
            return;
          }

          if (recipesByUuid.has(recipeId)) {
            setSharedRecipe(recipesByUuid.get(recipeId) ?? null);
            setSharedCustomRecipe(null);
            // Remove recipe param from URL after successful load
            updateUrl({ recipe: '' });
          } else {
            setSharedRecipeError(
              `Recipe with ID ${recipeId.substring(0, 20)}... not found`
            );
            setSharedRecipe(null);
            setSharedCustomRecipe(null);
          }
        }
      } catch (error) {
        setSharedRecipeError(
          error instanceof Error
            ? error.message
            : 'Failed to load shared recipe'
        );
        setSharedRecipe(null);
        setSharedCustomRecipe(null);
      } finally {
        // Only turn off loading if we are NOT waiting for recipes
        // If we are waiting for recipes (standard recipe ID but no recipes loaded yet),
        // we want to keep the loading state active until the recipes load and this effect re-runs
        const isWaitingForRecipes =
          !isCustomRecipeUrl(recipeId) &&
          (!recipesByUuid || recipesByUuid.size === 0);

        if (!isWaitingForRecipes) {
          setIsLoadingSharedRecipe(false);
        }
        isProcessingSharedRecipeRef.current = false;
      }
    };

    handleSharedRecipeLookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params,
    recipesByUuid,
    isCustomRecipeUrl,
    decodeSharedCustomRecipe,
    updateUrl,
  ]);

  useEffect(() => {
    if (!isInitializedRef.current) {
      return;
    }

    const urlParams: RecipeUrlParams = {};

    if (currentState.selectedFilm) {
      urlParams.film = filmToSlug(currentState.selectedFilm);
    } else {
      // Explicitly clear film from URL when unselected
      urlParams.film = '';
    }

    if (currentState.selectedDeveloper) {
      urlParams.developer = developerToSlug(currentState.selectedDeveloper);
    } else {
      // Explicitly clear developer from URL when unselected
      urlParams.developer = '';
    }

    if (currentState.dilutionFilter) {
      urlParams.dilution = currentState.dilutionFilter;
    } else {
      // Explicitly clear dilution from URL when cleared
      urlParams.dilution = '';
    }

    if (currentState.isoFilter) {
      urlParams.iso = currentState.isoFilter;
    } else {
      // Explicitly clear iso from URL when cleared
      urlParams.iso = '';
    }

    if (currentState.favoritesOnly) {
      urlParams.view = 'favorites';
    } else if (currentState.customRecipeFilter === 'only-custom') {
      urlParams.view = 'custom';
    } else {
      urlParams.view = undefined;
    }

    // Sync selected recipe to URL (for direct viewing, not sharing)
    if (currentState.selectedRecipeId) {
      urlParams.recipe = currentState.selectedRecipeId;
      // Clear source when it's a direct selection, not a share
      urlParams.source = undefined;
    } else {
      // Clear recipe from URL when panel is closed
      urlParams.recipe = '';
      urlParams.source = undefined;
    }

    updateUrl(urlParams);
  }, [
    currentState.selectedFilm,
    currentState.selectedDeveloper,
    currentState.dilutionFilter,
    currentState.isoFilter,
    currentState.favoritesOnly,
    currentState.customRecipeFilter,
    currentState.selectedRecipeId,
    updateUrl,
  ]);

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const enhancedUrlState = useMemo(() => {
    return {
      ...initialUrlState,
      sharedRecipe: sharedRecipe || undefined,
      sharedCustomRecipe: sharedCustomRecipe || undefined,
      isLoadingSharedRecipe,
      sharedRecipeError: sharedRecipeError || undefined,
      hasSharedRecipe:
        !!initialUrlState.recipeId &&
        params.source === 'share' &&
        !sharedCustomRecipe,
      hasSharedCustomRecipe:
        !!initialUrlState.recipeId &&
        params.source === 'share' &&
        !!sharedCustomRecipe,
    };
  }, [
    initialUrlState,
    sharedRecipe,
    sharedCustomRecipe,
    isLoadingSharedRecipe,
    sharedRecipeError,
    params.source,
  ]);

  const hasUrlState =
    Object.keys(initialUrlState).length > 0 ||
    !!sharedRecipe ||
    !!sharedCustomRecipe;

  return {
    initialUrlState: enhancedUrlState,
    updateUrl,
    hasUrlState,
    sharedRecipe,
    sharedCustomRecipe,
    isLoadingSharedRecipe,
    sharedRecipeError,
    hasSharedRecipe: enhancedUrlState.hasSharedRecipe ?? false,
    hasSharedCustomRecipe: enhancedUrlState.hasSharedCustomRecipe ?? false,
  };
};
