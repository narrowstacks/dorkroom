import type { Combination, Developer, Film } from '@dorkroom/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '../../../queries/query-keys';
import { useFilmRecipes } from '../use-film-recipes';

const combo = (
  filmSlug: string,
  developerSlug: string,
  shootingIso: number,
  overrides: Partial<Combination> = {}
): Combination => ({
  id: 1,
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

const makeWrapper = (client: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };

const hp5: Film = {
  id: 1,
  uuid: 'hp5',
  slug: 'hp5-plus',
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
  imageCredit: null,
  imageSourceUrl: null,
  aliases: [],
  baseFilmSlug: null,
  dateAdded: '2023-01-01',
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
};
const portra: Film = {
  ...hp5,
  slug: 'portra-400',
  name: 'Portra 400',
  colorType: 'color',
};

const seededClient = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  });
  client.setQueryData(queryKeys.combinations.list(), [
    combo('hp5-plus', 'ilford-ddx', 400, { dilutionId: '2' }),
    combo('hp5-plus', 'ilford-ddx', 1600),
    combo('portra-400', 'rodinal', 400),
  ]);
  return client;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useFilmRecipes', () => {
  it('counts and groups from the shared cache, resolving dilutions', () => {
    const client = seededClient();
    client.setQueryData(queryKeys.developers.list(), [ddx]);

    const { result } = renderHook(
      () => useFilmRecipes({ detailsEnabled: true }),
      { wrapper: makeWrapper(client) }
    );

    expect(result.current.getRecipeCount(hp5)).toBe(2);
    expect(result.current.developersReady).toBe(true);

    const { groups, defaultIso } = result.current.getRecipeGroups(hp5);
    expect(groups.map((g) => g.shootingIso)).toEqual([400, 1600]);
    expect(defaultIso).toBe(400);
    expect(groups[0].recipes[0].dilution).toBe('1+4');
    expect(groups[0].recipes[0].developerName).toBe('DD-X');
  });

  it('never reports recipes for a color film, even with a recipe row', () => {
    const { result } = renderHook(() => useFilmRecipes(), {
      wrapper: makeWrapper(seededClient()),
    });
    expect(result.current.recipeCounts.get('portra-400')).toBe(1);
    expect(result.current.getRecipeCount(portra)).toBe(0);
    expect(result.current.getRecipeGroups(portra).groups).toEqual([]);
  });

  it('counts without fetching developers by default', () => {
    const client = seededClient();
    const { result } = renderHook(() => useFilmRecipes(), {
      wrapper: makeWrapper(client),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.getRecipeCount(hp5)).toBe(2);
    expect(result.current.developersReady).toBe(false);
    expect(
      client.getQueryState(queryKeys.developers.list())?.fetchStatus
    ).toBeUndefined();
    // Dilution is unknown, not Stock, for a recipe with a dilution id.
    const [tab400] = result.current.getRecipeGroups(hp5).groups;
    expect(tab400.recipes[0].dilution).toBeNull();
    expect(tab400.recipes[0].developerName).toBeNull();
  });

  it('fetches developers once details are enabled', () => {
    const client = seededClient();
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    renderHook(() => useFilmRecipes({ detailsEnabled: true }), {
      wrapper: makeWrapper(client),
    });
    expect(client.getQueryState(queryKeys.developers.list())?.fetchStatus).toBe(
      'fetching'
    );
  });

  it('surfaces a developers failure and never shows wrong data as right', async () => {
    const client = seededClient();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('developers down')))
    );
    const { result } = renderHook(
      () => useFilmRecipes({ detailsEnabled: true }),
      { wrapper: makeWrapper(client) }
    );

    await waitFor(() => expect(result.current.developersError).not.toBeNull());
    expect(result.current.developersReady).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.getRecipeCount(hp5)).toBe(2);
    const [tab400, tab1600] = result.current.getRecipeGroups(hp5).groups;
    expect(tab400.recipes[0].dilution).toBeNull();
    expect(tab400.recipes[0].developerName).toBeNull();
    // No dilution id and no custom dilution is Stock whatever the developer.
    expect(tab1600.recipes[0].dilution).toBe('Stock');
  });

  it('does not fetch when disabled', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(
      () => useFilmRecipes({ enabled: false, detailsEnabled: true }),
      { wrapper: makeWrapper(client) }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.recipeCounts.size).toBe(0);
    expect(client.isFetching()).toBe(0);
    expect(result.current.getRecipeGroups(hp5)).toEqual({
      groups: [],
      defaultIso: undefined,
    });
  });
});
