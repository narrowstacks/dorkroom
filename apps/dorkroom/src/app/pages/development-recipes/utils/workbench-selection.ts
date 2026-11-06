import type { InitialUrlState, RecipeHintResult } from '@dorkroom/logic';
import {
  type DevelopmentCombinationView,
  filterRecipesByScope,
  getFilmDisplayName,
  getPairRecipes,
  pickDefaultRecipe,
  type RecipeDeveloperEntry,
  type RecipeFilmEntry,
  recipeIdOf,
  type RecipeIndex,
  type RecipeScope,
  recipeScopeFromFilters,
  resolveRecipeHint,
} from '@dorkroom/logic';

type RecipeView = DevelopmentCombinationView;

/**
 * What the user chose, as opposed to what it resolves to. `openRecipeId` is set
 * only when a recipe was asked for by id; otherwise the pair's default is open,
 * so a custom edit refreshes the panel and a delete falls to the default.
 */
export interface WorkbenchSelection {
  filmKey: string | null;
  developerKey: string | null;
  openRecipeId: string | null;
  /** A link's `iso` and `dilution`, held until a pair is chosen. */
  hint: { iso: string; dilution: string };
  /** What the last hint asked for that the pair does not publish. */
  hintMissing: RecipeHintResult['missing'] | null;
  /** The hint that was asked for, for saying so in the notice. */
  askedHint: { iso: string; dilution: string } | null;
}

const NO_HINT = { iso: '', dilution: '' };

export const EMPTY_SELECTION: WorkbenchSelection = {
  filmKey: null,
  developerKey: null,
  openRecipeId: null,
  hint: NO_HINT,
  hintMissing: null,
  askedHint: null,
};

export interface ResolvedWorkbench {
  film: RecipeFilmEntry | null;
  developer: RecipeDeveloperEntry | null;
  /** The pair's recipes in the current scope. */
  pair: readonly RecipeView[];
  openView: RecipeView | null;
  /** The film's own speed. Never `view.film`, which a merged namesake can skew. */
  boxIso: number;
  /** A chosen pair with nothing in scope: the prompt says so, without the developer. */
  emptyPair: { film: RecipeFilmEntry; developer: RecipeDeveloperEntry } | null;
}

const pairContains = (
  index: RecipeIndex,
  filmKey: string | null,
  developerKey: string | null,
  id: string
) =>
  !!filmKey &&
  !!developerKey &&
  !!index.allPairs
    .get(filmKey)
    ?.get(developerKey)
    ?.some((view) => recipeIdOf(view) === id);

/**
 * Selection to what the page shows. A recipe opened by id decides the pair,
 * except that the selected pair holds on to it when it contains the recipe, so a
 * rebrand-shared row stays on the film it was reached from. Keys that no longer
 * name anything (a deleted recipe's custom film) resolve to nothing.
 */
export function resolveWorkbench(
  selection: WorkbenchSelection,
  index: RecipeIndex,
  scoped: RecipeIndex
): ResolvedWorkbench {
  const { filmKey, developerKey, openRecipeId } = selection;
  const opened = openRecipeId ? index.viewsById.get(openRecipeId) : undefined;

  if (opened && openRecipeId) {
    const keys = pairContains(index, filmKey, developerKey, openRecipeId)
      ? { filmKey, developerKey }
      : index.keysById.get(openRecipeId);
    const film = keys?.filmKey ? index.films.get(keys.filmKey) : undefined;
    const developer = keys?.developerKey
      ? index.developers.get(keys.developerKey)
      : undefined;
    return {
      film: film ?? null,
      developer: developer ?? null,
      pair:
        film && developer
          ? getPairRecipes(scoped, film.key, developer.key)
          : [],
      openView: opened,
      boxIso: film?.film.isoSpeed ?? 0,
      emptyPair: null,
    };
  }

  const film = (filmKey && index.films.get(filmKey)) || null;
  const developer =
    (developerKey && index.developers.get(developerKey)) || null;
  const boxIso = film?.film.isoSpeed ?? 0;
  if (!film || !developer) {
    return {
      film,
      developer,
      pair: [],
      openView: null,
      boxIso,
      emptyPair: null,
    };
  }
  const pair = getPairRecipes(scoped, film.key, developer.key);
  const openView = pickDefaultRecipe(pair, boxIso);
  return openView
    ? { film, developer, pair, openView, boxIso, emptyPair: null }
    : {
        film,
        developer: null,
        pair,
        openView: null,
        boxIso,
        emptyPair: { film, developer },
      };
}

/**
 * The film or developer changed. Always drops the open recipe's id, because the
 * choice functions add any current recipe to the pair and could not tell a stale
 * id from one hidden by scope. A held hint is spent as soon as it picks a recipe.
 */
export function selectPair(
  selection: WorkbenchSelection,
  filmKey: string | null,
  developerKey: string | null,
  scoped: RecipeIndex
): WorkbenchSelection {
  const next: WorkbenchSelection = {
    ...selection,
    filmKey,
    developerKey,
    openRecipeId: null,
    hintMissing: null,
    askedHint: null,
  };
  if (!filmKey || !developerKey) {
    return developerKey === selection.developerKey
      ? next
      : { ...next, hint: { ...selection.hint, dilution: '' } };
  }

  const pair = getPairRecipes(scoped, filmKey, developerKey);
  // A dilution only means something for the developer it came with.
  const { iso, dilution } =
    developerKey === selection.developerKey
      ? selection.hint
      : { ...selection.hint, dilution: '' };
  if (pair.length === 0) return { ...next, hint: { iso, dilution: '' } };
  if (!iso && !dilution) return { ...next, hint: NO_HINT };

  const boxIso = scoped.films.get(filmKey)?.film.isoSpeed ?? 0;
  const { recipe, missing } = resolveRecipeHint(pair, boxIso, {
    iso,
    dilution,
  });
  return {
    ...next,
    openRecipeId: recipe ? recipeIdOf(recipe) : null,
    hint: NO_HINT,
    hintMissing: missing.iso || missing.dilution ? missing : null,
    askedHint: { iso, dilution },
  };
}

/** Open a recipe by id, with the pair it should be read under when known. */
export function openRecipeById(
  id: string,
  keys?: { filmKey: string; developerKey: string }
): WorkbenchSelection {
  return {
    ...EMPTY_SELECTION,
    filmKey: keys?.filmKey ?? null,
    developerKey: keys?.developerKey ?? null,
    openRecipeId: id,
  };
}

/**
 * The selection a link asks for. A recipe the device knows wins over the link's
 * hints, whatever its search or scope (#508). The link's film stays when it pairs
 * with the recipe's developer, which `resolveWorkbench` checks.
 */
export function selectionFromUrl(
  urlState: InitialUrlState,
  index: RecipeIndex,
  scoped: RecipeIndex
): WorkbenchSelection {
  const filmKey = urlState.selectedFilm?.slug ?? null;
  const developerKey = urlState.selectedDeveloper?.slug ?? null;
  const { recipeId } = urlState;
  if (recipeId && index.viewsById.has(recipeId)) {
    const developer = index.keysById.get(recipeId)?.developerKey;
    return {
      ...openRecipeById(recipeId),
      filmKey,
      developerKey: developer ?? developerKey,
    };
  }
  return selectPair(
    {
      ...EMPTY_SELECTION,
      developerKey,
      hint: {
        iso: urlState.isoFilter ?? '',
        dilution: urlState.dilutionFilter ?? '',
      },
    },
    filmKey,
    developerKey,
    scoped
  );
}

/** What a link asks for, read once against the whole catalogue. */
export function seedFromUrl(
  urlState: InitialUrlState,
  index: RecipeIndex,
  isFavorite: (id: string) => boolean
) {
  const scope = recipeScopeFromFilters({
    customRecipeFilter: urlState.customRecipeFilter ?? 'all',
    favoritesOnly: urlState.favoritesOnly ?? false,
  });
  return {
    scope,
    selection: selectionFromUrl(
      urlState,
      index,
      filterRecipesByScope(index, scope, isFavorite)
    ),
  };
}

/**
 * A scope change closes a recipe the new scope hides, keeping its pair. Only a
 * link may open a recipe outside the scope (#508).
 */
export function applyScopeChange(
  selection: WorkbenchSelection,
  resolved: ResolvedWorkbench,
  scoped: RecipeIndex
): WorkbenchSelection {
  // The pair was waiting on the scope, so anything it held applies now.
  if (resolved.emptyPair) {
    return selectPair(
      selection,
      resolved.emptyPair.film.key,
      resolved.emptyPair.developer.key,
      scoped
    );
  }
  const { openRecipeId } = selection;
  if (!openRecipeId) return selection;
  const { film, developer } = resolved;
  const stays =
    !!film &&
    !!developer &&
    getPairRecipes(scoped, film.key, developer.key).some(
      (view) => recipeIdOf(view) === openRecipeId
    );
  if (stays) return selection;
  return {
    ...selection,
    filmKey: film?.key ?? null,
    developerKey: developer?.key ?? null,
    openRecipeId: null,
  };
}

/** The note for a hint the pair could not meet, or null. */
export function hintNotice(selection: WorkbenchSelection): string | null {
  const { hintMissing, askedHint } = selection;
  if (!hintMissing || !askedHint) return null;
  const asked = [
    hintMissing.dilution && askedHint.dilution,
    hintMissing.iso &&
      (askedHint.iso === 'boxspeed' ? 'box speed' : `EI ${askedHint.iso}`),
  ]
    .filter(Boolean)
    .join(' at ');
  // Part of the hint still chose the recipe, so it is not the pair's default.
  const gotPart =
    (askedHint.dilution && !hintMissing.dilution) ||
    (askedHint.iso && !hintMissing.iso);
  return gotPart
    ? `No published recipe for ${asked}, showing the closest published recipe.`
    : `No published recipe for ${asked}, so this is the default for the pair.`;
}

const SCOPE_WORDS = {
  all: '',
  official: 'official',
  custom: 'custom',
  saved: 'saved',
} as const satisfies Record<RecipeScope, string>;

const nameOf = ({ film }: RecipeFilmEntry) =>
  `${film.brand} ${getFilmDisplayName(film)}`;

/**
 * Why the prompt has nothing to offer, or null. Without it a picker whose list
 * came up empty is a silent dead end.
 */
export function promptNote({
  emptyPair,
  film,
  scope,
  filmOptionCount,
  developerOptionCount,
}: {
  emptyPair: ResolvedWorkbench['emptyPair'];
  film: RecipeFilmEntry | null;
  scope: RecipeScope;
  filmOptionCount: number;
  developerOptionCount: number;
}): string | null {
  const word = SCOPE_WORDS[scope];
  const among = word ? ` among ${word} recipes` : '';
  if (emptyPair) {
    return `No ${emptyPair.developer.developer.name} recipes for ${nameOf(emptyPair.film)}${among}.`;
  }
  if (film) {
    return developerOptionCount === 0
      ? `No recipes for ${nameOf(film)}${among}.`
      : null;
  }
  if (filmOptionCount > 0) return null;
  return word === '' ? 'No recipes yet.' : `No ${word} recipes yet.`;
}
