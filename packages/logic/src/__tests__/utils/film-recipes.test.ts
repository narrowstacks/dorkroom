import type { Combination, Developer, Film } from '@dorkroom/api';
import { describe, expect, it } from 'vitest';
import {
  buildFilmRecipeIndex,
  filmSupportsRecipes,
  filmTypeFilterSupportsRecipes,
  getFilmRecipeCount,
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
  isoSpeed: number
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
    const index = buildFilmRecipeIndex(combinations);
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
  const index = buildFilmRecipeIndex(combinations);

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
    expect(buildFilmRecipeIndex([recipe('', 'rodinal', 100)]).counts.size).toBe(
      0
    );
    expect(buildFilmRecipeIndex([]).counts.size).toBe(0);
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
  const counts = buildFilmRecipeIndex(combinations).counts;

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
