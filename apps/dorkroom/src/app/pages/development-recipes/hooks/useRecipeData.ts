import type { Combination, Developer, Film } from '@dorkroom/api';
import type { CustomRecipe } from '@dorkroom/logic';
import {
  createCombinationFromCustomRecipe,
  debugWarn,
  getCustomRecipeDeveloper,
  getCustomRecipeFilm,
} from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { useMemo } from 'react';

type SharedCustomRecipe =
  CustomRecipe | Omit<CustomRecipe, 'id' | 'dateCreated' | 'dateModified'>;

type SelectOption = { label: string; value: string };

export const toFilmOptions = (films: Film[]): SelectOption[] => [
  { label: 'Select film', value: '' },
  ...films.map((film) => ({
    label: `${film.brand} ${film.name}`,
    value: film.uuid,
  })),
];

export const toDeveloperOptions = (developers: Developer[]): SelectOption[] => [
  { label: 'Select developer', value: '' },
  ...developers.map((developer) => ({
    label: `${developer.manufacturer} ${developer.name}`,
    value: developer.uuid,
  })),
];

/**
 * Converts a custom recipe to a Combination, or returns null when its values
 * are out of range. Recipes saved before validation existed (#323) can still
 * sit in localStorage; skipping them keeps one bad entry from crashing the
 * whole page during render.
 */
function toCombinationOrNull(
  recipe:
    CustomRecipe | Omit<CustomRecipe, 'id' | 'dateCreated' | 'dateModified'>,
  uuid?: string
): Combination | null {
  try {
    return createCombinationFromCustomRecipe(recipe, uuid);
  } catch (error) {
    debugWarn('Skipping invalid custom recipe:', recipe.name, error);
    return null;
  }
}

/**
 * Every recipe the page can open by id: the whole API catalogue by uuid,
 * overlaid with the user's custom recipes by id.
 *
 * Built from the unfiltered catalogue on purpose. A recipe link must open
 * whatever the URL's search or filters are: `?q=<other>&recipe=<uuid>`
 * excludes that recipe from the filtered list, and resolving against it
 * meant the link never opened and `recipe=` was dropped (#508).
 *
 * It depends only on data available before the URL state hook runs, which
 * needs it to resolve a shared recipe link (#288).
 */
export function useRecipesByUuid(
  allCombinations: Combination[],
  customRecipes: CustomRecipe[]
): Map<string, Combination> {
  // Split so a catalogue refetch doesn't reprocess custom recipes (which have
  // validation overhead), and vice versa.
  const apiRecipesMap = useMemo(() => {
    const map = new Map<string, Combination>();
    for (const combo of allCombinations) {
      if (combo.uuid) {
        map.set(combo.uuid, combo);
      }
    }
    return map;
  }, [allCombinations]);

  const customRecipesMap = useMemo(() => {
    const map = new Map<string, Combination>();
    // Add custom recipes (convert to Combination format)
    for (const recipe of customRecipes) {
      const combination = toCombinationOrNull(recipe);
      if (combination) {
        map.set(recipe.id, combination);
      }
    }
    return map;
  }, [customRecipes]);

  return useMemo(() => {
    // Start with API recipes
    const map = new Map(apiRecipesMap);
    // Overlay custom recipes (they take precedence if IDs collide, though they shouldn't)
    for (const [id, combo] of customRecipesMap) {
      map.set(id, combo);
    }
    return map;
  }, [apiRecipesMap, customRecipesMap]);
}

/**
 * A `?recipe=<encoded>` custom recipe as a view, with its film and developer
 * taken from the shared data where it brings its own.
 */
export function useSharedCustomRecipeView(
  sharedCustomRecipe: SharedCustomRecipe | null,
  getFilmById: (id: string) => Film | undefined,
  getDeveloperById: (id: string) => Developer | undefined
): DevelopmentCombinationView | null {
  // Memoize expensive shared custom recipe conversion
  return useMemo(() => {
    if (!sharedCustomRecipe) {
      return null;
    }

    // Convert CustomRecipe to DevelopmentCombinationView
    const combination = toCombinationOrNull(
      sharedCustomRecipe,
      'shared-custom'
    );
    if (!combination) {
      return null;
    }

    // Get film and developer (either from database or custom data)
    let film: Film | undefined;
    let developer: Developer | undefined;

    if (sharedCustomRecipe.isCustomFilm && sharedCustomRecipe.customFilm) {
      // Create a temporary film object from custom data
      film = {
        id: 0,
        uuid: 'custom_film_temp',
        slug: 'custom-film',
        brand: sharedCustomRecipe.customFilm.brand,
        name: sharedCustomRecipe.customFilm.name,
        colorType: sharedCustomRecipe.customFilm.colorType,
        isoSpeed: sharedCustomRecipe.customFilm.isoSpeed,
        grainStructure: sharedCustomRecipe.customFilm.grainStructure || null,
        description: sharedCustomRecipe.customFilm.description || '',
        manufacturerNotes: null,
        reciprocityFailure: null,
        discontinued: false,
        staticImageUrl: null,
        imageCredit: null,
        imageSourceUrl: null,
        aliases: [],
        baseFilmSlug: null,
        dateAdded: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      film = getFilmById(sharedCustomRecipe.filmId);
    }

    if (
      sharedCustomRecipe.isCustomDeveloper &&
      sharedCustomRecipe.customDeveloper
    ) {
      // Create a temporary developer object from custom data
      developer = {
        id: 0,
        uuid: 'custom_dev_temp',
        slug: 'custom-developer',
        name: sharedCustomRecipe.customDeveloper.name,
        manufacturer: sharedCustomRecipe.customDeveloper.manufacturer,
        type: sharedCustomRecipe.customDeveloper.type,
        description: '',
        filmOrPaper:
          sharedCustomRecipe.customDeveloper.filmOrPaper === 'film' ||
          sharedCustomRecipe.customDeveloper.filmOrPaper === 'both',
        dilutions: sharedCustomRecipe.customDeveloper.dilutions.map(
          (d: { name: string; dilution: string }, index: number) => ({
            id: String(index),
            name: d.name,
            dilution: d.dilution,
          })
        ),
        mixingInstructions:
          sharedCustomRecipe.customDeveloper.mixingInstructions || null,
        storageRequirements: null,
        safetyNotes: sharedCustomRecipe.customDeveloper.safetyNotes || null,
        imageCredit: null,
        imageSourceUrl: null,
        notes: sharedCustomRecipe.customDeveloper.notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      developer = getDeveloperById(sharedCustomRecipe.developerId);
    }

    const recipeView: DevelopmentCombinationView = {
      combination,
      film,
      developer,
      source: 'custom',
    };

    return recipeView;
  }, [sharedCustomRecipe, getFilmById, getDeveloperById]);
}

/** The user's custom recipes as views, leaving out any that are out of range. */
export function useCustomCombinationViews(
  customRecipes: CustomRecipe[],
  getFilmById: (id: string) => Film | undefined,
  getDeveloperById: (id: string) => Developer | undefined
): DevelopmentCombinationView[] {
  return useMemo<DevelopmentCombinationView[]>(() => {
    if (!customRecipes.length) {
      return [];
    }

    return customRecipes.flatMap((recipe) => {
      const combination = toCombinationOrNull(recipe);
      if (!combination) {
        return [];
      }
      return [
        {
          combination,
          film: getCustomRecipeFilm(recipe.id, customRecipes, getFilmById),
          developer: getCustomRecipeDeveloper(
            recipe.id,
            customRecipes,
            getDeveloperById
          ),
          source: 'custom',
        } satisfies DevelopmentCombinationView,
      ];
    });
  }, [customRecipes, getDeveloperById, getFilmById]);
}
