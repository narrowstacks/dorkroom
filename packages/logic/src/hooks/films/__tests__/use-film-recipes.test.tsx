import type { Combination, Developer } from '@dorkroom/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
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

describe('useFilmRecipes', () => {
  it('reads the shared combinations cache and groups by ISO', () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
      },
    });
    client.setQueryData(queryKeys.combinations.list(), [
      combo('hp5-plus', 'ilford-ddx', 400, { dilutionId: '2' }),
      combo('hp5-plus', 'ilford-ddx', 1600),
      combo('tri-x-400', 'rodinal', 400),
    ]);
    client.setQueryData(queryKeys.developers.list(), [ddx]);

    const { result } = renderHook(() => useFilmRecipes(), {
      wrapper: makeWrapper(client),
    });

    expect(result.current.getRecipeCount('hp5-plus')).toBe(2);
    expect(result.current.recipeCounts.get('tri-x-400')).toBe(1);
    expect(result.current.getRecipeCount('pan-f-plus')).toBe(0);

    const { groups, defaultIso } = result.current.getRecipeGroups(
      'hp5-plus',
      400
    );
    expect(groups.map((g) => g.shootingIso)).toEqual([400, 1600]);
    expect(defaultIso).toBe(400);
    expect(groups[0].recipes[0].dilution).toBe('1+4');
    expect(groups[0].recipes[0].developerName).toBe('DD-X');
  });

  it('does not fetch when disabled', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useFilmRecipes({ enabled: false }), {
      wrapper: makeWrapper(client),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.recipeCounts.size).toBe(0);
    expect(client.isFetching()).toBe(0);
    expect(result.current.getRecipeGroups('hp5-plus', 400)).toEqual({
      groups: [],
      defaultIso: undefined,
    });
  });
});
