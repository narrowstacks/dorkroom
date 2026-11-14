import {
  useDevelopers,
  useDevelopmentRecipes,
  useFilms,
} from '@dorkroom/logic';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveRecipeTarget } from '@/lib/home/recipe-target';
import { LINK_OPENED_PARAM } from '@/lib/link-prefill';
import {
  clearsOpeningIso,
  isoToApply,
  recipeListOpening,
} from './recipe-views';

/** What the last link opening set: the roll it came from, its film, and
 * the ISO filter it applied. */
export interface RollOpening {
  roll?: string;
  film?: string;
  iso?: string;
}

/**
 * The recipe browser's state: the shared recipes hook plus the screen's own
 * search, tag filter and "unavailable" target, with a link opening applied.
 *
 * A link opens the browser on a Home result (a film or developer) or on a
 * roll waiting to be developed (its film, its EI and the roll itself). It is a
 * fresh filter request: every other selection and filter is dropped first.
 * Applied once per opening (the `at` marker tells two openings of the same
 * target apart), so a later catalog refetch cannot undo what the user changed
 * since. `rollOpening` is the roll and the film the last opening set; a recipe
 * carries the roll only while that film is still selected
 * (`rollForRecipeOpen`), and the screen forgets it on a manual film change.
 * A ref, since only the press handler reads it.
 */
export function useRecipeBrowser() {
  const recipes = useDevelopmentRecipes();
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  // The Home target the browser has no recipes for, by name.
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const rollOpening = useRef<RollOpening | null>(null);
  const appliedOpening = useRef<string | null>(null);

  const clearEverything = useCallback(() => {
    rollOpening.current = null;
    recipes.clearFilters();
    recipes.setSelectedFilm(null);
    recipes.setSelectedDeveloper(null);
    setTagFilter('');
    setQuery('');
    setUnavailable(null);
  }, [recipes]);

  // A manual film pick or clear ends the opening: the roll is no longer
  // carried, and the ISO filter goes too if it is still the one the opening
  // set (one the user chose since stays).
  const { isoFilter, setIsoFilter: setIso } = recipes;
  const forgetOpening = useCallback(() => {
    if (
      clearsOpeningIso({
        openingIso: rollOpening.current?.iso,
        currentIso: isoFilter,
      })
    ) {
      setIso('');
    }
    rollOpening.current = null;
  }, [isoFilter, setIso]);

  const {
    film: filmParam,
    developer: developerParam,
    iso: isoParam,
    roll: rollParam,
    [LINK_OPENED_PARAM]: openedParam,
  } = useLocalSearchParams<{
    film?: string;
    developer?: string;
    iso?: string;
    roll?: string;
    at?: string;
  }>();
  const catalogFilms = useFilms().data;
  const catalogDevelopers = useDevelopers().data;
  const { isLoaded, allFilms, allDevelopers, allCombinations } = recipes;
  // Every B&W film, aliases and rebrands included, as the browser matches.
  const allCatalogFilms = recipes.catalogFilms;
  const { setSelectedFilm, setSelectedDeveloper, setIsoFilter } = recipes;
  useEffect(() => {
    if (!isLoaded) return;
    const opening = recipeListOpening({
      film: filmParam,
      developer: developerParam,
      iso: isoParam,
      roll: rollParam,
      at: openedParam,
    });
    if (!opening || appliedOpening.current === opening.key) return;
    appliedOpening.current = opening.key;
    const target = resolveRecipeTarget(
      { film: opening.film, developer: opening.developer },
      { films: allFilms, developers: allDevelopers },
      { films: catalogFilms, developers: catalogDevelopers }
    );
    clearEverything();
    setSelectedFilm(target.film);
    setSelectedDeveloper(target.developer);
    // A roll's EI only when the film has a recipe at it; else the film alone.
    const iso = isoToApply({
      iso: opening.iso,
      film: target.film,
      films: allCatalogFilms,
      recipes: allCombinations,
    });
    if (iso) setIsoFilter(iso);
    setUnavailable(target.unavailable);
    rollOpening.current =
      rollParam || iso
        ? { roll: rollParam, film: target.film?.slug, iso }
        : null;
  }, [
    isLoaded,
    filmParam,
    developerParam,
    isoParam,
    rollParam,
    openedParam,
    allFilms,
    allDevelopers,
    allCombinations,
    allCatalogFilms,
    catalogFilms,
    catalogDevelopers,
    clearEverything,
    setSelectedFilm,
    setSelectedDeveloper,
    setIsoFilter,
  ]);

  return {
    recipes,
    query,
    setQuery,
    tagFilter,
    setTagFilter,
    unavailable,
    setUnavailable,
    rollOpening,
    forgetOpening,
    clearEverything,
  };
}
