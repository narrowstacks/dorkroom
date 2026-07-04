import type { Combination, Developer, Film } from '@dorkroom/api';
import { describe, expect, it } from 'vitest';
import {
  buildRecipeViews,
  developerTypeOptions,
  filterRecipeViews,
} from './recipe-views';

const film = (over: Partial<Film>): Film =>
  ({
    id: 1,
    uuid: 'f1',
    slug: 'hp5',
    brand: 'Ilford',
    name: 'HP5 Plus',
    colorType: 'bw',
    isoSpeed: 400,
    grainStructure: null,
    description: '',
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: false,
    staticImageUrl: null,
    aliases: [],
    baseFilmSlug: null,
    dateAdded: '',
    createdAt: '',
    updatedAt: '',
    ...over,
  }) as Film;

const developer = (over: Partial<Developer>): Developer =>
  ({
    id: 1,
    uuid: 'd1',
    slug: 'd76',
    name: 'D-76',
    manufacturer: 'Kodak',
    type: 'Powder',
    description: '',
    filmOrPaper: true,
    dilutions: [],
    mixingInstructions: null,
    storageRequirements: null,
    safetyNotes: null,
    notes: null,
    createdAt: '',
    updatedAt: '',
    ...over,
  }) as Developer;

const combo = (over: Partial<Combination>): Combination =>
  ({
    id: 1,
    uuid: 'c1',
    name: '',
    filmStockId: 'f1',
    filmSlug: 'hp5',
    developerId: 'd1',
    developerSlug: 'd76',
    shootingIso: 400,
    dilutionId: null,
    customDilution: '1+1',
    temperatureC: 20,
    temperatureF: 68,
    timeMinutes: 8.5,
    agitationMethod: '',
    agitationSchedule: null,
    pushPull: 0,
    tags: ['pictorial'],
    notes: null,
    infoSource: null,
    createdAt: '',
    updatedAt: '',
    ...over,
  }) as Combination;

const films = [
  film({}),
  film({ uuid: 'f2', slug: 'trix', brand: 'Kodak', name: 'Tri-X' }),
];
const developers = [
  developer({}),
  developer({ uuid: 'd2', name: 'Rodinal', type: 'Liquid' }),
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
  it('matches punctuation-insensitive multi-word film query ("tri x")', () => {
    const out = filterRecipeViews(views, 'tri x', '');
    expect(out).toHaveLength(1);
    expect(out[0]?.film?.name).toBe('Tri-X');
  });
  it('matches punctuation-insensitive developer query ("d 76")', () => {
    const out = filterRecipeViews(views, 'd 76', '');
    expect(out).toHaveLength(2);
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
