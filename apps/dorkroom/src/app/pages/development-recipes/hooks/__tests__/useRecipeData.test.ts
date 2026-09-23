import type { Developer, Film } from '@dorkroom/api';
import type { CustomRecipe } from '@dorkroom/logic';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type UseRecipeDataProps, useRecipeData } from '../useRecipeData';

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

const makeFilm = (overrides: Partial<Film>): Film => ({
  id: 1,
  uuid: 'film-uuid-1',
  slug: 'kodak-tri-x',
  brand: 'Kodak',
  name: 'Tri-X',
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
  dateAdded: TIMESTAMP,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  ...overrides,
});

const makeDeveloper = (overrides: Partial<Developer>): Developer => ({
  id: 1,
  uuid: 'dev-uuid-1',
  slug: 'kodak-hc-110',
  name: 'HC-110',
  manufacturer: 'Kodak',
  type: 'liquid',
  description: '',
  filmOrPaper: true,
  dilutions: [],
  mixingInstructions: null,
  storageRequirements: null,
  safetyNotes: null,
  notes: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  ...overrides,
});

const film = makeFilm({});
const developer = makeDeveloper({
  uuid: 'dev-uuid-1',
  type: 'liquid',
  dilutions: [
    { id: '1', name: 'A', dilution: '1+15' },
    { id: '69affee4-6a3f-44d2-8ec3-1dc83eca7449', name: 'B', dilution: '1+31' },
  ],
});

const recipe = (
  id: string,
  dilution: Pick<CustomRecipe, 'dilutionId' | 'customDilution'>
): CustomRecipe => ({
  id,
  name: id,
  filmId: film.uuid,
  developerId: developer.uuid,
  temperatureF: 68,
  timeMinutes: 5,
  shootingIso: 400,
  pushPull: 0,
  isCustomFilm: false,
  isCustomDeveloper: false,
  dateCreated: '2026-01-01T00:00:00.000Z',
  dateModified: '2026-01-01T00:00:00.000Z',
  isPublic: false,
  ...dilution,
});

const customRecipes = [
  recipe('dropdown-b', { dilutionId: '69affee4-6a3f-44d2-8ec3-1dc83eca7449' }),
  recipe('free-text', { customDilution: '1+63' }),
  recipe('stock', {}),
];

const filterCustom = (dilutionFilter: string) => {
  const props: UseRecipeDataProps = {
    filteredCombinations: [],
    customRecipes,
    allFilms: [film],
    allDevelopers: [developer],
    selectedFilm: null,
    selectedDeveloper: developer,
    developerTypeFilter: '',
    dilutionFilter,
    isoFilter: '',
    customRecipeFilter: 'all',
    favoritesOnly: false,
    sharedCustomRecipe: null,
    flags: { CUSTOM_RECIPE_SHARING: true },
    isFavorite: () => false,
    getFilmById: (id) => (id === film.uuid ? film : undefined),
    getDeveloperById: (id) => (id === developer.uuid ? developer : undefined),
  };
  const { result } = renderHook(() => useRecipeData(props));
  return result.current.filteredCustomViews.map((v) => v.combination.uuid);
};

describe('custom recipe dilution filter (#322)', () => {
  it('matches a recipe saved with a dropdown dilution', () => {
    expect(filterCustom('1+31')).toEqual(['dropdown-b']);
  });

  it('still matches a free-text dilution', () => {
    expect(filterCustom('1+63')).toEqual(['free-text']);
  });

  it('treats a recipe with no dilution as Stock, like API recipes', () => {
    expect(filterCustom('stock')).toEqual(['stock']);
  });
});

const createRecipe = (overrides: Partial<CustomRecipe> = {}): CustomRecipe => ({
  id: 'custom-valid',
  name: 'Valid Recipe',
  filmId: 'film-uuid-1',
  developerId: 'dev-uuid-1',
  temperatureF: 68,
  timeMinutes: 9.5,
  shootingIso: 400,
  pushPull: 0,
  isCustomFilm: false,
  isCustomDeveloper: false,
  dateCreated: '2024-01-01T00:00:00.000Z',
  dateModified: '2024-01-01T00:00:00.000Z',
  isPublic: false,
  ...overrides,
});

type SharedRecipe = Omit<CustomRecipe, 'id' | 'dateCreated' | 'dateModified'>;

const createShared = (overrides: Partial<SharedRecipe> = {}): SharedRecipe => ({
  name: 'Shared Recipe',
  filmId: 'film-uuid-1',
  developerId: 'dev-uuid-1',
  temperatureF: 68,
  timeMinutes: 9.5,
  shootingIso: 400,
  pushPull: 0,
  isCustomFilm: false,
  isCustomDeveloper: false,
  isPublic: false,
  ...overrides,
});

const createProps = (
  overrides: Partial<UseRecipeDataProps> = {}
): UseRecipeDataProps => ({
  filteredCombinations: [],
  customRecipes: [],
  allFilms: [],
  allDevelopers: [],
  selectedFilm: null,
  selectedDeveloper: null,
  developerTypeFilter: '',
  dilutionFilter: '',
  isoFilter: '',
  customRecipeFilter: 'all',
  favoritesOnly: false,
  sharedCustomRecipe: null,
  flags: { CUSTOM_RECIPE_SHARING: true },
  isFavorite: () => false,
  getFilmById: () => undefined,
  getDeveloperById: () => undefined,
  ...overrides,
});

// Regression for #323: a recipe saved before range validation existed used to
// throw during render and crash /development on every load.
describe('useRecipeData with invalid stored recipes', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('skips out-of-range stored recipes and still renders valid ones', () => {
    const valid = createRecipe();
    const invalid = createRecipe({
      id: 'custom-invalid',
      name: 'Too Hot',
      temperatureF: 250,
    });

    const { result } = renderHook(() =>
      useRecipeData(createProps({ customRecipes: [invalid, valid] }))
    );

    expect(
      result.current.customCombinationViews.map((view) => view.combination.uuid)
    ).toEqual(['custom-valid']);
    expect(result.current.combinedRows).toHaveLength(1);
    expect(result.current.recipesByUuid.has('custom-valid')).toBe(true);
    expect(result.current.recipesByUuid.has('custom-invalid')).toBe(false);
  });

  it('returns no shared view for an out-of-range shared recipe', () => {
    const shared = createShared({ pushPull: 9 });

    const { result } = renderHook(() =>
      useRecipeData(createProps({ sharedCustomRecipe: shared }))
    );

    expect(result.current.sharedCustomRecipeView).toBeNull();
  });

  it('builds a shared view for a valid shared recipe', () => {
    const shared = createShared();

    const { result } = renderHook(() =>
      useRecipeData(createProps({ sharedCustomRecipe: shared }))
    );

    expect(result.current.sharedCustomRecipeView?.combination.uuid).toBe(
      'shared-custom'
    );
  });
});
