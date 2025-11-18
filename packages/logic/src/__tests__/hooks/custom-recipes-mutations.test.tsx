import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import {
  useAddCustomRecipe,
  useUpdateCustomRecipe,
  useDeleteCustomRecipe,
  useClearCustomRecipes,
} from '../../hooks/custom-recipes/use-custom-recipe-mutations';
import type {
  CustomRecipe,
  CustomRecipeFormData,
} from '../../types/custom-recipes';
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { queryKeys } from '../../queries/query-keys';
import { JSDOM } from 'jsdom';

const STORAGE_KEY = 'dorkroom_custom_recipes';

const baseFormData: CustomRecipeFormData = {
  name: 'Test Recipe',
  useExistingFilm: true,
  selectedFilmId: 'film-1',
  customFilm: undefined,
  useExistingDeveloper: true,
  selectedDeveloperId: 'dev-1',
  customDeveloper: undefined,
  temperatureF: 68,
  timeMinutes: 9.5,
  shootingIso: 400,
  pushPull: 0,
  agitationSchedule: '30s every minute',
  notes: 'notes',
  customDilution: '',
  isPublic: false,
  tags: ['bw'],
  isFavorite: false,
};

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

const getQueryKey = () => queryKeys.customRecipes.list();

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

describe('custom recipe mutations', () => {
  it('optimistically appends recipes via useAddCustomRecipe', async () => {
    const { queryClient, wrapper } = createTestHarness();
    const queryKey = getQueryKey();
    queryClient.setQueryData(queryKey, []);

    const { result } = renderHook(() => useAddCustomRecipe(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(baseFormData);
    });

    const cached = queryClient.getQueryData<CustomRecipe[]>(queryKey);
    expect(cached).toHaveLength(1);
    expect(cached?.[0].name).toBe('Test Recipe');

    const persisted = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '[]'
    ) as CustomRecipe[];
    expect(persisted).toHaveLength(1);

    queryClient.clear();
  });

  it('updates existing recipes via useUpdateCustomRecipe', async () => {
    const { queryClient, wrapper } = createTestHarness();
    const queryKey = getQueryKey();
    const existing = createStoredRecipe();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([existing]));
    queryClient.setQueryData(queryKey, [existing]);

    const { result } = renderHook(() => useUpdateCustomRecipe(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: existing.id,
        formData: {
          ...baseFormData,
          name: 'Updated Recipe',
          selectedFilmId: existing.filmId,
          selectedDeveloperId: existing.developerId,
        },
      });
    });

    const cached = queryClient.getQueryData<CustomRecipe[]>(queryKey);
    expect(cached?.[0].name).toBe('Updated Recipe');

    const persisted = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '[]'
    ) as CustomRecipe[];
    expect(persisted[0].name).toBe('Updated Recipe');

    queryClient.clear();
  });

  it('removes recipes via useDeleteCustomRecipe', async () => {
    const { queryClient, wrapper } = createTestHarness();
    const queryKey = getQueryKey();
    const existing = createStoredRecipe();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([existing]));
    queryClient.setQueryData(queryKey, [existing]);

    const { result } = renderHook(() => useDeleteCustomRecipe(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(existing.id);
    });

    const cached = queryClient.getQueryData<CustomRecipe[]>(queryKey);
    expect(cached).toHaveLength(0);

    const persisted = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '[]'
    ) as CustomRecipe[];
    expect(persisted).toHaveLength(0);

    queryClient.clear();
  });

  it('clears recipes via useClearCustomRecipes', async () => {
    const { queryClient, wrapper } = createTestHarness();
    const queryKey = getQueryKey();
    const existing = [
      createStoredRecipe({ id: 'one' }),
      createStoredRecipe({ id: 'two', name: 'Second' }),
    ];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    queryClient.setQueryData(queryKey, existing);

    const { result } = renderHook(() => useClearCustomRecipes(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    const cached = queryClient.getQueryData<CustomRecipe[]>(queryKey);
    expect(cached).toHaveLength(0);

    const persisted = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '[]'
    ) as CustomRecipe[];
    expect(persisted).toHaveLength(0);

    queryClient.clear();
  });
});
