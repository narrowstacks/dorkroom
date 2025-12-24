import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { useCustomRecipesUnified } from '../../hooks/custom-recipes/use-custom-recipes-unified';
import type { CustomRecipe } from '../../types/custom-recipes';

const STORAGE_KEY = 'dorkroom_custom_recipes';

const createStoredRecipe = (
  overrides: Partial<CustomRecipe> = {}
): CustomRecipe => ({
  id: overrides.id ?? 'custom_recipe',
  name: overrides.name ?? 'Stored Recipe',
  filmId: overrides.filmId ?? 'film-1',
  developerId: overrides.developerId ?? 'dev-1',
  temperatureF: overrides.temperatureF ?? 68,
  timeMinutes: overrides.timeMinutes ?? 8,
  shootingIso: overrides.shootingIso ?? 400,
  pushPull: overrides.pushPull ?? 0,
  agitationSchedule: overrides.agitationSchedule ?? '30s every minute',
  notes: overrides.notes ?? '',
  dilutionId: overrides.dilutionId,
  customDilution: overrides.customDilution ?? '',
  isCustomFilm: overrides.isCustomFilm ?? false,
  isCustomDeveloper: overrides.isCustomDeveloper ?? false,
  customFilm: overrides.customFilm,
  customDeveloper: overrides.customDeveloper,
  dateCreated: overrides.dateCreated ?? new Date(2023, 0, 1).toISOString(),
  dateModified: overrides.dateModified ?? new Date(2023, 0, 1).toISOString(),
  isPublic: overrides.isPublic ?? false,
  tags: overrides.tags ?? ['bw'],
});

const createTestHarness = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, wrapper };
};

beforeAll(() => {
  if (typeof window === 'undefined') {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://dorkroom.test',
    });
    const globalWithDom = globalThis as unknown as {
      window: Window & typeof globalThis;
      document: Document;
      navigator: Navigator;
    };
    globalWithDom.window = dom.window as unknown as Window & typeof globalThis;
    globalWithDom.document = dom.window.document;
    globalWithDom.navigator = dom.window.navigator;
  }
});

afterEach(() => {
  window.localStorage.clear();
});

describe('useCustomRecipesUnified', () => {
  it('returns custom recipes from localStorage', async () => {
    const { wrapper } = createTestHarness();
    const storedRecipe = createStoredRecipe({ name: 'My Recipe' });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([storedRecipe]));

    const { result } = renderHook(() => useCustomRecipesUnified(), { wrapper });

    await waitFor(() => {
      expect(result.current.customRecipes).toHaveLength(1);
    });

    expect(result.current.customRecipes[0].name).toBe('My Recipe');
  });

  it('forceRefresh returns fresh data after localStorage changes', async () => {
    const { wrapper } = createTestHarness();
    const initialRecipe = createStoredRecipe({
      id: 'recipe-1',
      name: 'Initial Recipe',
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([initialRecipe]));

    const { result } = renderHook(() => useCustomRecipesUnified(), { wrapper });

    // Wait for initial data to load
    await waitFor(() => {
      expect(result.current.customRecipes).toHaveLength(1);
    });

    expect(result.current.customRecipes[0].name).toBe('Initial Recipe');

    // Simulate external update to localStorage (e.g., from a mutation)
    const updatedRecipe = createStoredRecipe({
      id: 'recipe-1',
      name: 'Updated Recipe',
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([updatedRecipe]));

    // Call forceRefresh and verify it returns the fresh data
    let refreshedRecipes: CustomRecipe[] = [];
    await act(async () => {
      refreshedRecipes = await result.current.forceRefresh();
    });

    // The returned data should be the fresh data from localStorage
    expect(refreshedRecipes).toHaveLength(1);
    expect(refreshedRecipes[0].name).toBe('Updated Recipe');

    // The hook state should also be updated
    await waitFor(() => {
      expect(result.current.customRecipes[0].name).toBe('Updated Recipe');
    });
  });

  it('forceRefresh returns fresh data when new recipes are added', async () => {
    const { wrapper } = createTestHarness();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

    const { result } = renderHook(() => useCustomRecipesUnified(), { wrapper });

    // Wait for initial empty state
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.customRecipes).toHaveLength(0);

    // Add a recipe to localStorage
    const newRecipe = createStoredRecipe({
      id: 'new-recipe',
      name: 'New Recipe',
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([newRecipe]));

    // Call forceRefresh and verify it returns the new recipe
    let refreshedRecipes: CustomRecipe[] = [];
    await act(async () => {
      refreshedRecipes = await result.current.forceRefresh();
    });

    expect(refreshedRecipes).toHaveLength(1);
    expect(refreshedRecipes[0].name).toBe('New Recipe');
  });

  it('forceRefresh returns empty array when localStorage is cleared', async () => {
    const { wrapper } = createTestHarness();
    const initialRecipe = createStoredRecipe({ name: 'Initial Recipe' });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([initialRecipe]));

    const { result } = renderHook(() => useCustomRecipesUnified(), { wrapper });

    // Wait for initial data
    await waitFor(() => {
      expect(result.current.customRecipes).toHaveLength(1);
    });

    // Clear localStorage
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

    // Call forceRefresh
    let refreshedRecipes: CustomRecipe[] = [];
    await act(async () => {
      refreshedRecipes = await result.current.forceRefresh();
    });

    expect(refreshedRecipes).toHaveLength(0);
  });
});
