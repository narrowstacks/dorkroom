import { describe, expect, it } from 'vitest';
import { combo, developer, film } from '@/test/fixtures';
import {
  buildRecipeViews,
  clearsOpeningIso,
  developerPickerOptions,
  developerTypeOptions,
  filmPickerOptions,
  filterRecipeViews,
  isoToApply,
  recipeListOpening,
  rollForRecipeOpen,
} from './recipe-views';

const films = [
  film({}),
  film({ uuid: 'f2', slug: 'trix', brand: 'Kodak', name: 'Tri-X' }),
];
const developers = [
  developer({}),
  developer({ uuid: 'd2', slug: 'rodinal', name: 'Rodinal', type: 'Liquid' }),
];
const getFilm = (id?: string | null) =>
  films.find((f) => f.slug === id || f.uuid === id);
const getDev = (id?: string | null) =>
  developers.find((d) => d.uuid === id || d.slug === id);

describe('buildRecipeViews', () => {
  it('joins combinations to film and developer', () => {
    const views = buildRecipeViews([combo({})], getFilm, getDev);
    expect(views[0]?.film?.name).toBe('HP5 Plus');
    expect(views[0]?.developer?.name).toBe('D-76');
    expect(views[0]?.source).toBe('api');
  });
  it('leaves film/developer undefined when not found', () => {
    const views = buildRecipeViews(
      [combo({ filmSlug: 'missing', developerId: 'gone' })],
      getFilm,
      getDev
    );
    expect(views[0]?.film).toBeUndefined();
    expect(views[0]?.developer).toBeUndefined();
  });
});

describe('filterRecipeViews', () => {
  const views = buildRecipeViews(
    [
      combo({ uuid: 'c1', tags: ['pictorial'] }),
      combo({ uuid: 'c2', filmSlug: 'trix', tags: ['scientific'] }),
    ],
    getFilm,
    getDev
  );

  it('returns all when no query or tag', () => {
    expect(filterRecipeViews(views, '', '')).toHaveLength(2);
  });
  it('matches film name (case-insensitive)', () => {
    const out = filterRecipeViews(views, 'tri-x', '');
    expect(out).toHaveLength(1);
    expect(out[0]?.film?.name).toBe('Tri-X');
  });
  it('matches developer name', () => {
    expect(filterRecipeViews(views, 'kodak d', '')).toHaveLength(2);
  });
  it('filters by tag', () => {
    const out = filterRecipeViews(views, '', 'scientific');
    expect(out).toHaveLength(1);
    expect(out[0]?.combination.uuid).toBe('c2');
  });
  it('excludes matches when the tag filter does not apply (AND semantics)', () => {
    const out = filterRecipeViews(views, 'tri x', 'pictorial');
    expect(out).toHaveLength(0);
  });
  it('still matches nothing for a non-matching query', () => {
    expect(filterRecipeViews(views, 'zzz', '')).toHaveLength(0);
  });
});

describe('developerTypeOptions', () => {
  it('lists distinct sorted types with an All option', () => {
    expect(developerTypeOptions(developers)).toEqual([
      { label: 'All types', value: '' },
      { label: 'Liquid', value: 'Liquid' },
      { label: 'Powder', value: 'Powder' },
    ]);
  });
});

describe('filmPickerOptions', () => {
  it('leads with "All films" and composes brand + name labels, preserving order', () => {
    expect(filmPickerOptions(films)).toEqual([
      { label: 'All films', value: '' },
      { label: 'Ilford HP5 Plus', value: 'hp5' },
      { label: 'Kodak Tri-X', value: 'trix' },
    ]);
  });

  it('returns just the "All films" entry for an empty catalog', () => {
    expect(filmPickerOptions([])).toEqual([{ label: 'All films', value: '' }]);
  });
});

describe('developerPickerOptions', () => {
  it('leads with "All developers" and composes manufacturer + name labels, preserving order', () => {
    expect(developerPickerOptions(developers)).toEqual([
      { label: 'All developers', value: '' },
      { label: 'Kodak D-76', value: 'd76' },
      { label: 'Kodak Rodinal', value: 'rodinal' },
    ]);
  });

  it('returns just the "All developers" entry for an empty catalog', () => {
    expect(developerPickerOptions([])).toEqual([
      { label: 'All developers', value: '' },
    ]);
  });
});

describe('recipeListOpening', () => {
  it('is null for a plain open, so the browser keeps its state', () => {
    expect(recipeListOpening({})).toBeNull();
    expect(recipeListOpening({ at: '1' })).toBeNull();
    expect(recipeListOpening({ iso: 'abc', at: '1' })).toBeNull();
    // An ISO alone has no film to apply to: the user's filters stay.
    expect(recipeListOpening({ iso: '400', at: '1' })).toBeNull();
  });

  it('carries a Home film or developer as before', () => {
    expect(recipeListOpening({ film: 'hp5', at: '1' })).toEqual({
      key: 'hp5||||1',
      film: 'hp5',
      developer: undefined,
      iso: undefined,
    });
  });

  it("applies a roll's EI as the ISO filter", () => {
    expect(
      recipeListOpening({ film: 'hp5', iso: '800', roll: 'r1', at: '2' })
    ).toEqual({
      key: 'hp5||800|r1|2',
      film: 'hp5',
      developer: undefined,
      iso: '800',
    });
  });

  it('opens unfiltered for a roll without a film', () => {
    expect(recipeListOpening({ roll: 'r1', at: '3' })).toEqual({
      key: '|||r1|3',
      film: undefined,
      developer: undefined,
      iso: undefined,
    });
  });

  it('ignores an ISO that is not a positive whole number', () => {
    for (const iso of ['0', '-400', '400.5', ' 400', '1e3']) {
      expect(recipeListOpening({ film: 'hp5', iso })?.iso).toBeUndefined();
    }
    expect(recipeListOpening({ film: 'hp5', iso: '0400' })?.iso).toBe('400');
  });

  it('tells two openings of the same roll apart by their marker', () => {
    const first = recipeListOpening({ film: 'hp5', roll: 'r1', at: '1' });
    const second = recipeListOpening({ film: 'hp5', roll: 'r1', at: '2' });
    expect(first?.key).not.toBe(second?.key);
  });
});

describe('isoToApply', () => {
  const hp5 = film({});
  const kentmere = film({
    uuid: 'f3',
    slug: 'kentmere-400',
    brand: 'Kentmere',
    name: 'Pan 400',
    baseFilmSlug: 'hp5',
  });
  const recipes = [
    combo({ filmSlug: 'hp5', filmStockId: 'f1', shootingIso: 400 }),
    combo({ filmSlug: 'hp5', filmStockId: 'f1', shootingIso: 1600 }),
    combo({ filmSlug: 'trix', filmStockId: 'f2', shootingIso: 320 }),
    combo({ filmSlug: 'kentmere-400', filmStockId: 'f3', shootingIso: 800 }),
  ];
  const catalog = [hp5, kentmere];

  it('keeps an ISO the film has a recipe at', () => {
    expect(
      isoToApply({ iso: '1600', film: hp5, films: catalog, recipes })
    ).toBe('1600');
  });

  it('drops an ISO no recipe for the film uses, even if another film has it', () => {
    expect(
      isoToApply({ iso: '320', film: hp5, films: catalog, recipes })
    ).toBeUndefined();
  });

  it('counts recipes of a rebrand of the film, as the browser does', () => {
    expect(isoToApply({ iso: '800', film: hp5, films: catalog, recipes })).toBe(
      '800'
    );
    expect(
      isoToApply({ iso: '400', film: kentmere, films: catalog, recipes })
    ).toBe('400');
  });

  it('drops the ISO without a film or an ISO', () => {
    expect(
      isoToApply({ iso: '400', film: null, films: catalog, recipes })
    ).toBeUndefined();
    expect(
      isoToApply({ iso: undefined, film: hp5, films: catalog, recipes })
    ).toBeUndefined();
  });
});

describe('rollForRecipeOpen', () => {
  it('carries the roll while the film is the one the opening set', () => {
    expect(
      rollForRecipeOpen({
        openingRoll: 'r1',
        openingFilm: 'hp5',
        currentFilm: 'hp5',
      })
    ).toBe('r1');
    expect(
      rollForRecipeOpen({
        openingRoll: 'r1',
        openingFilm: undefined,
        currentFilm: undefined,
      })
    ).toBe('r1');
  });

  it('drops it once the film changed or was cleared', () => {
    expect(
      rollForRecipeOpen({
        openingRoll: 'r1',
        openingFilm: 'hp5',
        currentFilm: 'trix',
      })
    ).toBeUndefined();
    expect(
      rollForRecipeOpen({
        openingRoll: 'r1',
        openingFilm: 'hp5',
        currentFilm: undefined,
      })
    ).toBeUndefined();
  });

  it('carries nothing without an opening roll', () => {
    expect(
      rollForRecipeOpen({
        openingRoll: undefined,
        openingFilm: 'hp5',
        currentFilm: 'hp5',
      })
    ).toBeUndefined();
  });
});

describe('isoToApply aliases', () => {
  // The base film is known by an old slug that is now an alias.
  const base = film({
    uuid: 'b1',
    slug: 'hp5-plus',
    aliases: [{ slug: 'hp5-old', name: 'HP5' }],
  });
  const rebrand = film({
    uuid: 'r1',
    slug: 'kentmere-400',
    baseFilmSlug: 'hp5-old',
  });

  it('finds the base film by an alias slug, as the browser does', () => {
    const recipes = [
      combo({ filmSlug: 'hp5-plus', filmStockId: 'b1', shootingIso: 1600 }),
    ];
    expect(
      isoToApply({
        iso: '1600',
        film: rebrand,
        films: [base, rebrand],
        recipes,
      })
    ).toBe('1600');
  });

  it("matches a recipe stored under the film's own alias", () => {
    const recipes = [
      combo({ filmSlug: 'hp5-old', filmStockId: 'x', shootingIso: 800 }),
    ];
    expect(isoToApply({ iso: '800', film: base, films: [base], recipes })).toBe(
      '800'
    );
  });
});

describe('clearsOpeningIso', () => {
  it('clears the ISO the opening set while it is still in place', () => {
    expect(clearsOpeningIso({ openingIso: '400', currentIso: '400' })).toBe(
      true
    );
  });

  it('leaves an ISO the user chose since, or none set by the opening', () => {
    expect(clearsOpeningIso({ openingIso: '400', currentIso: '800' })).toBe(
      false
    );
    expect(clearsOpeningIso({ openingIso: '400', currentIso: '' })).toBe(false);
    expect(clearsOpeningIso({ openingIso: undefined, currentIso: '400' })).toBe(
      false
    );
  });
});
