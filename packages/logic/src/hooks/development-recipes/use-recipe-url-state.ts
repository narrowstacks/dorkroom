import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Film, Developer, Combination } from '@dorkroom/api';
import {
  type RecipeUrlParams,
  type InitialUrlState,
  type UrlValidationConfig,
  type UrlValidationResult,
} from '../../types/development-recipes-url';
import { useCustomRecipeSharing } from './use-custom-recipe-sharing';
import type { ImportedCustomRecipe } from './use-custom-recipe-sharing';

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
];

const parseSearchParams = (searchParams: URLSearchParams): RecipeUrlParams => {
  const result: RecipeUrlParams = {};

  MANAGED_QUERY_KEYS.forEach((key) => {
    const value = searchParams.get(key);
    if (value) {
      (result as Record<string, string>)[key] = value;
    }
  });

  return result;
};

const getCurrentParams = (): RecipeUrlParams => {
  if (typeof window === 'undefined') {
    return {};
  }

  return parseSearchParams(new URLSearchParams(window.location.search));
};

export const slugToFilm = (slug: string, films: Film[]): Film | null => {
  if (!slug || !films.length) return null;
  return films.find((film) => film.slug === slug) || null;
};

export const filmToSlug = (film: Film | null): string => film?.slug || '';

export const slugToDeveloper = (
  slug: string,
  developers: Developer[]
): Developer | null => {
  if (!slug || !developers.length) return null;
  return developers.find((developer) => developer.slug === slug) || null;
};

export const developerToSlug = (developer: Developer | null): string =>
  developer?.slug || '';

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

export const useRecipeUrlState = (
  films: Film[],
  developers: Developer[],
  currentState: {
    selectedFilm: Film | null;
    selectedDeveloper: Developer | null;
    dilutionFilter: string;
    isoFilter: string;
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

    if (validation.sanitized.recipe) {
      state.recipeId = validation.sanitized.recipe;

      // Check if this is a shared API recipe (has film/developer params and source=share)
      const hasFilmDeveloper =
        validation.sanitized.film && validation.sanitized.developer;
      const isFromShare = validation.sanitized.source === 'share';
      if (hasFilmDeveloper && isFromShare) {
        state.isSharedApiRecipe = true;
      }
    }

    isInitializedRef.current = true;
    return state;
  }, [params, films, developers]);

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
        return;
      }

      setIsLoadingSharedRecipe(true);
      setSharedRecipeError(null);

      try {
        if (isCustomRecipeUrl(recipeId)) {
          const importedRecipe = decodeSharedCustomRecipe(recipeId);

          if (importedRecipe && importedRecipe.isValid) {
            setSharedCustomRecipe(importedRecipe.recipe);
            setSharedRecipe(null);
            // Remove recipe param from URL after successful load
            updateUrl({ recipe: '' });
          } else {
            setSharedRecipeError('Invalid custom recipe data');
            setSharedRecipe(null);
            setSharedCustomRecipe(null);
          }

          setIsLoadingSharedRecipe(false);
          return;
        }

        if (!recipesByUuid || recipesByUuid.size === 0) {
          setIsLoadingSharedRecipe(true);
          setSharedRecipeError(null);
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
      } catch (error) {
        setSharedRecipeError(
          error instanceof Error
            ? error.message
            : 'Failed to load shared recipe'
        );
        setSharedRecipe(null);
        setSharedCustomRecipe(null);
      } finally {
        setIsLoadingSharedRecipe(false);
      }
    };

    handleSharedRecipeLookup();
  }, [params, recipesByUuid, isCustomRecipeUrl, decodeSharedCustomRecipe]);

  const updateUrl = useCallback(
    (newParams: Partial<RecipeUrlParams>) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
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

    updateUrl(urlParams);
  }, [
    currentState.selectedFilm,
    currentState.selectedDeveloper,
    currentState.dilutionFilter,
    currentState.isoFilter,
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
