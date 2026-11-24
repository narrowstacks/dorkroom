import type { Developer, Film } from '@dorkroom/api';
import type { CustomRecipeFilter } from '../schemas/development-recipes.schema';
import type { DevelopmentCombinationView } from '../types/development-recipe-view';
import { getCombinationDilution } from './combination-dilution';
import { parseDilution, sameDilution } from './dilution-parser';
import { buildFilmSlugIndex } from './film-alias-resolver';
import { buildFilmRecipeIndex } from './film-recipes';
import { plural } from './home-search/format';
import { isNonStandardTemperature, STANDARD_TEMP_C } from './temperature';

type RecipeView = DevelopmentCombinationView;

/** What the picker and search may offer. */
export type RecipeScope = 'all' | 'official' | 'custom' | 'saved';

/**
 * A film the picker can name. `key` is the canonical slug for a catalogue film.
 * A custom film has no slug `validateUrlParams` accepts, so check `isCustom`
 * before writing one to the URL.
 */
export interface RecipeFilmEntry {
  key: string;
  film: Film;
  isCustom: boolean;
}

/** A developer the picker can name, keyed like {@link RecipeFilmEntry}. */
export interface RecipeDeveloperEntry {
  key: string;
  developer: Developer;
  isCustom: boolean;
}

export interface RecipeKeys {
  filmKey: string;
  developerKey: string;
}

/**
 * Recipes by film and developer. `pairs` holds what the scope allows. Everything
 * else stays whole under a scope: a link opens its recipe whatever the scope
 * (#508), and a selected custom film still needs its name after the scope hides
 * its recipes.
 */
export interface RecipeIndex {
  films: ReadonlyMap<string, RecipeFilmEntry>;
  developers: ReadonlyMap<string, RecipeDeveloperEntry>;
  /** Film key, then developer key, then recipes in input order. Never holds an empty list. */
  pairs: ReadonlyMap<string, ReadonlyMap<string, readonly RecipeView[]>>;
  /** Every recipe given, including one whose film or developer did not resolve. */
  viewsById: ReadonlyMap<string, RecipeView>;
  /** The film and developer a recipe itself belongs to, for filling the pickers. */
  keysById: ReadonlyMap<string, RecipeKeys>;
  /**
   * Custom recipes whose film or developer did not resolve. No picker reaches
   * them, so list them for edit and delete.
   */
  unresolvedCustom: readonly RecipeView[];
}

/** A picker option. `value` and `label` line up with the UI's `SelectItem`. */
export interface RecipeOption {
  value: string;
  label: string;
  count: number;
  /** "12 recipes", or "No Ilfotec HC recipes" when the count is 0. */
  detail: string;
}

export interface RecipeRow {
  view: RecipeView;
  dilution: string;
  /** The row is not published at the current temperature, so say which it is. */
  temperatureDiffers: boolean;
}

export interface RecipeTemperatureChoice {
  view: RecipeView;
  isCurrent: boolean;
}

export interface RecipeSpeedChoice extends RecipeTemperatureChoice {
  isBoxSpeed: boolean;
  /** The speed is not published at the current temperature, so say which it is. */
  temperatureDiffers: boolean;
}

export interface RecipeHint {
  /** A shooting speed, or 'boxspeed' for the film's own. */
  iso?: string | number | null;
  dilution?: string | null;
}

export interface RecipeHintResult {
  recipe: RecipeView | null;
  /** Which asked-for values no published recipe has. */
  missing: { iso: boolean; dilution: boolean };
}

export interface RecipeScopeFilters {
  customRecipeFilter: CustomRecipeFilter;
  favoritesOnly: boolean;
}

const NO_RECIPES: readonly RecipeView[] = [];

const recipeIdOf = (view: RecipeView) =>
  String(view.combination.uuid || view.combination.id);

const dilutionOf = (view: RecipeView) =>
  getCombinationDilution(view.combination, view.developer);

const normalisedName = (...nameParts: string[]) =>
  nameParts.join(' ').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Custom films and developers are synthesised per recipe, so two recipes on
 * the same home-made developer only meet through their name.
 */
const customKey = (...nameParts: string[]) =>
  `custom:${normalisedName(...nameParts)}`;

const compareStrings = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const sourceRank = ({ source }: RecipeView) => (source === 'custom' ? 1 : 0);

/** Standard within the shared tolerance: a custom 68.1F is stored as 20.1C. */
const isStandardTemperature = ({ combination }: RecipeView) =>
  !isNonStandardTemperature(combination.temperatureF);

const distanceFrom20C = ({ combination }: RecipeView) =>
  Math.abs(combination.temperatureC - STANDARD_TEMP_C);

/** A recipe opened outside the scope still belongs in its own list and chips. */
const withCurrent = (
  pair: readonly RecipeView[],
  current: RecipeView | null
): readonly RecipeView[] =>
  !current || pair.some((view) => recipeIdOf(view) === recipeIdOf(current))
    ? pair
    : [...pair, current];

const addToPair = (
  pairs: Map<string, Map<string, RecipeView[]>>,
  filmKey: string,
  developerKey: string,
  view: RecipeView
) => {
  const byDeveloper = pairs.get(filmKey) ?? new Map<string, RecipeView[]>();
  pairs.set(filmKey, byDeveloper);
  const recipes = byDeveloper.get(developerKey);
  if (recipes) recipes.push(view);
  else byDeveloper.set(developerKey, [view]);
};

/**
 * Index recipes for the picker, with the same film-to-recipe semantics as
 * /films (aliases count for the canonical film, rebrands share with their base)
 * by building on `buildFilmRecipeIndex`. A custom film or developer named exactly
 * like a catalogue one joins it. Custom films sharing a name take the lowest box
 * speed among them, so the default recipe does not depend on recipe order.
 * Recipes whose film or developer cannot be resolved are left out of `pairs`:
 * without a developer a `dilutionId` has no label and would read as Stock.
 * `unresolvedCustom` stays empty unless both catalogues are non-empty, because a
 * failed load would otherwise list healthy recipes as broken. Pure; safe to
 * memoize on all three arrays.
 */
export function buildRecipeIndex(
  views: readonly RecipeView[],
  films: Film[],
  developers: readonly Developer[]
): RecipeIndex {
  const filmsBySlug = buildFilmSlugIndex(films);
  const filmsByUuid = new Map(films.map((film) => [film.uuid, film]));
  const filmsByName = new Map<string, Film>();
  for (const film of films) {
    const name = normalisedName(film.brand, film.name);
    if (!filmsByName.has(name)) filmsByName.set(name, film);
  }

  const developersByName = new Map<string, Developer>();
  for (const developer of developers) {
    const name = normalisedName(developer.manufacturer, developer.name);
    if (!developersByName.has(name)) developersByName.set(name, developer);
  }

  const filmEntries = new Map<string, RecipeFilmEntry>(
    films.map((film) => [film.slug, { key: film.slug, film, isCustom: false }])
  );
  const developerEntries = new Map<string, RecipeDeveloperEntry>(
    developers.map((developer) => [
      developer.slug,
      { key: developer.slug, developer, isCustom: false },
    ])
  );

  const filmKeyOf = (view: RecipeView): string | null => {
    const { film, combination, source } = view;
    if (film) {
      const known = filmsBySlug.get(film.slug);
      if (known) return known.slug;
      if (source === 'custom') {
        const namesake = filmsByName.get(normalisedName(film.brand, film.name));
        if (namesake) return namesake.slug;
        const key = customKey(film.brand, film.name);
        const held = filmEntries.get(key)?.film;
        if (
          !held ||
          (film.isoSpeed - held.isoSpeed ||
            compareStrings(film.slug, held.slug)) < 0
        ) {
          filmEntries.set(key, { key, film, isCustom: true });
        }
        return key;
      }
    }
    // API rows hold a slug here, custom rows a uuid.
    const ref = combination.filmSlug || combination.filmStockId;
    return (filmsBySlug.get(ref) ?? filmsByUuid.get(ref))?.slug ?? null;
  };

  const developerKeyOf = ({ developer, source }: RecipeView): string | null => {
    if (!developer) return null;
    if (developerEntries.has(developer.slug)) return developer.slug;
    if (source !== 'custom') return null;
    const namesake = developersByName.get(
      normalisedName(developer.manufacturer, developer.name)
    );
    if (namesake) return namesake.slug;
    const key = customKey(developer.manufacturer, developer.name);
    const held = developerEntries.get(key)?.developer;
    if (!held || compareStrings(developer.slug, held.slug) < 0) {
      developerEntries.set(key, { key, developer, isCustom: true });
    }
    return key;
  };

  const pairs = new Map<string, Map<string, RecipeView[]>>();
  const viewsById = new Map<string, RecipeView>();
  const keysById = new Map<string, RecipeKeys>();
  const unresolvedCustom: RecipeView[] = [];
  const catalogueRows: RecipeView['combination'][] = [];

  for (const view of views) {
    const id = recipeIdOf(view);
    viewsById.set(id, view);
    const filmKey = filmKeyOf(view);
    const developerKey = developerKeyOf(view);
    if (!filmKey || !developerKey) {
      if (view.source === 'custom') unresolvedCustom.push(view);
      continue;
    }
    keysById.set(id, { filmKey, developerKey });
    if (filmEntries.get(filmKey)?.isCustom) {
      addToPair(pairs, filmKey, developerKey, view);
    } else {
      // `uuid: id` because the film index dedupes on uuid, and one can be blank.
      catalogueRows.push({ ...view.combination, uuid: id, filmSlug: filmKey });
    }
  }

  const { recipesBySlug } = buildFilmRecipeIndex(catalogueRows, films);
  for (const [filmKey, recipes] of recipesBySlug) {
    for (const { uuid } of recipes) {
      const view = viewsById.get(uuid);
      const developerKey = keysById.get(uuid)?.developerKey;
      if (view && developerKey) addToPair(pairs, filmKey, developerKey, view);
    }
  }

  return {
    films: filmEntries,
    developers: developerEntries,
    pairs,
    viewsById,
    keysById,
    unresolvedCustom:
      films.length > 0 && developers.length > 0 ? unresolvedCustom : [],
  };
}

const matchesScope = (
  view: RecipeView,
  scope: RecipeScope,
  isFavorite: (id: string) => boolean
): boolean => {
  switch (scope) {
    case 'official':
      return !!view.combination.tags?.some((tag) =>
        tag.startsWith('official-')
      );
    case 'custom':
      return view.source === 'custom';
    case 'saved':
      return isFavorite(recipeIdOf(view));
    default:
      return true;
  }
};

/** The same index, with `pairs` narrowed to a scope. */
export function filterRecipesByScope(
  index: RecipeIndex,
  scope: RecipeScope,
  isFavorite: (id: string) => boolean
): RecipeIndex {
  if (scope === 'all') return index;
  const pairs = new Map<string, Map<string, RecipeView[]>>();
  for (const [filmKey, byDeveloper] of index.pairs) {
    for (const [developerKey, recipes] of byDeveloper) {
      for (const view of recipes) {
        if (matchesScope(view, scope, isFavorite)) {
          addToPair(pairs, filmKey, developerKey, view);
        }
      }
    }
  }
  return { ...index, pairs };
}

const toOption = (
  value: string,
  label: string,
  count: number,
  otherName: string | undefined
): RecipeOption => ({
  value,
  label,
  count,
  detail:
    count > 0
      ? plural(count, 'recipe')
      : otherName
        ? `No ${otherName} recipes`
        : 'No recipes',
});

const byLabel = (a: RecipeOption, b: RecipeOption) =>
  a.label.localeCompare(b.label);

/**
 * Films that have recipes, plus the selected one even if it has none (a link
 * from a film page can name a film with no recipes). With a developer chosen,
 * counts are for that pair and a film at 0 stays selectable.
 */
export function getFilmOptions(
  index: RecipeIndex,
  {
    developerKey,
    selectedFilmKey,
  }: { developerKey?: string | null; selectedFilmKey?: string | null } = {}
): RecipeOption[] {
  const chosen = developerKey ? index.developers.get(developerKey) : undefined;
  const options: RecipeOption[] = [];
  for (const { key, film } of index.films.values()) {
    const byDeveloper = index.pairs.get(key);
    if (!byDeveloper && key !== selectedFilmKey) continue;
    let count = 0;
    if (chosen) count = byDeveloper?.get(chosen.key)?.length ?? 0;
    else {
      for (const recipes of byDeveloper?.values() ?? []) {
        count += recipes.length;
      }
    }
    options.push(
      toOption(key, `${film.brand} ${film.name}`, count, chosen?.developer.name)
    );
  }
  return options.toSorted(byLabel);
}

/**
 * Developers with recipes for the chosen film, or for any film, plus the
 * selected one even if it has none.
 */
export function getDeveloperOptions(
  index: RecipeIndex,
  {
    filmKey,
    selectedDeveloperKey,
  }: { filmKey?: string | null; selectedDeveloperKey?: string | null } = {}
): RecipeOption[] {
  const chosen = filmKey ? index.films.get(filmKey) : undefined;
  // A set, because a rebrand and its base film list the same recipe.
  const recipesByDeveloper = new Map<string, Set<RecipeView>>();
  const sources = chosen
    ? [index.pairs.get(chosen.key)]
    : [...index.pairs.values()];
  for (const byDeveloper of sources) {
    for (const [key, recipes] of byDeveloper ?? []) {
      const seen = recipesByDeveloper.get(key) ?? new Set<RecipeView>();
      recipesByDeveloper.set(key, seen);
      for (const view of recipes) seen.add(view);
    }
  }

  const options: RecipeOption[] = [];
  for (const { key, developer } of index.developers.values()) {
    const count = recipesByDeveloper.get(key)?.size ?? 0;
    if (count === 0 && key !== selectedDeveloperKey) continue;
    options.push(
      toOption(
        key,
        `${developer.manufacturer} ${developer.name}`,
        count,
        chosen?.film.name
      )
    );
  }
  return options.toSorted(byLabel);
}

/** A pair's recipes in input order, empty when it has none. */
export function getPairRecipes(
  index: RecipeIndex,
  filmKey: string,
  developerKey: string
): readonly RecipeView[] {
  return index.pairs.get(filmKey)?.get(developerKey) ?? NO_RECIPES;
}

/** Deliberately not home search's order, which leads with Stock. */
const defaultDilutionRank = (dilution: string) => {
  if (sameDilution(dilution, '1+1')) return 0;
  return sameDilution(dilution, 'Stock') ? 1 : 2;
};

/**
 * The recipe to open: box speed at 20C, then any at 20C, then anything listed.
 * Inside a tier: nearest box speed, 1+1 then Stock then the rest, nearest 20C
 * (lower on a tie), API before custom, uuid. The temperature step keeps the
 * result in `getRecipeRows(pair)`, which shows the same temperature. The result
 * does not depend on input order.
 */
export function pickDefaultRecipe(
  pair: readonly RecipeView[],
  boxIso: number
): RecipeView | null {
  const tier = ({ combination }: RecipeView) => {
    if (isNonStandardTemperature(combination.temperatureF)) return 2;
    return combination.shootingIso === boxIso ? 0 : 1;
  };
  const distance = ({ combination }: RecipeView) =>
    Math.abs(combination.shootingIso - boxIso);
  const sorted = pair.toSorted(
    (a, b) =>
      tier(a) - tier(b) ||
      distance(a) - distance(b) ||
      defaultDilutionRank(dilutionOf(a)) - defaultDilutionRank(dilutionOf(b)) ||
      distanceFrom20C(a) - distanceFrom20C(b) ||
      a.combination.temperatureC - b.combination.temperatureC ||
      sourceRank(a) - sourceRank(b) ||
      compareStrings(recipeIdOf(a), recipeIdOf(b))
  );
  return sorted[0] ?? null;
}

/**
 * Open what a link's `iso` and `dilution` ask for. Speed decides first, as on
 * the home page: a dilution not published at that speed is reported missing
 * and the speed kept. Anything missing falls back to the default rule.
 */
export function resolveRecipeHint(
  pair: readonly RecipeView[],
  boxIso: number,
  { iso, dilution }: RecipeHint
): RecipeHintResult {
  let candidates = pair;
  const missing = { iso: false, dilution: false };

  if (iso !== undefined && iso !== null && iso !== '') {
    const wanted = iso === 'boxspeed' ? boxIso : Number(iso);
    const matching = candidates.filter(
      (view) => view.combination.shootingIso === wanted
    );
    missing.iso = matching.length === 0;
    if (!missing.iso) candidates = matching;
  }
  if (dilution) {
    const matching = candidates.filter((view) =>
      sameDilution(dilutionOf(view), dilution)
    );
    missing.dilution = matching.length === 0;
    if (!missing.dilution) candidates = matching;
  }
  return { recipe: pickDefaultRecipe(candidates, boxIso), missing };
}

/**
 * The current temperature if published, then standard (20C within tolerance),
 * then nearest. The lower one wins a tie.
 */
const preferredTemperature = (
  views: readonly RecipeView[],
  current: RecipeView | null
): number => {
  const temperatureOf = (view: RecipeView) => view.combination.temperatureC;
  const currentC = current?.combination.temperatureC;
  if (
    currentC !== undefined &&
    views.some((view) => temperatureOf(view) === currentC)
  ) {
    return currentC;
  }
  const standard = views.filter(isStandardTemperature);
  const target =
    standard.length > 0 ? STANDARD_TEMP_C : (currentC ?? STANDARD_TEMP_C);
  return (standard.length > 0 ? standard : views)
    .map(temperatureOf)
    .toSorted(
      (a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b
    )[0];
};

const groupBy = <K>(
  views: readonly RecipeView[],
  keyOf: (view: RecipeView) => K
): Map<K, RecipeView[]> => {
  const groups = new Map<K, RecipeView[]>();
  for (const view of views) {
    const key = keyOf(view);
    const group = groups.get(key);
    if (group) group.push(view);
    else groups.set(key, [view]);
  }
  return groups;
};

/** Concentrate share of the mix. Unparseable labels sort after every ratio. */
const dilutionStrength = (dilution: string) => {
  const parsed = parseDilution(dilution);
  return parsed ? parsed.concentrateParts / parsed.totalParts : -1;
};

/**
 * The pair's list: one row per dilution and EI, at the current temperature
 * where that row publishes it, else 20C, else nearest. `current` must belong to
 * this film and developer pair; it is always listed, even when the scope hid it
 * from `pair`. Rows published twice at the same dilution, EI and temperature all
 * stay (Delta 400 in Ilfotec HC has two 1:31 rows). Strongest mix first, so
 * Stock then 1+1; EI ascending within a dilution.
 */
export function getRecipeRows(
  pair: readonly RecipeView[],
  current: RecipeView | null = null
): RecipeRow[] {
  const mixes: Array<{ dilution: string; views: RecipeView[] }> = [];
  for (const view of withCurrent(pair, current)) {
    const dilution = dilutionOf(view);
    const mix = mixes.find((m) => sameDilution(m.dilution, dilution));
    if (mix) mix.views.push(view);
    else mixes.push({ dilution, views: [view] });
  }

  return mixes
    .toSorted(
      (a, b) =>
        dilutionStrength(b.dilution) - dilutionStrength(a.dilution) ||
        a.dilution.localeCompare(b.dilution)
    )
    .flatMap(({ views }) =>
      [...groupBy(views, (view) => view.combination.shootingIso).entries()]
        .toSorted(([a], [b]) => a - b)
        .flatMap(([, atIso]) => {
          const temperature = preferredTemperature(atIso, current);
          return atIso
            .filter((view) => view.combination.temperatureC === temperature)
            .map((view) => ({
              view,
              dilution: dilutionOf(view),
              temperatureDiffers:
                !!current && temperature !== current.combination.temperatureC,
            }));
        })
    );
}

/**
 * One recipe to stand for several published at the same temperature and EI:
 * the current one, else one from the current recipe's source, else any, with
 * API before custom and then by id so input order never decides.
 */
const representative = (
  views: readonly RecipeView[],
  current: RecipeView
): RecipeView => {
  const ordered = views.toSorted(
    (a, b) =>
      sourceRank(a) - sourceRank(b) ||
      compareStrings(recipeIdOf(a), recipeIdOf(b))
  );
  return (
    ordered.find((view) => recipeIdOf(view) === recipeIdOf(current)) ??
    ordered.find(
      (view) =>
        view.combination.infoSource &&
        view.combination.infoSource === current.combination.infoSource
    ) ??
    ordered[0]
  );
};

const sameMix = (pair: readonly RecipeView[], current: RecipeView) => {
  const dilution = dilutionOf(current);
  return withCurrent(pair, current).filter((view) =>
    sameDilution(dilutionOf(view), dilution)
  );
};

/**
 * Temperatures published for the current recipe's dilution and EI, ascending.
 * `current` must belong to this film and developer pair; it is included even
 * when the scope hid it from `pair`. Show them only when there are at least two.
 */
export function getTemperatureChoices(
  pair: readonly RecipeView[],
  current: RecipeView | null
): RecipeTemperatureChoice[] {
  if (!current) return [];
  const atIso = sameMix(pair, current).filter(
    (view) => view.combination.shootingIso === current.combination.shootingIso
  );
  return [...groupBy(atIso, (view) => view.combination.temperatureC).entries()]
    .toSorted(([a], [b]) => a - b)
    .map(([, views]) => {
      const view = representative(views, current);
      return { view, isCurrent: recipeIdOf(view) === recipeIdOf(current) };
    });
}

/**
 * Speeds published for the current recipe's dilution, ascending. `current` must
 * belong to this film and developer pair; it is included even when the scope hid
 * it from `pair`. Each speed is at the current temperature, else 20C, else
 * nearest. Requiring the current temperature would hide EI 800 from anyone on
 * 24C, so `temperatureDiffers` flags it instead. Show them only when there are
 * at least two.
 */
export function getSpeedChoices(
  pair: readonly RecipeView[],
  current: RecipeView | null,
  boxIso: number
): RecipeSpeedChoice[] {
  if (!current) return [];
  const mix = sameMix(pair, current);
  return [...groupBy(mix, (view) => view.combination.shootingIso).entries()]
    .toSorted(([a], [b]) => a - b)
    .map(([shootingIso, views]) => {
      const temperature = preferredTemperature(views, current);
      const view = representative(
        views.filter((v) => v.combination.temperatureC === temperature),
        current
      );
      return {
        view,
        isCurrent: recipeIdOf(view) === recipeIdOf(current),
        isBoxSpeed: shootingIso === boxIso,
        temperatureDiffers: temperature !== current.combination.temperatureC,
      };
    });
}

/** Saved beats any recipe type, so an old `favorites` link keeps meaning that. */
export function recipeScopeFromFilters({
  customRecipeFilter,
  favoritesOnly,
}: {
  customRecipeFilter: string;
  favoritesOnly: boolean;
}): RecipeScope {
  if (favoritesOnly) return 'saved';
  if (customRecipeFilter === 'only-custom') return 'custom';
  if (
    customRecipeFilter === 'official' ||
    customRecipeFilter === 'hide-custom'
  ) {
    return 'official';
  }
  return 'all';
}

export function recipeScopeToFilters(scope: RecipeScope): RecipeScopeFilters {
  return {
    customRecipeFilter:
      scope === 'official'
        ? 'official'
        : scope === 'custom'
          ? 'only-custom'
          : 'all',
    favoritesOnly: scope === 'saved',
  };
}

/**
 * The agitation a recipe records, or null. On a custom recipe that may be a form
 * default rather than a source value. Custom rows also carry a hardcoded
 * `agitationMethod: 'Standard'` that nobody chose, so only their schedule counts.
 */
export function getRecipeAgitation(
  view: Pick<RecipeView, 'combination' | 'source'>
): string | null {
  const { agitationSchedule, agitationMethod } = view.combination;
  const schedule = agitationSchedule?.trim();
  if (schedule) return schedule;
  if (view.source === 'custom') return null;
  return agitationMethod?.trim() || null;
}
