import type { Developer, Film } from '@dorkroom/api';
import type { CustomRecipe } from '@dorkroom/logic';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
