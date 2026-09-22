import type { CustomRecipe } from '@dorkroom/logic';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type UseRecipeDataProps, useRecipeData } from '../useRecipeData';

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
