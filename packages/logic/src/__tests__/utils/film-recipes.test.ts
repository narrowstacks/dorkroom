import type { Combination, Developer, Film } from '@dorkroom/api';
import { describe, expect, it } from 'vitest';
import {
  buildFilmRecipeIndex,
  filmSupportsRecipes,
  filmTypeFilterSupportsRecipes,
  getFilmRecipeCount,
  getRelatedFilms,
  groupRecipesByShootingIso,
  pickDefaultRecipeIso,
  resolveFilmRecipes,
  sortFilms,
} from '../../utils/film-recipes';

const film = (
  slug: string,
  brand: string,
  name: string,
  colorType: string,
  isoSpeed: number,
  overrides: Partial<Film> = {}
): Film => ({
  id: 0,
  uuid: slug,
  slug,
  brand,
  name,
  colorType,
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

const recipe = (
  filmSlug: string,
  developerSlug: string,
  shootingIso: number,
  overrides: Partial<Combination> = {}
): Combination => ({
  id: 0,
  uuid: `${filmSlug}-${developerSlug}-${shootingIso}`,
  name: '',
  filmStockId: filmSlug,
  filmSlug,
  developerId: developerSlug,
  developerSlug,
  shootingIso,
  dilutionId: null,
  customDilution: null,
  temperatureC: 20,
  temperatureF: 68,
  timeMinutes: 9,
  agitationMethod: 'Inversion',
  agitationSchedule: null,
  pushPull: null,
  tags: null,
  notes: null,
  infoSource: null,
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
  ...overrides,
});

const hp5 = film('hp5-plus', 'Ilford', 'HP5 Plus', 'bw', 400);
const triX = film('tri-x-400', 'Kodak', 'Tri-X 400', 'bw', 400);
const panF = film('pan-f-plus', 'Ilford', 'Pan F Plus', 'bw', 50);
const portra = film('portra-400', 'Kodak', 'Portra 400', 'color', 400);
const velvia = film('velvia-50', 'Fujifilm', 'Velvia 50', 'slide', 50);
const allFilms = [hp5, triX, panF, portra, velvia];

const combinations = [
  recipe('hp5-plus', 'ilford-ddx', 400),
  recipe('hp5-plus', 'kodak-d-76', 400),
  recipe('hp5-plus', 'ilford-ddx', 1600),
  recipe('tri-x-400', 'kodak-d-76', 400),
  recipe('hp5-plus', 'rodinal', 200),
  // A recipe row that should never be shown for a color film.
  recipe('portra-400', 'rodinal', 400),
];

describe('filmSupportsRecipes', () => {
  it('is true for black and white spellings only', () => {
    expect(filmSupportsRecipes({ colorType: 'bw' })).toBe(true);
    expect(filmSupportsRecipes({ colorType: 'B&W' })).toBe(true);
    expect(filmSupportsRecipes({ colorType: 'b & w' })).toBe(true);
    expect(filmSupportsRecipes({ colorType: 'color' })).toBe(false);
    expect(filmSupportsRecipes({ colorType: 'Colour' })).toBe(false);
    expect(filmSupportsRecipes({ colorType: 'slide' })).toBe(false);
  });

  it('does not depend on whether recipes exist', () => {
    const index = buildFilmRecipeIndex(combinations, allFilms);
    expect(getFilmRecipeCount(index, portra.slug)).toBe(1);
    expect(filmSupportsRecipes(portra)).toBe(false);
  });
});

describe('filmTypeFilterSupportsRecipes', () => {
  it('rejects only the color and slide filters', () => {
    expect(filmTypeFilterSupportsRecipes('')).toBe(true);
    expect(filmTypeFilterSupportsRecipes('bw')).toBe(true);
    expect(filmTypeFilterSupportsRecipes('color')).toBe(false);
    expect(filmTypeFilterSupportsRecipes('slide')).toBe(false);
  });
});

describe('buildFilmRecipeIndex', () => {
  const index = buildFilmRecipeIndex(combinations, allFilms);

  it('counts recipes per film slug', () => {
    expect(getFilmRecipeCount(index, 'hp5-plus')).toBe(4);
    expect(getFilmRecipeCount(index, 'tri-x-400')).toBe(1);
  });

  it('returns 0 for films with no recipes', () => {
    expect(getFilmRecipeCount(index, 'pan-f-plus')).toBe(0);
    expect(index.counts.has('pan-f-plus')).toBe(false);
  });

  it('keeps recipes in input order per film', () => {
    expect(
      index.recipesBySlug.get('hp5-plus')?.map((c) => c.developerSlug)
    ).toEqual(['ilford-ddx', 'kodak-d-76', 'ilford-ddx', 'rodinal']);
  });

  it('skips combinations without a film slug and handles empty input', () => {
    expect(
      buildFilmRecipeIndex([recipe('', 'rodinal', 100)], allFilms).counts.size
    ).toBe(0);
    expect(buildFilmRecipeIndex([], allFilms).counts.size).toBe(0);
  });
});

describe('buildFilmRecipeIndex film and rebrand semantics', () => {
  const alias = (slug: string) => ({ slug, name: slug });
  const base = film('hp5-plus', 'Ilford', 'HP5 Plus', 'bw', 400, {
    aliases: [alias('ilford-hp5')],
  });
  const rebrandA = film('foma-400', 'Fomapan', 'Fomapan 400', 'bw', 400, {
    baseFilmSlug: 'hp5-plus',
  });
  const rebrandB = film('lomo-400', 'Lomography', 'Lomo 400', 'bw', 400, {
    baseFilmSlug: 'hp5-plus',
  });
  const films = [base, rebrandA, rebrandB, panF];
  const slugs = (index: ReturnType<typeof buildFilmRecipeIndex>, s: string) =>
    index.recipesBySlug.get(s)?.map((c) => c.uuid);

  it('counts a recipe under an alias slug for the canonical film', () => {
    const index = buildFilmRecipeIndex(
      [recipe('ilford-hp5', 'rodinal', 400)],
      films
    );
    expect(getFilmRecipeCount(index, 'hp5-plus')).toBe(1);
    expect(index.counts.has('ilford-hp5')).toBe(false);
  });

  it('counts a recipe stored with only a filmStockId', () => {
    const index = buildFilmRecipeIndex(
      [recipe('', 'rodinal', 100, { filmStockId: 'pan-f-plus' })],
      films
    );
    expect(getFilmRecipeCount(index, 'pan-f-plus')).toBe(1);
  });

  it('shares recipes between a rebrand and its base film', () => {
    const own = recipe('hp5-plus', 'rodinal', 400);
    const rebrandOwn = recipe('foma-400', 'kodak-d-76', 400);
    const index = buildFilmRecipeIndex([own, rebrandOwn], films);
    expect(slugs(index, 'foma-400')).toEqual([own.uuid, rebrandOwn.uuid]);
    expect(slugs(index, 'hp5-plus')).toEqual([own.uuid, rebrandOwn.uuid]);
  });

  it('does not share one rebrand own recipes with a sibling rebrand', () => {
    const a = recipe('foma-400', 'rodinal', 400);
    const b = recipe('lomo-400', 'kodak-d-76', 400);
    const index = buildFilmRecipeIndex([a, b], films);
    expect(slugs(index, 'foma-400')).toEqual([a.uuid]);
    expect(slugs(index, 'lomo-400')).toEqual([b.uuid]);
    expect(slugs(index, 'hp5-plus')).toEqual([a.uuid, b.uuid]);
  });

  it('counts a recipe once and ignores recipes for unknown films', () => {
    const own = recipe('hp5-plus', 'rodinal', 400);
    const aliased = { ...own };
    const index = buildFilmRecipeIndex(
      [own, aliased, recipe('mystery-film', 'rodinal', 400)],
      films
    );
    expect(getFilmRecipeCount(index, 'hp5-plus')).toBe(1);
    expect(index.counts.has('mystery-film')).toBe(false);
  });
});

describe('groupRecipesByShootingIso', () => {
  it('groups ascending by shooting ISO', () => {
    const groups = groupRecipesByShootingIso(combinations.slice(0, 5));
    expect(groups.map((g) => g.shootingIso)).toEqual([200, 400, 1600]);
    expect(groups.find((g) => g.shootingIso === 400)?.recipes).toHaveLength(3);
  });

  it('returns no groups for no recipes', () => {
    expect(groupRecipesByShootingIso([])).toEqual([]);
  });
});

describe('pickDefaultRecipeIso', () => {
  const groups = [
    { shootingIso: 200 },
    { shootingIso: 400 },
    { shootingIso: 1600 },
  ];

  it('prefers the box speed', () => {
    expect(pickDefaultRecipeIso(groups, 400)).toBe(400);
  });

  it('falls back to the nearest ISO, lower on a tie', () => {
    expect(pickDefaultRecipeIso(groups, 800)).toBe(400);
    expect(pickDefaultRecipeIso(groups, 100)).toBe(200);
    expect(
      pickDefaultRecipeIso([{ shootingIso: 400 }, { shootingIso: 100 }], 250)
    ).toBe(100);
    expect(
      pickDefaultRecipeIso([{ shootingIso: 100 }, { shootingIso: 400 }], 250)
    ).toBe(100);
  });

  it('is undefined with no groups', () => {
    expect(pickDefaultRecipeIso([], 400)).toBeUndefined();
  });
});

describe('resolveFilmRecipes', () => {
  const ddx: Developer = {
    id: 1,
    uuid: 'dev-ddx',
    slug: 'ilford-ddx',
    name: 'DD-X',
    manufacturer: 'Ilford',
    type: 'liquid',
    description: '',
    filmOrPaper: true,
    dilutions: [{ id: '2', name: '1+4', dilution: '1+4' }],
    mixingInstructions: null,
    storageRequirements: null,
    safetyNotes: null,
    imageCredit: null,
    imageSourceUrl: null,
    notes: null,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  };

  it('resolves developer names and dilution labels', () => {
    const [stock, diluted, custom] = resolveFilmRecipes(
      [
        recipe('hp5-plus', 'ilford-ddx', 400, { dilutionId: '2' }),
        recipe('hp5-plus', 'ilford-ddx', 400),
        recipe('hp5-plus', 'ilford-ddx', 400, { customDilution: '1+9' }),
      ],
      [ddx]
    );
    expect(diluted.dilution).toBe('Stock');
    expect(stock.dilution).toBe('1+4');
    expect(stock.developerName).toBe('DD-X');
    expect(custom.dilution).toBe('1+9');
  });

  it('shows unknown for a dilution id when the developer is missing from a loaded list', () => {
    const [missing] = resolveFilmRecipes(
      [recipe('hp5-plus', 'rodinal', 200, { dilutionId: '3' })],
      [ddx]
    );
    expect(missing.developerName).toBe('rodinal');
    expect(missing.dilution).toBeNull();
  });

  it('falls back to the slug when the developer is not in the list', () => {
    const [only] = resolveFilmRecipes([recipe('hp5-plus', 'rodinal', 200)], []);
    expect(only.developerName).toBe('rodinal');
    expect(only.dilution).toBe('Stock');
  });

  it('expresses unknown, not Stock, when developers are unavailable', () => {
    const [byId, byCustom, none] = resolveFilmRecipes(
      [
        recipe('hp5-plus', 'ilford-ddx', 400, { dilutionId: '2' }),
        recipe('hp5-plus', 'ilford-ddx', 400, { customDilution: ' 1+9 ' }),
        recipe('hp5-plus', 'ilford-ddx', 400),
      ],
      undefined
    );
    expect(byId.dilution).toBeNull();
    expect(byId.developerName).toBeNull();
    expect(byCustom.dilution).toBe('1+9');
    expect(none.dilution).toBe('Stock');
  });
});

describe('sortFilms', () => {
  const byName = [panF, hp5, triX, portra, velvia];
  const counts = buildFilmRecipeIndex(combinations, allFilms).counts;

  it('name returns the input order', () => {
    expect(sortFilms(byName, 'name')).toEqual(byName);
  });

  it('iso is ascending and ties keep input order', () => {
    expect(sortFilms(byName, 'iso').map((f) => f.slug)).toEqual([
      'pan-f-plus',
      'velvia-50',
      'hp5-plus',
      'tri-x-400',
      'portra-400',
    ]);
  });

  it('recipes is most first, ties keep input order', () => {
    expect(sortFilms(byName, 'recipes', counts).map((f) => f.slug)).toEqual([
      'hp5-plus',
      'tri-x-400',
      'pan-f-plus',
      'portra-400',
      'velvia-50',
    ]);
  });

  it('counts a color film as zero even when it has a recipe row', () => {
    const sorted = sortFilms([portra, panF], 'recipes', counts);
    expect(sorted.map((f) => f.slug)).toEqual(['portra-400', 'pan-f-plus']);
    expect(counts.get('portra-400')).toBe(1);
    expect(
      sortFilms([panF, portra, triX], 'recipes', counts).map((f) => f.slug)
    ).toEqual(['tri-x-400', 'pan-f-plus', 'portra-400']);
  });

  it('recipes without counts keeps the input order', () => {
    expect(sortFilms(byName, 'recipes')).toEqual(byName);
  });

  it('does not mutate its input', () => {
    const input = [...byName];
    sortFilms(input, 'iso');
    expect(input).toEqual(byName);
  });
});

describe('getRelatedFilms', () => {
  const subject = film('hp5', 'Ilford', 'HP5', 'bw', 400);
  const catalog = [
    film('a', 'A', 'One', 'bw', 400),
    subject,
    film('b', 'B', 'Two', 'color', 100),
    film('c', 'C', 'Three', 'color', 400),
    film('d', 'D', 'Four', 'slide', 400),
    film('e', 'E', 'Five', 'bw', 400),
    film('f', 'F', 'Six', 'bw', 400),
  ];

  it('returns same-ISO films in catalog order without the film itself', () => {
    expect(getRelatedFilms(subject, catalog).map((f) => f.slug)).toEqual([
      'a',
      'c',
      'd',
      'e',
    ]);
  });

  it('honors the limit', () => {
    expect(getRelatedFilms(subject, catalog, 2).map((f) => f.slug)).toEqual([
      'a',
      'c',
    ]);
  });

  it('is empty when nothing else shares the ISO', () => {
    const lone = film('lone', 'L', 'Lone', 'bw', 3200);
    expect(getRelatedFilms(lone, [...catalog, lone])).toEqual([]);
  });
});
