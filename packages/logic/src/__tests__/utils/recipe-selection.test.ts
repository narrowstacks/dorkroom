import type { Combination, Developer, Film } from '@dorkroom/api';
import { describe, expect, it } from 'vitest';
import type { DevelopmentCombinationView } from '../../types/development-recipe-view';
import { sameDilution } from '../../utils/dilution-parser';
import { buildFilmRecipeIndex } from '../../utils/film-recipes';
import { formatClock } from '../../utils/home-search';
import {
  buildRecipeIndex,
  filterRecipesByScope,
  getDeveloperOptions,
  getFilmOptions,
  getPairRecipes,
  getRecipeAgitation,
  getRecipeRows,
  getSpeedChoices,
  getTemperatureChoices,
  pickDefaultRecipe,
  type RecipeScope,
  recipeScopeFromFilters,
  recipeScopeToFilters,
  resolveRecipeHint,
} from '../../utils/recipe-selection';

const film = (
  slug: string,
  brand: string,
  name: string,
  isoSpeed: number,
  overrides: Partial<Film> = {}
): Film => ({
  id: 0,
  uuid: `uuid-${slug}`,
  slug,
  brand,
  name,
  colorType: 'bw',
  isoSpeed,
  grainStructure: null,
  description: '',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: null,
  imageCredit: null,
  imageSourceUrl: null,
  aliases: [],
  baseFilmSlug: null,
  dateAdded: '2023-01-01',
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
  ...overrides,
});

const developer = (
  slug: string,
  manufacturer: string,
  name: string,
  dilutions: string[] = []
): Developer => ({
  id: 0,
  uuid: `uuid-${slug}`,
  slug,
  name,
  manufacturer,
  type: 'concentrate',
  description: '',
  filmOrPaper: true,
  dilutions: dilutions.map((dilution, index) => ({
    id: String(index + 1),
    name: dilution,
    dilution,
  })),
  mixingInstructions: null,
  storageRequirements: null,
  safetyNotes: null,
  imageCredit: null,
  imageSourceUrl: null,
  notes: null,
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
});

const hp5 = film('ilford-hp5-plus', 'Ilford', 'HP5 Plus', 400, {
  aliases: [{ slug: 'hp5', name: 'HP5' }],
});
const triX = film('kodak-tri-x-400', 'Kodak', 'Tri-X 400', 400);
const delta400 = film('ilford-delta-400', 'Ilford', 'Delta 400', 400);
const fomapan = film('foma-fomapan-400', 'Foma', 'Fomapan 400', 400);
const aristaEdu = film('arista-edu-400', 'Arista', 'EDU Ultra 400', 400, {
  baseFilmSlug: 'foma-fomapan-400',
});
const panF = film('ilford-pan-f-plus', 'Ilford', 'Pan F Plus', 50);
const FILMS = [hp5, triX, delta400, fomapan, aristaEdu, panF];

const xtol = developer('kodak-xtol', 'Kodak', 'XTOL', ['Stock', '1+1', '1+3']);
const ilfotecHc = developer('ilford-ilfotec-hc', 'Ilford', 'Ilfotec HC', [
  '1:31',
  '1:47',
]);
const dd76 = developer('kodak-d-76', 'Kodak', 'D-76', ['Stock', '1+1']);
const rodinal = developer('agfa-rodinal', 'Agfa', 'Rodinal', ['1+25', '1+50']);
const DEVELOPERS = [xtol, ilfotecHc, dd76, rodinal];

const filmsBySlug = new Map(FILMS.map((f) => [f.slug, f]));
const developersBySlug = new Map(DEVELOPERS.map((d) => [d.slug, d]));

let nextId = 0;

interface RowOptions {
  iso?: number;
  dilution?: string;
  tempC?: number;
  minutes?: number;
  uuid?: string;
  overrides?: Partial<Combination>;
}

/** An API row as `fetchCombinations` maps it: slugs in both film fields. */
const apiView = (
  filmSlug: string,
  developerSlug: string,
  {
    iso = 400,
    dilution = 'Stock',
    tempC = 20,
    minutes = 9,
    uuid,
    overrides = {},
  }: RowOptions = {}
): DevelopmentCombinationView => {
  nextId += 1;
  return {
    source: 'api',
    film: filmsBySlug.get(filmSlug),
    developer: developersBySlug.get(developerSlug),
    combination: {
      id: nextId,
      uuid: uuid ?? `api-${String(nextId).padStart(4, '0')}`,
      name: '',
      filmStockId: filmSlug,
      filmSlug,
      developerId: developerSlug,
      developerSlug,
      shootingIso: iso,
      dilutionId: null,
      customDilution: dilution,
      temperatureC: tempC,
      temperatureF: Math.round(((tempC * 9) / 5 + 32) * 10) / 10,
      timeMinutes: minutes,
      agitationMethod: '',
      agitationSchedule: null,
      pushPull: 0,
      tags: ['official-ilford'],
      notes: null,
      infoSource: 'https://example.com/datasheet.pdf',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
      ...overrides,
    },
  };
};

/**
 * A custom row as `createCombinationFromCustomRecipe` and `useRecipeData` make
 * it: `filmId` is a catalogue uuid, or a stale value beside a synthetic film.
 */
const customView = (
  id: string,
  {
    filmOf,
    developerOf,
    iso = 400,
    dilution = 'Stock',
    tempC = 20,
    minutes = 9,
    schedule = null,
  }: {
    filmOf: Film;
    developerOf: Developer;
    iso?: number;
    dilution?: string;
    tempC?: number;
    minutes?: number;
    schedule?: string | null;
  }
): DevelopmentCombinationView => ({
  source: 'custom',
  film: filmOf,
  developer: developerOf,
  combination: {
    id: -1,
    uuid: id,
    name: 'My recipe',
    filmStockId: filmOf.uuid,
    filmSlug: filmOf.uuid,
    developerId: developerOf.uuid,
    developerSlug: developerOf.uuid,
    shootingIso: iso,
    dilutionId: null,
    customDilution: dilution,
    temperatureC: tempC,
    temperatureF: Math.round(((tempC * 9) / 5 + 32) * 10) / 10,
    timeMinutes: minutes,
    agitationMethod: 'Standard',
    agitationSchedule: schedule,
    pushPull: 0,
    tags: ['custom'],
    notes: null,
    infoSource: null,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
});

/** The synthetic film `getCustomRecipeFilm` builds, one per custom recipe. */
const syntheticFilm = (recipeId: string, brand: string, name: string): Film =>
  film(`custom_film_${recipeId}`, brand, name, 200, {
    uuid: `custom_film_${recipeId}`,
  });

const syntheticDeveloper = (
  recipeId: string,
  manufacturer: string,
  name: string
): Developer => ({
  ...developer(`custom_dev_${recipeId}`, manufacturer, name),
  uuid: `custom_dev_${recipeId}`,
});

const index = (views: DevelopmentCombinationView[]) =>
  buildRecipeIndex(views, FILMS, DEVELOPERS);

const ids = (views: readonly DevelopmentCombinationView[]) =>
  views.map((view) => view.combination.uuid);

describe('moved helpers', () => {
  it('sameDilution reads every spelling of a mix as one', () => {
    expect(sameDilution('1+31', '1:31')).toBe(true);
    expect(sameDilution('stock', 'Stock')).toBe(true);
    expect(sameDilution('1+0', 'Stock')).toBe(true);
    expect(sameDilution('1+1', '1+3')).toBe(false);
    expect(sameDilution('Replenished', 'replenished')).toBe(true);
  });

  it('formatClock is exported from the home-search entry', () => {
    expect(formatClock(6.33)).toBe('6:20');
  });
});

describe('buildRecipeIndex', () => {
  it('counts a recipe stored under an alias slug for the canonical film', () => {
    const aliased = apiView('hp5', 'kodak-xtol', {
      uuid: 'aliased',
      overrides: { filmStockId: 'hp5', filmSlug: 'hp5' },
    });
    const built = index([{ ...aliased, film: undefined }]);
    expect(ids(getPairRecipes(built, hp5.slug, xtol.slug))).toEqual([
      'aliased',
    ]);
  });

  it('shares recipes between a rebrand and its base film, matching /films', () => {
    const views = [
      apiView(fomapan.slug, xtol.slug, { uuid: 'foma-1' }),
      apiView(aristaEdu.slug, xtol.slug, { uuid: 'arista-1' }),
      apiView(fomapan.slug, dd76.slug, { uuid: 'foma-2' }),
    ];
    const built = index(views);
    const films = buildFilmRecipeIndex(
      views.map((view) => view.combination),
      FILMS
    );

    for (const slug of [fomapan.slug, aristaEdu.slug]) {
      const option = getFilmOptions(built).find((o) => o.value === slug);
      expect(option?.count).toBe(films.counts.get(slug));
      expect(option?.count).toBe(3);
    }
    expect(ids(getPairRecipes(built, aristaEdu.slug, xtol.slug))).toEqual([
      'foma-1',
      'arista-1',
    ]);
  });

  it('does not double-count a shared recipe on a developer option', () => {
    const built = index([
      apiView(fomapan.slug, xtol.slug),
      apiView(aristaEdu.slug, xtol.slug),
    ]);
    const option = getDeveloperOptions(built).find(
      (o) => o.value === xtol.slug
    );
    expect(option?.count).toBe(2);
  });

  it('keys a custom recipe on a catalogue film by slug, though its filmId is a uuid', () => {
    const built = index([
      customView('custom_1', { filmOf: hp5, developerOf: xtol }),
    ]);
    expect(ids(getPairRecipes(built, hp5.slug, xtol.slug))).toEqual([
      'custom_1',
    ]);
    expect(built.films.get(hp5.slug)?.isCustom).toBe(false);
  });

  it('merges custom films and developers that share a name', () => {
    const built = index([
      customView('custom_1', {
        filmOf: syntheticFilm('custom_1', 'Harman', 'Phoenix 200'),
        developerOf: syntheticDeveloper('custom_1', 'Home', 'Caffenol C'),
      }),
      customView('custom_2', {
        filmOf: syntheticFilm('custom_2', ' harman', 'PHOENIX  200 '),
        developerOf: syntheticDeveloper('custom_2', 'home', 'caffenol c'),
      }),
    ]);

    const options = getFilmOptions(built);
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      label: 'Harman Phoenix 200',
      count: 2,
      detail: '2 recipes',
    });
    const developers = getDeveloperOptions(built);
    expect(developers).toHaveLength(1);
    expect(developers[0]).toMatchObject({
      label: 'Home Caffenol C',
      count: 2,
    });

    const filmKey = options[0].value;
    expect(built.films.get(filmKey)?.isCustom).toBe(true);
    expect(built.developers.get(developers[0].value)?.isCustom).toBe(true);
    expect(getPairRecipes(built, filmKey, developers[0].value)).toHaveLength(2);
  });

  it('never lets a synthetic film fall back to a stale filmId', () => {
    const view = customView('custom_1', {
      filmOf: syntheticFilm('custom_1', 'Harman', 'Phoenix 200'),
      developerOf: xtol,
    });
    view.combination.filmSlug = hp5.uuid;
    view.combination.filmStockId = hp5.uuid;
    const built = index([view]);
    expect(getPairRecipes(built, hp5.slug, xtol.slug)).toEqual([]);
    expect(getFilmOptions(built)[0].label).toBe('Harman Phoenix 200');
  });

  it('leaves out a recipe whose film or developer cannot be resolved, but can still open it', () => {
    const orphan = apiView('ghost-film', xtol.slug, { uuid: 'orphan' });
    const built = index([orphan]);
    expect(getFilmOptions(built)).toEqual([]);
    expect(built.viewsById.get('orphan')).toBe(orphan);
    expect(built.keysById.has('orphan')).toBe(false);
  });

  it('finds a catalogue film by uuid when the view has no film', () => {
    const view = customView('custom_1', { filmOf: hp5, developerOf: xtol });
    const built = index([{ ...view, film: undefined }]);
    expect(ids(getPairRecipes(built, hp5.slug, xtol.slug))).toEqual([
      'custom_1',
    ]);
  });

  it('merges a custom film named exactly like a catalogue film', () => {
    const custom = customView('custom_1', {
      filmOf: syntheticFilm('custom_1', ' ilford', 'HP5  PLUS '),
      developerOf: xtol,
    });
    const official = apiView(hp5.slug, xtol.slug, { uuid: 'official' });
    const built = index([official, custom]);

    expect(getFilmOptions(built)).toEqual([
      {
        value: hp5.slug,
        label: 'Ilford HP5 Plus',
        count: 2,
        detail: '2 recipes',
      },
    ]);
    expect(ids(getPairRecipes(built, hp5.slug, xtol.slug))).toEqual([
      'official',
      'custom_1',
    ]);
    expect(built.keysById.get('custom_1')?.filmKey).toBe(hp5.slug);
    expect(built.films.get(hp5.slug)).toMatchObject({
      film: hp5,
      isCustom: false,
    });
  });

  it('gives same-named custom films one box speed, whatever the recipe order', () => {
    const at200 = customView('custom_1', {
      filmOf: syntheticFilm('custom_1', 'Harman', 'Phoenix'),
      developerOf: xtol,
    });
    const at100 = customView('custom_2', {
      filmOf: {
        ...syntheticFilm('custom_2', 'Harman', 'Phoenix'),
        isoSpeed: 100,
      },
      developerOf: xtol,
    });
    const key = 'custom:harman phoenix';
    expect(index([at200, at100]).films.get(key)?.film.isoSpeed).toBe(100);
    expect(index([at100, at200]).films.get(key)?.film.isoSpeed).toBe(100);
  });

  it('names same-named custom films at one box speed by slug, whatever the order', () => {
    const first = customView('custom_1', {
      filmOf: syntheticFilm('custom_1', 'Harman', 'Phoenix'),
      developerOf: xtol,
    });
    const second = customView('custom_2', {
      filmOf: syntheticFilm('custom_2', 'HARMAN', 'PHOENIX'),
      developerOf: xtol,
    });
    const key = 'custom:harman phoenix';
    expect(index([second, first]).films.get(key)?.film.brand).toBe('Harman');
    expect(index([first, second]).films.get(key)?.film.brand).toBe('Harman');
  });

  it('joins a custom namesake of a rebrand to the rebrand and its base, at the catalogue box speed', () => {
    const action = film(
      'foma-fomapan-400-action',
      'Foma',
      'Fomapan 400 Action',
      400
    );
    const ladyGrey = film(
      'lomography-lady-grey-400',
      'Lomography',
      'Lady Grey 400',
      400,
      {
        baseFilmSlug: action.slug,
      }
    );
    const custom = customView('custom_1', {
      filmOf: {
        ...syntheticFilm('custom_1', 'Lomography', 'Lady Grey 400'),
        isoSpeed: 50,
      },
      developerOf: xtol,
      iso: 50,
    });
    const official = {
      ...apiView(action.slug, xtol.slug, { uuid: 'official' }),
      film: action,
    };
    const built = buildRecipeIndex(
      [official, custom],
      [action, ladyGrey],
      [xtol]
    );

    for (const slug of [action.slug, ladyGrey.slug]) {
      expect(ids(getPairRecipes(built, slug, xtol.slug))).toEqual([
        'official',
        'custom_1',
      ]);
    }
    expect(built.keysById.get('custom_1')?.filmKey).toBe(ladyGrey.slug);
    const entry = built.films.get(ladyGrey.slug);
    expect(entry).toMatchObject({ film: ladyGrey, isCustom: false });
    expect(entry?.film.isoSpeed).toBe(400);
    expect(
      pickDefaultRecipe(
        getPairRecipes(built, ladyGrey.slug, xtol.slug),
        entry?.film.isoSpeed ?? 0
      )
    ).toBe(official);
    expect(built.films.has('custom:lomography lady grey 400')).toBe(false);
  });

  it('merges a custom developer named exactly like a catalogue developer', () => {
    const custom = customView('custom_1', {
      filmOf: hp5,
      developerOf: syntheticDeveloper('custom_1', ' kodak', 'XTOL '),
    });
    const official = apiView(hp5.slug, xtol.slug, { uuid: 'official' });
    const built = index([official, custom]);

    expect(getDeveloperOptions(built)).toEqual([
      { value: xtol.slug, label: 'Kodak XTOL', count: 2, detail: '2 recipes' },
    ]);
    expect(ids(getPairRecipes(built, hp5.slug, xtol.slug))).toEqual([
      'official',
      'custom_1',
    ]);
    expect(built.developers.get(xtol.slug)).toMatchObject({
      developer: xtol,
      isCustom: false,
    });
  });

  it('keeps the dilution label a merged custom developer gave its recipe', () => {
    const view = customView('custom_1', {
      filmOf: hp5,
      developerOf: {
        ...syntheticDeveloper('custom_1', 'Kodak', 'XTOL'),
        dilutions: [{ id: '1', name: '1+9', dilution: '1+9' }],
      },
    });
    view.combination.customDilution = null;
    view.combination.dilutionId = '1';
    const pair = getPairRecipes(index([view]), hp5.slug, xtol.slug);
    expect(getRecipeRows(pair)[0].dilution).toBe('1+9');
  });

  it('names same-named custom developers by slug, whatever the order', () => {
    const first = customView('custom_1', {
      filmOf: hp5,
      developerOf: syntheticDeveloper('custom_1', 'Home', 'Caffenol'),
    });
    const second = customView('custom_2', {
      filmOf: hp5,
      developerOf: syntheticDeveloper('custom_2', 'HOME', 'CAFFENOL'),
    });
    const label = (views: DevelopmentCombinationView[]) =>
      getDeveloperOptions(index(views))[0].label;
    expect(label([second, first])).toBe('Home Caffenol');
    expect(label([first, second])).toBe('Home Caffenol');
  });

  it.each([
    ['films', [], DEVELOPERS],
    ['developers', FILMS, []],
    ['films and developers', [], []],
  ])(
    'lists nothing as unresolved when %s failed to load',
    (_, films, developers) => {
      const healthy = {
        ...customView('custom_1', { filmOf: hp5, developerOf: xtol }),
        film: undefined,
        developer: undefined,
      };
      const built = buildRecipeIndex([healthy], films, developers);
      expect(built.unresolvedCustom).toEqual([]);
      expect(built.viewsById.get('custom_1')).toBe(healthy);
    }
  );

  it('lists a custom recipe whose film is gone, so it can be edited or deleted', () => {
    const lost = {
      ...customView('custom_lost', { filmOf: hp5, developerOf: xtol }),
      film: undefined,
    };
    lost.combination = {
      ...lost.combination,
      filmSlug: 'uuid-deleted',
      filmStockId: 'uuid-deleted',
    };
    const built = index([lost, apiView('ghost-film', xtol.slug)]);

    expect(built.unresolvedCustom).toEqual([lost]);
    expect(built.viewsById.get('custom_lost')).toBe(lost);
    expect(built.keysById.has('custom_lost')).toBe(false);
    expect(getFilmOptions(built)).toEqual([]);
    expect(getDeveloperOptions(built)).toEqual([]);
    expect(
      filterRecipesByScope(built, 'official', () => false).unresolvedCustom
    ).toEqual([lost]);
  });

  it('leaves a recipe with no developer unresolved rather than calling its mix Stock', () => {
    const api = apiView(hp5.slug, ilfotecHc.slug, {
      uuid: 'no-developer',
      overrides: { customDilution: null, dilutionId: '2' },
    });
    const custom = customView('custom_1', {
      filmOf: hp5,
      developerOf: ilfotecHc,
    });
    const built = index([
      { ...api, developer: undefined },
      { ...custom, developer: undefined },
    ]);

    expect(getPairRecipes(built, hp5.slug, ilfotecHc.slug)).toEqual([]);
    expect(ids(built.unresolvedCustom)).toEqual(['custom_1']);
  });

  it('leaves out an API row whose developer is not in the catalogue', () => {
    const unknown = developer('ghost-dev', 'Nobody', 'Ghost');
    const built = index([
      { ...apiView(hp5.slug, xtol.slug), developer: unknown },
    ]);
    expect(getFilmOptions(built)).toEqual([]);
    expect(built.developers.has(unknown.slug)).toBe(false);
  });

  it('files a row with a blank uuid under its numeric id', () => {
    const view = apiView(hp5.slug, xtol.slug, { uuid: '' });
    const other = apiView(hp5.slug, xtol.slug, { uuid: '' });
    const built = index([view, other]);
    expect(getPairRecipes(built, hp5.slug, xtol.slug)).toEqual([view, other]);
    expect(built.keysById.get(String(view.combination.id))).toEqual({
      filmKey: hp5.slug,
      developerKey: xtol.slug,
    });
  });

  it('reports the keys a recipe opens under', () => {
    const shared = apiView(fomapan.slug, xtol.slug);
    const custom = customView('custom_1', {
      filmOf: syntheticFilm('custom_1', 'Harman', 'Phoenix 200'),
      developerOf: xtol,
    });
    const built = index([shared, custom]);
    expect(built.keysById.get(shared.combination.uuid)).toEqual({
      filmKey: fomapan.slug,
      developerKey: xtol.slug,
    });
    expect(built.keysById.get('custom_1')?.filmKey).toBe(
      getFilmOptions(built).find((o) => o.label === 'Harman Phoenix 200')?.value
    );
  });
});

describe('getFilmOptions', () => {
  const views = [
    apiView(hp5.slug, xtol.slug),
    apiView(hp5.slug, xtol.slug),
    apiView(hp5.slug, dd76.slug),
    apiView(triX.slug, ilfotecHc.slug),
  ];

  it('lists only films with recipes, sorted, with their totals', () => {
    expect(getFilmOptions(index(views))).toEqual([
      {
        value: hp5.slug,
        label: 'Ilford HP5 Plus',
        count: 3,
        detail: '3 recipes',
      },
      {
        value: triX.slug,
        label: 'Kodak Tri-X 400',
        count: 1,
        detail: '1 recipe',
      },
    ]);
  });

  it('counts for the chosen developer and says so for a film with none', () => {
    const options = getFilmOptions(index(views), {
      developerKey: ilfotecHc.slug,
    });
    expect(options.find((o) => o.value === hp5.slug)).toMatchObject({
      count: 0,
      detail: 'No Ilfotec HC recipes',
    });
    expect(options.find((o) => o.value === triX.slug)).toMatchObject({
      count: 1,
      detail: '1 recipe',
    });
  });

  it('keeps a selected film that has no recipes at all', () => {
    const options = getFilmOptions(index(views), {
      selectedFilmKey: panF.slug,
    });
    expect(options.find((o) => o.value === panF.slug)).toMatchObject({
      count: 0,
      detail: 'No recipes',
    });
    expect(
      getFilmOptions(index(views)).some((o) => o.value === panF.slug)
    ).toBe(false);
  });

  it('ignores an unknown selected film', () => {
    expect(
      getFilmOptions(index(views), { selectedFilmKey: 'ghost' }).map(
        (o) => o.value
      )
    ).toEqual([hp5.slug, triX.slug]);
  });
});

describe('getDeveloperOptions', () => {
  const views = [
    apiView(hp5.slug, xtol.slug),
    apiView(hp5.slug, xtol.slug),
    apiView(hp5.slug, dd76.slug),
    apiView(triX.slug, ilfotecHc.slug),
  ];

  it('offers every developer with recipes when no film is chosen', () => {
    expect(getDeveloperOptions(index(views)).map((o) => o.label)).toEqual([
      'Ilford Ilfotec HC',
      'Kodak D-76',
      'Kodak XTOL',
    ]);
  });

  it('offers only developers with recipes for the chosen film', () => {
    expect(getDeveloperOptions(index(views), { filmKey: hp5.slug })).toEqual([
      { value: dd76.slug, label: 'Kodak D-76', count: 1, detail: '1 recipe' },
      { value: xtol.slug, label: 'Kodak XTOL', count: 2, detail: '2 recipes' },
    ]);
  });

  it('keeps a selected developer that has no recipes, saying why', () => {
    expect(
      getDeveloperOptions(index(views), {
        selectedDeveloperKey: rodinal.slug,
      }).find((o) => o.value === rodinal.slug)
    ).toMatchObject({ count: 0, detail: 'No recipes' });
    expect(
      getDeveloperOptions(index(views), {
        filmKey: hp5.slug,
        selectedDeveloperKey: ilfotecHc.slug,
      }).find((o) => o.value === ilfotecHc.slug)
    ).toMatchObject({ count: 0, detail: 'No HP5 Plus recipes' });
  });
});

describe('getPairRecipes', () => {
  it('is empty for an unknown pair', () => {
    expect(getPairRecipes(index([]), hp5.slug, xtol.slug)).toEqual([]);
  });
});

describe('pickDefaultRecipe', () => {
  it('prefers box speed at 20C', () => {
    const box = apiView(hp5.slug, xtol.slug, { uuid: 'box-20' });
    expect(
      pickDefaultRecipe(
        [
          apiView(hp5.slug, xtol.slug, { iso: 800, uuid: 'push-20' }),
          apiView(hp5.slug, xtol.slug, { tempC: 24, uuid: 'box-24' }),
          box,
        ],
        400
      )
    ).toBe(box);
  });

  it('falls back to any recipe at 20C over box speed at another temperature', () => {
    const push = apiView(hp5.slug, xtol.slug, { iso: 800, uuid: 'push-20' });
    expect(
      pickDefaultRecipe(
        [apiView(hp5.slug, xtol.slug, { tempC: 24, uuid: 'box-24' }), push],
        400
      )
    ).toBe(push);
  });

  it('falls back to a listed recipe when nothing is at 20C', () => {
    const near = apiView(hp5.slug, xtol.slug, { tempC: 24, uuid: 'b' });
    expect(
      pickDefaultRecipe(
        [
          apiView(hp5.slug, xtol.slug, { iso: 800, tempC: 24, uuid: 'a' }),
          near,
        ],
        400
      )
    ).toBe(near);
  });

  it('is null for an empty pair', () => {
    expect(pickDefaultRecipe([], 400)).toBeNull();
  });

  it('counts a custom 68.1F as 20C, using the shared tolerance', () => {
    const atTolerance = customView('custom_1', {
      filmOf: hp5,
      developerOf: xtol,
      tempC: 20.1,
    });
    atTolerance.combination.temperatureF = 68.1;
    expect(atTolerance.combination.temperatureC).toBe(20.1);
    const push = apiView(hp5.slug, xtol.slug, { iso: 800, uuid: 'push-20' });
    expect(pickDefaultRecipe([push, atTolerance], 400)).toBe(atTolerance);
  });

  it('prefers true 20C over 68.1F when both are published', () => {
    const near = customView('a', {
      filmOf: hp5,
      developerOf: xtol,
      tempC: 20.1,
    });
    near.combination.temperatureF = 68.1;
    const exact = customView('b', { filmOf: hp5, developerOf: xtol });
    expect(pickDefaultRecipe([near, exact], 400)).toBe(exact);
    expect(getRecipeRows([near, exact]).map((row) => row.view)).toEqual([
      exact,
    ]);
  });

  describe('with nothing at 20C', () => {
    it('prefers the temperature nearest 20C, even when it is the warmer one', () => {
      const near = customView('z', {
        filmOf: hp5,
        developerOf: xtol,
        tempC: 22,
      });
      const far = customView('a', {
        filmOf: hp5,
        developerOf: xtol,
        tempC: 17,
      });
      expect(pickDefaultRecipe([far, near], 400)).toBe(near);
    });

    it('takes the lower temperature on a tie', () => {
      const cold = customView('z', {
        filmOf: hp5,
        developerOf: xtol,
        tempC: 18,
      });
      const warm = customView('a', {
        filmOf: hp5,
        developerOf: xtol,
        tempC: 22,
      });
      expect(pickDefaultRecipe([warm, cold], 400)).toBe(cold);
    });

    it('still ranks box speed and dilution ahead of temperature', () => {
      const box = customView('box', {
        filmOf: hp5,
        developerOf: xtol,
        tempC: 24,
      });
      const push = customView('push', {
        filmOf: hp5,
        developerOf: xtol,
        iso: 800,
        tempC: 21,
      });
      expect(pickDefaultRecipe([push, box], 400)).toBe(box);

      const stock = customView('stock', {
        filmOf: hp5,
        developerOf: xtol,
        tempC: 21,
      });
      const oneOne = customView('oneone', {
        filmOf: hp5,
        developerOf: xtol,
        dilution: '1+1',
        tempC: 24,
      });
      expect(pickDefaultRecipe([stock, oneOne], 400)).toBe(oneOne);
    });

    it('always lands on a listed row', () => {
      const pair = [
        customView('a', { filmOf: hp5, developerOf: xtol, tempC: 24 }),
        customView('b', { filmOf: hp5, developerOf: xtol, tempC: 18 }),
        customView('c', { filmOf: hp5, developerOf: xtol, tempC: 22 }),
        customView('d', {
          filmOf: hp5,
          developerOf: xtol,
          dilution: '1+3',
          tempC: 26,
        }),
      ];
      const chosen = pickDefaultRecipe(pair, 400);
      expect(getRecipeRows(pair).map((row) => row.view)).toContain(chosen);
    });
  });

  describe('tie-breaks inside a tier', () => {
    it('takes the speed nearest box speed', () => {
      const near = apiView(hp5.slug, xtol.slug, { iso: 800, uuid: 'b' });
      expect(
        pickDefaultRecipe(
          [apiView(hp5.slug, xtol.slug, { iso: 1600, uuid: 'a' }), near],
          400
        )
      ).toBe(near);
    });

    it('then 1+1, then Stock, then the rest (HP5 Plus in XTOL at box speed and 20C)', () => {
      const stock = apiView(hp5.slug, xtol.slug, { uuid: 'a' });
      const oneOne = apiView(hp5.slug, xtol.slug, {
        dilution: '1+1',
        uuid: 'c',
      });
      const oneThree = apiView(hp5.slug, xtol.slug, {
        dilution: '1+3',
        uuid: 'b',
      });
      expect(pickDefaultRecipe([stock, oneThree, oneOne], 400)).toBe(oneOne);
      expect(pickDefaultRecipe([oneThree, stock], 400)).toBe(stock);
    });

    it('counts 1:1 as 1+1 and 1+0 as Stock', () => {
      const colon = apiView(hp5.slug, xtol.slug, {
        dilution: '1:1',
        uuid: 'c',
      });
      const stock = apiView(hp5.slug, xtol.slug, { uuid: 'a' });
      const plusZero = apiView(hp5.slug, xtol.slug, {
        dilution: '1+0',
        uuid: 'b',
      });
      const oneThree = apiView(hp5.slug, xtol.slug, {
        dilution: '1+3',
        uuid: 'a',
      });
      expect(pickDefaultRecipe([stock, colon], 400)).toBe(colon);
      expect(pickDefaultRecipe([oneThree, plusZero], 400)).toBe(plusZero);
    });

    it('lets box speed outrank the dilution preference', () => {
      const stock = apiView(hp5.slug, xtol.slug, { uuid: 'a' });
      const push = apiView(hp5.slug, xtol.slug, {
        iso: 800,
        dilution: '1+1',
        uuid: 'b',
      });
      expect(pickDefaultRecipe([push, stock], 400)).toBe(stock);
    });

    it('then API before custom', () => {
      const api = apiView(hp5.slug, xtol.slug, { uuid: 'z' });
      const custom = customView('a', { filmOf: hp5, developerOf: xtol });
      expect(pickDefaultRecipe([custom, api], 400)).toBe(api);
    });

    it('then uuid, whatever order the rows came in', () => {
      const first = apiView(hp5.slug, xtol.slug, { uuid: 'a' });
      const second = apiView(hp5.slug, xtol.slug, { uuid: 'b' });
      expect(pickDefaultRecipe([second, first], 400)).toBe(first);
      expect(pickDefaultRecipe([first, second], 400)).toBe(first);
    });
  });
});

describe('resolveRecipeHint', () => {
  const stock400 = apiView(hp5.slug, xtol.slug, { uuid: 'stock-400' });
  const stock800 = apiView(hp5.slug, xtol.slug, {
    iso: 800,
    uuid: 'stock-800',
  });
  const oneOne400 = apiView(hp5.slug, xtol.slug, {
    dilution: '1+1',
    uuid: 'oneone-400',
  });
  const pair = [stock400, stock800, oneOne400];

  it('opens the default with no hint and reports nothing missing', () => {
    expect(resolveRecipeHint(pair, 400, {})).toEqual({
      recipe: oneOne400,
      missing: { iso: false, dilution: false },
    });
  });

  it('matches a numeric iso given as the URL string', () => {
    expect(resolveRecipeHint(pair, 400, { iso: '800' }).recipe).toBe(stock800);
  });

  it('reads boxspeed as the film box speed', () => {
    const result = resolveRecipeHint([stock800, oneOne400], 400, {
      iso: 'boxspeed',
    });
    expect(result.recipe).toBe(oneOne400);
    expect(result.missing.iso).toBe(false);
  });

  it('matches a dilution however it is written', () => {
    const hc = apiView(hp5.slug, ilfotecHc.slug, {
      dilution: '1:31',
      uuid: 'hc-31',
    });
    const other = apiView(hp5.slug, ilfotecHc.slug, {
      dilution: '1:47',
      uuid: 'hc-47',
    });
    expect(
      resolveRecipeHint([other, hc], 400, { dilution: '1+31' }).recipe
    ).toBe(hc);
  });

  it('falls back to the default and reports an iso with no row', () => {
    expect(resolveRecipeHint(pair, 400, { iso: '3200' })).toEqual({
      recipe: oneOne400,
      missing: { iso: true, dilution: false },
    });
  });

  it('reports an unreadable iso as missing rather than guessing', () => {
    expect(resolveRecipeHint(pair, 400, { iso: 'fast' }).missing.iso).toBe(
      true
    );
  });

  it('falls back to the default and reports a dilution with no row', () => {
    expect(resolveRecipeHint(pair, 400, { dilution: '1+9' })).toEqual({
      recipe: oneOne400,
      missing: { iso: false, dilution: true },
    });
  });

  it('keeps the iso when the dilution is not published at that iso', () => {
    expect(
      resolveRecipeHint(pair, 400, { iso: '800', dilution: '1+1' })
    ).toEqual({
      recipe: stock800,
      missing: { iso: false, dilution: true },
    });
  });

  it('keeps the dilution when the iso has no row', () => {
    expect(
      resolveRecipeHint(pair, 400, { iso: '3200', dilution: '1+1' })
    ).toEqual({
      recipe: oneOne400,
      missing: { iso: true, dilution: false },
    });
  });

  it.each([[''], [null], [undefined]])(
    'treats an iso of %j as no hint',
    (iso) => {
      expect(resolveRecipeHint(pair, 400, { iso })).toEqual({
        recipe: oneOne400,
        missing: { iso: false, dilution: false },
      });
    }
  );

  it('has no recipe for an empty pair', () => {
    expect(resolveRecipeHint([], 400, { iso: '800' })).toEqual({
      recipe: null,
      missing: { iso: true, dilution: false },
    });
  });
});

describe('getRecipeRows', () => {
  it('orders by dilution, strongest first after Stock and 1+1, then EI', () => {
    const rows = getRecipeRows([
      apiView(hp5.slug, xtol.slug, { dilution: '1+9', uuid: 'r9' }),
      apiView(hp5.slug, xtol.slug, { dilution: '1+3', iso: 800, uuid: 'r3b' }),
      apiView(hp5.slug, xtol.slug, { dilution: '1+3', uuid: 'r3a' }),
      apiView(hp5.slug, xtol.slug, { dilution: '1+1', uuid: 'r1' }),
      apiView(hp5.slug, xtol.slug, { dilution: 'Replenished', uuid: 'rx' }),
      apiView(hp5.slug, xtol.slug, { uuid: 'rs' }),
    ]);
    expect(rows.map((row) => row.view.combination.uuid)).toEqual([
      'rs',
      'r1',
      'r3a',
      'r3b',
      'r9',
      'rx',
    ]);
  });

  it('groups two spellings of a mix together', () => {
    const rows = getRecipeRows([
      apiView(hp5.slug, ilfotecHc.slug, { dilution: '1:31', uuid: 'a' }),
      apiView(hp5.slug, ilfotecHc.slug, { dilution: '1:47', uuid: 'b' }),
      apiView(hp5.slug, ilfotecHc.slug, {
        dilution: '1+31',
        iso: 800,
        uuid: 'c',
      }),
    ]);
    expect(rows.map((row) => row.view.combination.uuid)).toEqual([
      'a',
      'c',
      'b',
    ]);
  });

  it('shows one row per dilution and EI, at 20C by default', () => {
    const at20 = apiView(triX.slug, xtol.slug, { uuid: 't20' });
    const rows = getRecipeRows([
      apiView(triX.slug, xtol.slug, { tempC: 18, uuid: 't18' }),
      at20,
      apiView(triX.slug, xtol.slug, { tempC: 24, uuid: 't24' }),
    ]);
    expect(rows).toEqual([
      { view: at20, dilution: 'Stock', temperatureDiffers: false },
    ]);
  });

  it('follows the current temperature where it is published', () => {
    const current = apiView(triX.slug, xtol.slug, { tempC: 24, uuid: 't24' });
    const push24 = apiView(triX.slug, xtol.slug, {
      iso: 800,
      tempC: 24,
      uuid: 'p24',
    });
    const only20 = apiView(triX.slug, xtol.slug, { iso: 1600, uuid: 'x20' });
    const rows = getRecipeRows(
      [
        apiView(triX.slug, xtol.slug, { uuid: 't20' }),
        current,
        apiView(triX.slug, xtol.slug, { iso: 800, uuid: 'p20' }),
        push24,
        only20,
      ],
      current
    );
    expect(rows.map((row) => row.view)).toEqual([current, push24, only20]);
  });

  it('uses the nearest temperature when neither current nor 20C exists', () => {
    const cold = apiView(triX.slug, xtol.slug, { tempC: 18, uuid: 'cold' });
    expect(
      getRecipeRows([
        apiView(triX.slug, xtol.slug, { tempC: 24, uuid: 'warm' }),
        cold,
      ]).map((row) => row.view)
    ).toEqual([cold]);
  });

  it('sorts mixes it cannot parse alphabetically, after every ratio', () => {
    const rows = getRecipeRows([
      apiView(hp5.slug, xtol.slug, { dilution: 'Replenished' }),
      apiView(hp5.slug, xtol.slug, { dilution: 'One-shot' }),
      apiView(hp5.slug, xtol.slug, { dilution: '1+49' }),
    ]);
    expect(rows.map((row) => row.dilution)).toEqual([
      '1+49',
      'One-shot',
      'Replenished',
    ]);
  });

  it('takes the lower of two temperatures equally near 20C', () => {
    const cold = apiView(triX.slug, xtol.slug, { tempC: 18, uuid: 'cold' });
    const warm = apiView(triX.slug, xtol.slug, { tempC: 22, uuid: 'warm' });
    expect(getRecipeRows([warm, cold]).map((row) => row.view)).toEqual([cold]);
  });

  it('flags a row that cannot follow the current temperature (CineStill BwXX in XTOL)', () => {
    const current = apiView(triX.slug, xtol.slug, { tempC: 24, uuid: 'box' });
    const same = apiView(triX.slug, xtol.slug, {
      iso: 800,
      tempC: 24,
      uuid: 'same',
    });
    const other = apiView(triX.slug, xtol.slug, { iso: 1600, uuid: 'other' });
    expect(getRecipeRows([current, same, other], current)).toEqual([
      { view: current, dilution: 'Stock', temperatureDiffers: false },
      { view: same, dilution: 'Stock', temperatureDiffers: false },
      { view: other, dilution: 'Stock', temperatureDiffers: true },
    ]);
  });

  it('never flags a difference without a current recipe', () => {
    const rows = getRecipeRows([
      apiView(triX.slug, xtol.slug, { tempC: 24 }),
      apiView(triX.slug, xtol.slug, { iso: 800 }),
    ]);
    expect(rows.map((row) => row.temperatureDiffers)).toEqual([false, false]);
  });

  it('lists a current recipe the scope hid from the pair', () => {
    const shown = apiView(hp5.slug, xtol.slug, { uuid: 'shown' });
    const hidden = customView('hidden', {
      filmOf: hp5,
      developerOf: xtol,
      tempC: 24,
    });
    expect(getRecipeRows([shown], hidden)).toEqual([
      { view: hidden, dilution: 'Stock', temperatureDiffers: false },
    ]);
  });

  it('keeps both duplicate published rows (Delta 400 in Ilfotec HC at 1:31)', () => {
    const slower = apiView(delta400.slug, ilfotecHc.slug, {
      dilution: '1:31',
      iso: 800,
      minutes: 10,
      uuid: 'slower',
    });
    const faster = apiView(delta400.slug, ilfotecHc.slug, {
      dilution: '1:31',
      iso: 800,
      minutes: 5.5,
      uuid: 'faster',
    });
    expect(getRecipeRows([slower, faster]).map((row) => row.view)).toEqual([
      slower,
      faster,
    ]);
  });

  it('labels a row with the recipe dilution, resolving a dilution id', () => {
    const view = apiView(hp5.slug, xtol.slug, {
      overrides: { customDilution: null, dilutionId: '2' },
    });
    expect(getRecipeRows([view])[0].dilution).toBe('1+1');
  });
});

describe('getTemperatureChoices', () => {
  const t18 = apiView(triX.slug, xtol.slug, { tempC: 18, uuid: 't18' });
  const t20 = apiView(triX.slug, xtol.slug, { uuid: 't20' });
  const t24 = apiView(triX.slug, xtol.slug, { tempC: 24, uuid: 't24' });
  const otherIso = apiView(triX.slug, xtol.slug, {
    iso: 800,
    tempC: 22,
    uuid: 'o-iso',
  });
  const otherDilution = apiView(triX.slug, xtol.slug, {
    dilution: '1+1',
    tempC: 21,
    uuid: 'o-dil',
  });
  const pair = [t24, t18, t20, otherIso, otherDilution];

  it('offers published temperatures for the same dilution and EI, ascending', () => {
    expect(getTemperatureChoices(pair, t20)).toEqual([
      { view: t18, isCurrent: false },
      { view: t20, isCurrent: true },
      { view: t24, isCurrent: false },
    ]);
  });

  it('never invents a temperature: a lone row yields only itself', () => {
    expect(getTemperatureChoices(pair, otherIso)).toEqual([
      { view: otherIso, isCurrent: true },
    ]);
  });

  it('is empty without a current recipe', () => {
    expect(getTemperatureChoices(pair, null)).toEqual([]);
  });

  it('treats two spellings of a mix as the same dilution', () => {
    const a = apiView(hp5.slug, ilfotecHc.slug, { dilution: '1:31' });
    const b = apiView(hp5.slug, ilfotecHc.slug, {
      dilution: '1+31',
      tempC: 24,
    });
    expect(getTemperatureChoices([a, b], a)).toHaveLength(2);
  });

  it('keeps a current recipe the scope hid as the one current choice', () => {
    const hidden = customView('hidden', {
      filmOf: triX,
      developerOf: xtol,
      tempC: 24,
    });
    const choices = getTemperatureChoices([t18, t20], hidden);
    expect(choices).toEqual([
      { view: t18, isCurrent: false },
      { view: t20, isCurrent: false },
      { view: hidden, isCurrent: true },
    ]);
  });

  it('takes API before custom for a temperature, whatever the order', () => {
    const custom = customView('a', {
      filmOf: triX,
      developerOf: xtol,
      tempC: 24,
    });
    const api = apiView(triX.slug, xtol.slug, {
      tempC: 24,
      uuid: 'z',
      overrides: { infoSource: null },
    });
    expect(getTemperatureChoices([t20, custom, api], t20)[1].view).toBe(api);
    expect(getTemperatureChoices([t20, api, custom], t20)[1].view).toBe(api);
  });

  it('breaks a tie between API rows by id, whatever the order', () => {
    const later = apiView(triX.slug, xtol.slug, {
      tempC: 24,
      uuid: 'z',
      overrides: { infoSource: null },
    });
    const earlier = apiView(triX.slug, xtol.slug, {
      tempC: 24,
      uuid: 'y',
      overrides: { infoSource: null },
    });
    expect(getTemperatureChoices([t20, later, earlier], t20)[1].view).toBe(
      earlier
    );
    expect(getTemperatureChoices([t20, earlier, later], t20)[1].view).toBe(
      earlier
    );
  });

  it('offers one choice per temperature, keeping the current duplicate', () => {
    const a = apiView(delta400.slug, ilfotecHc.slug, {
      dilution: '1:31',
      uuid: 'a',
    });
    const b = apiView(delta400.slug, ilfotecHc.slug, {
      dilution: '1:31',
      uuid: 'b',
    });
    expect(getTemperatureChoices([a, b], b)).toEqual([
      { view: b, isCurrent: true },
    ]);
  });
});

describe('getSpeedChoices', () => {
  const box20 = apiView(hp5.slug, xtol.slug, { uuid: 'box20' });
  const box24 = apiView(hp5.slug, xtol.slug, { tempC: 24, uuid: 'box24' });
  const push20 = apiView(hp5.slug, xtol.slug, { iso: 800, uuid: 'push20' });
  const oneOne = apiView(hp5.slug, xtol.slug, {
    iso: 1600,
    dilution: '1+1',
    uuid: 'oneone',
  });

  it('offers published speeds for the same dilution, ascending', () => {
    const pull = apiView(hp5.slug, xtol.slug, { iso: 200, uuid: 'pull' });
    expect(getSpeedChoices([push20, box20, oneOne, pull], box20, 400)).toEqual([
      {
        view: pull,
        isCurrent: false,
        isBoxSpeed: false,
        temperatureDiffers: false,
      },
      {
        view: box20,
        isCurrent: true,
        isBoxSpeed: true,
        temperatureDiffers: false,
      },
      {
        view: push20,
        isCurrent: false,
        isBoxSpeed: false,
        temperatureDiffers: false,
      },
    ]);
  });

  it('still offers EI 800 from 24C, flagging its different temperature', () => {
    expect(getSpeedChoices([box20, box24, push20], box24, 400)).toEqual([
      {
        view: box24,
        isCurrent: true,
        isBoxSpeed: true,
        temperatureDiffers: false,
      },
      {
        view: push20,
        isCurrent: false,
        isBoxSpeed: false,
        temperatureDiffers: true,
      },
    ]);
  });

  it('prefers the current temperature, then 20C, then the nearest', () => {
    const push24 = apiView(hp5.slug, xtol.slug, {
      iso: 800,
      tempC: 24,
      uuid: 'push24',
    });
    const pushOf = (
      pair: DevelopmentCombinationView[],
      current: DevelopmentCombinationView
    ) =>
      getSpeedChoices(pair, current, 400).find(
        (c) => c.view.combination.shootingIso === 800
      )?.view;

    expect(pushOf([box24, push20, push24], box24)).toBe(push24);
    expect(pushOf([box24, push20], box24)).toBe(push20);

    const box22 = apiView(hp5.slug, xtol.slug, { tempC: 22, uuid: 'box22' });
    const push18 = apiView(hp5.slug, xtol.slug, {
      iso: 800,
      tempC: 18,
      uuid: 'push18',
    });
    const push25 = apiView(hp5.slug, xtol.slug, {
      iso: 800,
      tempC: 25,
      uuid: 'push25',
    });
    expect(pushOf([box22, push18, push25], box22)).toBe(push25);
  });

  it('picks 20C over a nearer temperature when the current one is not published', () => {
    const at20 = apiView(hp5.slug, xtol.slug, { iso: 800, uuid: 'p20' });
    const at23 = apiView(hp5.slug, xtol.slug, {
      iso: 800,
      tempC: 23,
      uuid: 'p23',
    });
    const chosen = getSpeedChoices([box24, at23, at20], box24, 400);
    expect(chosen[1].view).toBe(at20);
  });

  it('takes the lower of two temperatures equally near the current one', () => {
    const box22 = apiView(hp5.slug, xtol.slug, { tempC: 22, uuid: 'box22' });
    const at21 = apiView(hp5.slug, xtol.slug, {
      iso: 800,
      tempC: 21,
      uuid: 'p21',
    });
    const at23 = apiView(hp5.slug, xtol.slug, {
      iso: 800,
      tempC: 23,
      uuid: 'p23',
    });
    expect(getSpeedChoices([box22, at23, at21], box22, 400)[1].view).toBe(at21);
  });

  it('counts 68.1F as 20C when choosing a speed', () => {
    const atTolerance = customView('custom_1', {
      filmOf: hp5,
      developerOf: xtol,
      iso: 800,
      tempC: 20.1,
    });
    atTolerance.combination.temperatureF = 68.1;
    const at23 = apiView(hp5.slug, xtol.slug, {
      iso: 800,
      tempC: 23,
      uuid: 'p23',
    });
    expect(
      getSpeedChoices([box24, at23, atTolerance], box24, 400)[1].view
    ).toBe(atTolerance);
  });

  it('keeps a current recipe the scope hid as the one current choice', () => {
    const hidden = customView('hidden', {
      filmOf: hp5,
      developerOf: xtol,
      tempC: 24,
    });
    const chosen = getSpeedChoices([box20, push20], hidden, 400);
    expect(chosen.map((c) => [c.view, c.isCurrent])).toEqual([
      [hidden, true],
      [push20, false],
    ]);
  });

  it('prefers a duplicate from the current recipe source', () => {
    const current = apiView(delta400.slug, ilfotecHc.slug, {
      dilution: '1:31',
      uuid: 'current',
      overrides: { infoSource: 'https://ilford.example/delta-400.pdf' },
    });
    const otherSource = apiView(delta400.slug, ilfotecHc.slug, {
      dilution: '1:31',
      iso: 800,
      uuid: 'a',
      overrides: { infoSource: 'https://other.example/chart.pdf' },
    });
    const sameSource = apiView(delta400.slug, ilfotecHc.slug, {
      dilution: '1:31',
      iso: 800,
      uuid: 'b',
      overrides: { infoSource: 'https://ilford.example/delta-400.pdf' },
    });
    expect(
      getSpeedChoices([current, otherSource, sameSource], current, 400)[1].view
    ).toBe(sameSource);
  });

  it('never invents a speed: a lone EI yields only itself', () => {
    expect(getSpeedChoices([box20, oneOne], oneOne, 400)).toHaveLength(1);
  });

  it('offers one choice per EI among Delta 400 duplicates, keeping the current', () => {
    const a = apiView(delta400.slug, ilfotecHc.slug, {
      dilution: '1:31',
      iso: 800,
      uuid: 'a',
    });
    const b = apiView(delta400.slug, ilfotecHc.slug, {
      dilution: '1:31',
      iso: 800,
      uuid: 'b',
    });
    const chosen = getSpeedChoices([a, b], b, 400);
    expect(chosen.map((c) => c.view)).toEqual([b]);
  });

  it('is empty without a current recipe', () => {
    expect(getSpeedChoices([box20], null, 400)).toEqual([]);
  });
});

describe('filterRecipesByScope', () => {
  const official = apiView(hp5.slug, xtol.slug, { uuid: 'official' });
  const untagged = apiView(hp5.slug, xtol.slug, {
    uuid: 'untagged',
    overrides: { tags: null },
  });
  const custom = customView('custom_1', { filmOf: hp5, developerOf: xtol });
  const customOnly = customView('custom_2', {
    filmOf: syntheticFilm('custom_2', 'Harman', 'Phoenix 200'),
    developerOf: xtol,
  });
  const built = index([official, untagged, custom, customOnly]);
  const inPair = (scope: RecipeScope, saved: string[] = []) =>
    ids(
      getPairRecipes(
        filterRecipesByScope(built, scope, (id) => saved.includes(id)),
        hp5.slug,
        xtol.slug
      )
    );

  it('all keeps everything', () => {
    expect(inPair('all')).toEqual(['official', 'untagged', 'custom_1']);
  });

  it('official keeps rows with an official tag', () => {
    expect(inPair('official')).toEqual(['official']);
  });

  it('custom keeps custom rows', () => {
    expect(inPair('custom')).toEqual(['custom_1']);
  });

  it('saved keeps favorites of either kind', () => {
    expect(inPair('saved', ['official', 'custom_1'])).toEqual([
      'official',
      'custom_1',
    ]);
  });

  it('narrows the options, dropping films and developers left with nothing', () => {
    const scoped = filterRecipesByScope(built, 'official', () => false);
    expect(getFilmOptions(scoped).map((o) => o.label)).toEqual([
      'Ilford HP5 Plus',
    ]);
    const empty = filterRecipesByScope(built, 'saved', () => false);
    expect(getFilmOptions(empty)).toEqual([]);
    expect(getDeveloperOptions(empty)).toEqual([]);
  });

  it('can still name a custom film that the scope hides', () => {
    const filmKey = built.keysById.get('custom_2')?.filmKey ?? '';
    const scoped = filterRecipesByScope(built, 'official', () => false);
    expect(
      getFilmOptions(scoped, { selectedFilmKey: filmKey }).find(
        (o) => o.value === filmKey
      )
    ).toMatchObject({ label: 'Harman Phoenix 200', count: 0 });
  });

  it('keeps every recipe reachable by id, since a link opens whatever the scope', () => {
    const scoped = filterRecipesByScope(built, 'official', () => false);
    expect(scoped.viewsById.get('custom_1')).toBe(custom);
    expect(scoped.keysById.get('custom_1')?.filmKey).toBe(hp5.slug);
  });
});

describe('scope mappings', () => {
  it.each([
    ['all', false, 'all'],
    ['official', false, 'official'],
    ['hide-custom', false, 'official'],
    ['only-custom', false, 'custom'],
    ['', false, 'all'],
    ['all', true, 'saved'],
    ['official', true, 'saved'],
    ['hide-custom', true, 'saved'],
    ['only-custom', true, 'saved'],
  ] as const)(
    'reads %s with favorites=%s as %s',
    (customRecipeFilter, favoritesOnly, scope) => {
      expect(
        recipeScopeFromFilters({ customRecipeFilter, favoritesOnly })
      ).toBe(scope);
    }
  );

  it.each([
    ['all', 'all', false],
    ['official', 'official', false],
    ['custom', 'only-custom', false],
    ['saved', 'all', true],
  ] as const)(
    'writes %s as %s with favorites=%s',
    (scope, customRecipeFilter, favoritesOnly) => {
      expect(recipeScopeToFilters(scope)).toEqual({
        customRecipeFilter,
        favoritesOnly,
      });
    }
  );

  it('round-trips every scope', () => {
    const scopes: RecipeScope[] = ['all', 'official', 'custom', 'saved'];
    for (const scope of scopes) {
      expect(recipeScopeFromFilters(recipeScopeToFilters(scope))).toBe(scope);
    }
  });
});

describe('getRecipeAgitation', () => {
  it('is null when an API row has none', () => {
    expect(getRecipeAgitation(apiView(hp5.slug, xtol.slug))).toBeNull();
  });

  it('reads the method an API row publishes', () => {
    expect(
      getRecipeAgitation(
        apiView(hp5.slug, xtol.slug, {
          overrides: { agitationMethod: ' intermittent ' },
        })
      )
    ).toBe('intermittent');
  });

  it('prefers a schedule over a method', () => {
    expect(
      getRecipeAgitation(
        apiView(hp5.slug, xtol.slug, {
          overrides: {
            agitationMethod: 'intermittent',
            agitationSchedule: '10s every minute',
          },
        })
      )
    ).toBe('10s every minute');
  });

  it('trims a schedule, and treats a blank one as none', () => {
    const custom = (schedule: string) =>
      getRecipeAgitation(
        customView('custom_1', { filmOf: hp5, developerOf: xtol, schedule })
      );
    expect(custom('  Stand 1 hour ')).toBe('Stand 1 hour');
    expect(custom('   ')).toBeNull();
  });

  it('ignores the Standard hardcoded on custom rows', () => {
    expect(
      getRecipeAgitation(
        customView('custom_1', { filmOf: hp5, developerOf: xtol })
      )
    ).toBeNull();
  });

  it('reads the schedule a custom recipe has', () => {
    expect(
      getRecipeAgitation(
        customView('custom_1', {
          filmOf: hp5,
          developerOf: xtol,
          schedule: 'Stand 1 hour',
        })
      )
    ).toBe('Stand 1 hour');
  });
});
