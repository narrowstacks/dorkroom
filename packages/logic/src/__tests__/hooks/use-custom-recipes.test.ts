import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CUSTOM_RECIPES_STORAGE_KEY } from '../../constants/storage-keys';
import { useCustomRecipes } from '../../hooks/custom-recipes/use-custom-recipes';
import {
  createCustomRecipeStore,
  createMemoryRecipeAdapter,
} from '../../services/custom-recipe-store';
import type {
  CustomRecipe,
  CustomRecipeFormData,
} from '../../types/custom-recipes';

const formData: CustomRecipeFormData = {
  name: 'Hook Recipe',
  useExistingFilm: true,
  selectedFilmId: 'film-1',
  useExistingDeveloper: true,
  selectedDeveloperId: 'dev-1',
  temperatureF: 68,
  timeMinutes: 9.5,
  shootingIso: 400,
  pushPull: 0,
  agitationSchedule: '',
  notes: '',
  customDilution: '',
  isPublic: false,
  tags: [],
  isFavorite: false,
};

const stored: CustomRecipe = {
  id: 'stored',
  name: 'Stored',
  filmId: 'film-1',
  developerId: 'dev-1',
  temperatureF: 68,
  timeMinutes: 8,
  shootingIso: 400,
  pushPull: 0,
  isCustomFilm: false,
  isCustomDeveloper: false,
  dateCreated: '2023-01-01T00:00:00.000Z',
  dateModified: '2023-01-01T00:00:00.000Z',
  isPublic: false,
};

afterEach(() => {
  window.localStorage.clear();
});

describe('useCustomRecipes', () => {
  it('returns stored recipes on the first render, with no provider', () => {
    window.localStorage.setItem(
      CUSTOM_RECIPES_STORAGE_KEY,
      JSON.stringify([stored])
    );
    const { result } = renderHook(() => useCustomRecipes());
    expect(result.current.customRecipes).toEqual([stored]);
  });

  it('re-renders after add, update and delete', () => {
    const store = createCustomRecipeStore(createMemoryRecipeAdapter());
    const { result } = renderHook(() => useCustomRecipes(store));

    let id = '';
    act(() => {
      id = result.current.addCustomRecipe(formData);
    });
    expect(result.current.customRecipes.map((r) => r.id)).toEqual([id]);

    act(() => {
      const saved = result.current.updateCustomRecipe(id, {
        ...formData,
        name: 'Renamed',
      });
      expect(saved.name).toBe('Renamed');
    });
    expect(result.current.customRecipes[0].name).toBe('Renamed');

    act(() => {
      result.current.deleteCustomRecipe(id);
    });
    expect(result.current.customRecipes).toEqual([]);
  });

  it('keeps action identities stable across renders', () => {
    const store = createCustomRecipeStore(createMemoryRecipeAdapter());
    const { result, rerender } = renderHook(() => useCustomRecipes(store));
    const first = result.current;
    rerender();
    expect(result.current.addCustomRecipe).toBe(first.addCustomRecipe);
    expect(result.current.updateCustomRecipe).toBe(first.updateCustomRecipe);
    expect(result.current.deleteCustomRecipe).toBe(first.deleteCustomRecipe);
  });

  it('picks up changes another tab writes', () => {
    const { result } = renderHook(() => useCustomRecipes());
    expect(result.current.customRecipes).toEqual([]);

    act(() => {
      window.localStorage.setItem(
        CUSTOM_RECIPES_STORAGE_KEY,
        JSON.stringify([stored])
      );
      window.dispatchEvent(
        new StorageEvent('storage', { key: CUSTOM_RECIPES_STORAGE_KEY })
      );
    });
    expect(result.current.customRecipes).toEqual([stored]);
  });

  it('shares one list between components using the same store', () => {
    const store = createCustomRecipeStore(createMemoryRecipeAdapter());
    const a = renderHook(() => useCustomRecipes(store));
    const b = renderHook(() => useCustomRecipes(store));

    act(() => {
      a.result.current.addCustomRecipe(formData);
    });
    expect(b.result.current.customRecipes).toHaveLength(1);
  });
});
