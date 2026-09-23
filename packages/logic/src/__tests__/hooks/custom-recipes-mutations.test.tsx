import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  useAddCustomRecipe,
  useClearCustomRecipes,
  useDeleteCustomRecipe,
  useUpdateCustomRecipe,
} from '../../hooks/custom-recipes/use-custom-recipe-mutations';
import { queryKeys } from '../../queries/query-keys';
import { createStorageManager, isArray } from '../../services/local-storage';
import type {
  CustomRecipe,
  CustomRecipeFormData,
} from '../../types/custom-recipes';

const STORAGE_KEY = 'dorkroom_custom_recipes';

/** The same manager the mutations use, so assertions see what the app loads. */
const recipesStorage = createStorageManager<CustomRecipe[]>(STORAGE_KEY, {
  defaultValue: [],
  validate: isArray(),
});

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

    const persisted = recipesStorage.read();
    expect(persisted).toHaveLength(1);

    queryClient.clear();
  });

  it('updates existing recipes via useUpdateCustomRecipe', async () => {
    const { queryClient, wrapper } = createTestHarness();
    const queryKey = getQueryKey();
    const existing = createStoredRecipe();
    recipesStorage.write([existing]);
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

    const persisted = recipesStorage.read();
    expect(persisted[0].name).toBe('Updated Recipe');

    queryClient.clear();
  });

  it('removes recipes via useDeleteCustomRecipe', async () => {
    const { queryClient, wrapper } = createTestHarness();
    const queryKey = getQueryKey();
    const existing = createStoredRecipe();
    recipesStorage.write([existing]);
    queryClient.setQueryData(queryKey, [existing]);

    const { result } = renderHook(() => useDeleteCustomRecipe(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(existing.id);
    });

    const cached = queryClient.getQueryData<CustomRecipe[]>(queryKey);
    expect(cached).toHaveLength(0);

    const persisted = recipesStorage.read();
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
    recipesStorage.write(existing);
    queryClient.setQueryData(queryKey, existing);

    const { result } = renderHook(() => useClearCustomRecipes(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    const cached = queryClient.getQueryData<CustomRecipe[]>(queryKey);
    expect(cached).toHaveLength(0);

    const persisted = recipesStorage.read();
    expect(persisted).toHaveLength(0);

    queryClient.clear();
  });

  // Regression for #323: an out-of-range recipe used to be persisted and then
  // crash /development on every load.
  it('rejects out-of-range values in useAddCustomRecipe without persisting', async () => {
    const { queryClient, wrapper } = createTestHarness();
    const queryKey = getQueryKey();
    queryClient.setQueryData(queryKey, []);

    const { result } = renderHook(() => useAddCustomRecipe(), { wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ ...baseFormData, temperatureF: 250 })
      ).rejects.toThrow('Temperature must be at most 212°F');
    });

    expect(queryClient.getQueryData<CustomRecipe[]>(queryKey)).toEqual([]);
    expect(recipesStorage.read()).toHaveLength(0);

    queryClient.clear();
  });

  it('rejects out-of-range values in useUpdateCustomRecipe without persisting', async () => {
    const { queryClient, wrapper } = createTestHarness();
    const queryKey = getQueryKey();
    const existing = createStoredRecipe();
    recipesStorage.write([existing]);
    queryClient.setQueryData(queryKey, [existing]);

    const { result } = renderHook(() => useUpdateCustomRecipe(), { wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          id: existing.id,
          formData: { ...baseFormData, pushPull: 9 },
        })
      ).rejects.toThrow('Push/pull must be at most +5 stops');
    });

    expect(queryClient.getQueryData<CustomRecipe[]>(queryKey)).toEqual([
      existing,
    ]);
    expect(recipesStorage.read()).toEqual([existing]);

    queryClient.clear();
  });
});

describe('custom recipe dilution persistence (#322)', () => {
  const addRecipe = async (formData: CustomRecipeFormData) => {
    const { queryClient, wrapper } = createTestHarness();
    queryClient.setQueryData(getQueryKey(), []);
    const { result } = renderHook(() => useAddCustomRecipe(), { wrapper });
    let saved: CustomRecipe | undefined;
    await act(async () => {
      saved = await result.current.mutateAsync(formData);
    });
    queryClient.clear();
    return saved;
  };

  const updateRecipe = async (
    existing: CustomRecipe,
    formData: CustomRecipeFormData
  ) => {
    const { queryClient, wrapper } = createTestHarness();
    recipesStorage.write([existing]);
    queryClient.setQueryData(getQueryKey(), [existing]);
    const { result } = renderHook(() => useUpdateCustomRecipe(), { wrapper });
    let saved: CustomRecipe | undefined;
    await act(async () => {
      saved = await result.current.mutateAsync({ id: existing.id, formData });
    });
    queryClient.clear();
    return saved;
  };

  it('persists a dilution picked from the dropdown', async () => {
    const saved = await addRecipe({
      ...baseFormData,
      selectedDilutionId: '69affee4-6a3f-44d2-8ec3-1dc83eca7449',
      customDilution: '1+1',
    });

    expect(saved?.dilutionId).toBe('69affee4-6a3f-44d2-8ec3-1dc83eca7449');
    // A stale free-text dilution would win over the id in every display.
    expect(saved?.customDilution).toBe('');

    const [persisted] = recipesStorage.read();
    expect(persisted.dilutionId).toBe('69affee4-6a3f-44d2-8ec3-1dc83eca7449');
    expect(persisted.customDilution).toBe('');
  });

  it("keeps the free-text dilution for the 'custom' option", async () => {
    const saved = await addRecipe({
      ...baseFormData,
      selectedDilutionId: 'custom',
      customDilution: '1+31',
    });

    expect(saved?.dilutionId).toBeUndefined();
    expect(saved?.customDilution).toBe('1+31');
  });

  it('keeps the free-text dilution when nothing is selected', async () => {
    const saved = await addRecipe({
      ...baseFormData,
      selectedDilutionId: '',
      customDilution: '1+31',
    });

    expect(saved?.dilutionId).toBeUndefined();
    expect(saved?.customDilution).toBe('1+31');
  });

  it('ignores a dropdown id when the developer is custom', async () => {
    const saved = await addRecipe({
      ...baseFormData,
      useExistingDeveloper: false,
      selectedDeveloperId: '',
      customDeveloper: {
        manufacturer: 'Home',
        name: 'Brew',
        type: 'liquid',
        filmOrPaper: 'film',
        dilutions: [{ name: 'Stock', dilution: 'Stock' }],
      },
      selectedDilutionId: '2',
      customDilution: '1+4',
    });

    expect(saved?.dilutionId).toBeUndefined();
    expect(saved?.customDilution).toBe('1+4');
  });

  it('replaces a stored dilution id with the newly picked one on edit', async () => {
    const saved = await updateRecipe(createStoredRecipe({ dilutionId: '1' }), {
      ...baseFormData,
      selectedDilutionId: '2',
    });

    expect(saved?.dilutionId).toBe('2');
    expect(recipesStorage.read()[0].dilutionId).toBe('2');
  });

  it('drops the stored dilution id when edited to a custom dilution', async () => {
    const saved = await updateRecipe(createStoredRecipe({ dilutionId: '1' }), {
      ...baseFormData,
      selectedDilutionId: 'custom',
      customDilution: '1+100',
    });

    expect(saved?.dilutionId).toBeUndefined();
    expect(saved?.customDilution).toBe('1+100');
  });
});
