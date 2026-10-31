import type { Combination, Developer, Film } from '@dorkroom/api';
import type { ColumnDef, SortingFnOption } from '@tanstack/react-table';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  type DevelopmentCombinationView,
  useDevelopmentTable,
} from '../use-development-table';

// The 'favoriteAware' key is typed by a module augmentation that lives in
// @dorkroom/ui (types/tanstack-table.d.ts), which logic cannot import. The
// hook registers the fn under this key at runtime, so name it by cast.
// SAFETY: useDevelopmentTable registers `favoriteAware` in `sortingFns`.
const FAVORITE_AWARE =
  'favoriteAware' as SortingFnOption<DevelopmentCombinationView>;

describe('useDevelopmentTable', () => {
  const mockFilm: Film = {
    id: 1,
    uuid: 'f1',
    slug: 'hp5',
    name: 'HP5 Plus',
    brand: 'Ilford',
    isoSpeed: 400,
    colorType: 'bw',
    grainStructure: 'classic',
    description: 'Classic film',
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: false,
    staticImageUrl: null,
    aliases: [],
    baseFilmSlug: null,
    dateAdded: '2023-01-01',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  };

  const mockDeveloper: Developer = {
    id: 1,
    uuid: 'd1',
    slug: 'dd-x',
    name: 'DD-X',
    manufacturer: 'Ilford',
    type: 'liquid',
    description: 'Standard dev',
    filmOrPaper: true,
    dilutions: [],
    mixingInstructions: null,
    storageRequirements: null,
    safetyNotes: null,
    notes: null,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  };

  const createMockCombination = (
    overrides: Partial<Combination> = {}
  ): Combination => ({
    id: 1,
    uuid: 'c1',
    name: 'HP5 Plus in DD-X',
    filmStockId: 'f1',
    developerId: 'd1',
    dilutionId: '1',
    pushPull: 0,
    shootingIso: 400,
    timeMinutes: 8,
    temperatureF: 68,
    temperatureC: 20,
    agitationMethod: 'continuous',
    agitationSchedule: null,
    notes: null,
    infoSource: null,
    customDilution: null,
    filmSlug: 'hp5',
    developerSlug: 'dd-x',
    tags: [],
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
    ...overrides,
  });

  const createMockRows = (): DevelopmentCombinationView[] => [
    {
      combination: createMockCombination({
        id: 1,
        uuid: 'c1',
        shootingIso: 400,
        timeMinutes: 8,
        temperatureF: 68,
      }),
      film: mockFilm,
      developer: mockDeveloper,
      source: 'api',
    },
    {
      combination: createMockCombination({
        id: 2,
        uuid: 'c2',
        shootingIso: 200,
        timeMinutes: 10,
        temperatureF: 70,
      }),
      film: mockFilm,
      developer: mockDeveloper,
      source: 'api',
    },
    {
      combination: createMockCombination({
        id: 3,
        uuid: 'c3',
        shootingIso: 800,
        timeMinutes: 6,
        temperatureF: 65,
      }),
      film: mockFilm,
      developer: mockDeveloper,
      source: 'api',
    },
  ];

  // Minimal column definitions for testing (avoiding a circular dependency with
  // @dorkroom/ui). Like ui/table-columns.tsx, every sortable column uses the
  // 'favoriteAware' sorting fn the hook registers, so the hook's own sorter
  // runs rather than TanStack's default.
  const createTestColumns = (): ColumnDef<DevelopmentCombinationView>[] => [
    {
      id: 'film',
      accessorKey: 'film',
      header: 'Film',
      enableSorting: true,
      sortingFn: FAVORITE_AWARE,
    },
    {
      id: 'developer',
      accessorKey: 'developer',
      header: 'Developer',
      enableSorting: true,
      sortingFn: FAVORITE_AWARE,
    },
    {
      id: 'combination.shootingIso',
      accessorFn: (row) => row.combination.shootingIso,
      header: 'ISO',
      enableSorting: true,
      sortingFn: FAVORITE_AWARE,
    },
    {
      id: 'combination.timeMinutes',
      accessorFn: (row) => row.combination.timeMinutes,
      header: 'Time',
      enableSorting: true,
      sortingFn: FAVORITE_AWARE,
    },
    {
      id: 'combination.temperatureF',
      accessorFn: (row) => row.combination.temperatureF,
      header: 'Temp',
      enableSorting: true,
      sortingFn: FAVORITE_AWARE,
    },
  ];

  const uuidsOf = (table: ReturnType<typeof useDevelopmentTable>) =>
    table.getRowModel().rows.map((row) => row.original.combination.uuid);

  it.each([
    ['ISO ascending', 'combination.shootingIso', false, ['c2', 'c1', 'c3']],
    ['ISO descending', 'combination.shootingIso', true, ['c3', 'c1', 'c2']],
    ['time ascending', 'combination.timeMinutes', false, ['c3', 'c1', 'c2']],
    ['time descending', 'combination.timeMinutes', true, ['c2', 'c1', 'c3']],
    [
      'temperature ascending',
      'combination.temperatureF',
      false,
      ['c3', 'c1', 'c2'],
    ],
    [
      'temperature descending',
      'combination.temperatureF',
      true,
      ['c2', 'c1', 'c3'],
    ],
  ])('sorts by %s', (_name, id, desc, expected) => {
    const rows = createMockRows();
    const columns = createTestColumns();

    const { result } = renderHook(() =>
      useDevelopmentTable({
        rows,
        columns,
        sorting: [{ id, desc }],
        onSortingChange: () => {},
        pageIndex: 0,
        onPageIndexChange: () => {},
        isFavorite: () => false,
      })
    );

    expect(uuidsOf(result.current)).toEqual(expected);
  });

  it('sorts by film label', () => {
    const otherFilm: Film = {
      ...mockFilm,
      id: 2,
      uuid: 'f2',
      slug: 'tri-x',
      name: 'Tri-X 400',
      brand: 'Kodak',
    };
    const rows = createMockRows();
    // c1 -> Kodak Tri-X, c2 and c3 -> Ilford HP5 Plus
    rows[0] = { ...rows[0], film: otherFilm };
    const columns = createTestColumns();

    const { result } = renderHook(() =>
      useDevelopmentTable({
        rows,
        columns,
        sorting: [{ id: 'film', desc: false }],
        onSortingChange: () => {},
        pageIndex: 0,
        onPageIndexChange: () => {},
        isFavorite: () => false,
      })
    );

    // "Ilford HP5 Plus" sorts before "Kodak Tri-X 400"; ties keep input order.
    expect(uuidsOf(result.current)).toEqual(['c2', 'c3', 'c1']);
  });

  it('sorts by developer label', () => {
    const otherDeveloper: Developer = {
      ...mockDeveloper,
      id: 2,
      uuid: 'd2',
      slug: 'd-76',
      name: 'D-76',
      manufacturer: 'Kodak',
    };
    const rows = createMockRows();
    // c2 -> Kodak D-76, c1 and c3 -> Ilford DD-X
    rows[1] = { ...rows[1], developer: otherDeveloper };
    const columns = createTestColumns();

    const { result } = renderHook(() =>
      useDevelopmentTable({
        rows,
        columns,
        sorting: [{ id: 'developer', desc: false }],
        onSortingChange: () => {},
        pageIndex: 0,
        onPageIndexChange: () => {},
        isFavorite: () => false,
      })
    );

    expect(uuidsOf(result.current)).toEqual(['c1', 'c3', 'c2']);
  });

  it('keeps favorites first regardless of sorting', () => {
    const rows = createMockRows();
    const columns = createTestColumns();
    // c3 has the highest ISO, so an ISO-ascending sort alone puts it last.
    const isFavorite = (id: string) => id === 'c3';

    const { result } = renderHook(() =>
      useDevelopmentTable({
        rows,
        columns,
        sorting: [{ id: 'combination.shootingIso', desc: false }],
        onSortingChange: () => {},
        pageIndex: 0,
        onPageIndexChange: () => {},
        isFavorite,
      })
    );

    // The favorite leads, then the rest by ISO: 200 (c2), 400 (c1).
    expect(uuidsOf(result.current)).toEqual(['c3', 'c2', 'c1']);
  });

  const sortWithFavorites = (
    id: string,
    desc: boolean,
    favorites: string[],
    rows = createMockRows()
  ) =>
    uuidsOf(
      renderHook(() =>
        useDevelopmentTable({
          rows,
          columns: createTestColumns(),
          sorting: [{ id, desc }],
          onSortingChange: () => {},
          pageIndex: 0,
          onPageIndexChange: () => {},
          isFavorite: (key) => favorites.includes(key),
        })
      ).result.current
    );

  // Rows: c1 (ISO 400, 8 min, 68F), c2 (200, 10, 70), c3 (800, 6, 65).
  // c2 is favorited, so it leads either way and the rest follow the column.
  it.each([
    ['ISO', 'combination.shootingIso', ['c2', 'c1', 'c3'], ['c2', 'c3', 'c1']],
    ['time', 'combination.timeMinutes', ['c2', 'c3', 'c1'], ['c2', 'c1', 'c3']],
    [
      'temperature',
      'combination.temperatureF',
      ['c2', 'c3', 'c1'],
      ['c2', 'c1', 'c3'],
    ],
  ])(
    'keeps a favorite first on %s, both directions (#498)',
    (_n, id, asc, desc) => {
      expect(sortWithFavorites(id, false, ['c2'])).toEqual(asc);
      expect(sortWithFavorites(id, true, ['c2'])).toEqual(desc);
    }
  );

  it('keeps a favorite first on film and developer descending (#498)', () => {
    const rows = createMockRows();
    rows[0] = { ...rows[0], film: { ...mockFilm, brand: 'Kodak', name: 'A' } };
    rows[1] = { ...rows[1], film: { ...mockFilm, brand: 'Fuji', name: 'B' } };
    rows[2] = { ...rows[2], film: { ...mockFilm, brand: 'Ilford', name: 'C' } };
    // Film labels: c1 Kodak, c2 Fuji, c3 Ilford. Favorite c2 leads; descending
    // the rest are Kodak (c1) then Ilford (c3).
    expect(sortWithFavorites('film', true, ['c2'], rows)).toEqual([
      'c2',
      'c1',
      'c3',
    ]);
    expect(sortWithFavorites('film', false, ['c2'], rows)).toEqual([
      'c2',
      'c3',
      'c1',
    ]);

    const devRows = createMockRows();
    devRows[0] = {
      ...devRows[0],
      developer: { ...mockDeveloper, manufacturer: 'Kodak', name: 'D-76' },
    };
    devRows[1] = {
      ...devRows[1],
      developer: { ...mockDeveloper, manufacturer: 'Fuji', name: 'X' },
    };
    devRows[2] = {
      ...devRows[2],
      developer: { ...mockDeveloper, manufacturer: 'Ilford', name: 'DD-X' },
    };
    expect(sortWithFavorites('developer', true, ['c2'], devRows)).toEqual([
      'c2',
      'c1',
      'c3',
    ]);
    expect(sortWithFavorites('developer', false, ['c2'], devRows)).toEqual([
      'c2',
      'c3',
      'c1',
    ]);
  });

  it('sorts several favorites among themselves in the chosen direction (#498)', () => {
    // c1 (ISO 400) and c3 (800) are favorites; c2 (200) is not.
    expect(
      sortWithFavorites('combination.shootingIso', false, ['c1', 'c3'])
    ).toEqual(['c1', 'c3', 'c2']);
    expect(
      sortWithFavorites('combination.shootingIso', true, ['c1', 'c3'])
    ).toEqual(['c3', 'c1', 'c2']);
  });

  it('reports the next sorting state through onSortingChange', () => {
    const rows = createMockRows();
    const columns = createTestColumns();
    const onSortingChange = vi.fn();

    const { result } = renderHook(() =>
      useDevelopmentTable({
        rows,
        columns,
        sorting: [{ id: 'combination.shootingIso', desc: false }],
        onSortingChange,
        pageIndex: 0,
        onPageIndexChange: () => {},
        isFavorite: () => false,
      })
    );

    act(() => {
      result.current.setSorting([
        { id: 'combination.timeMinutes', desc: true },
      ]);
    });

    expect(onSortingChange).toHaveBeenCalledTimes(1);
    expect(onSortingChange).toHaveBeenCalledWith([
      { id: 'combination.timeMinutes', desc: true },
    ]);
  });

  it('reports a page change through onPageIndexChange only when it moves', () => {
    const rows = createMockRows();
    const columns = createTestColumns();
    const onPageIndexChange = vi.fn();

    const { result } = renderHook(() =>
      useDevelopmentTable({
        rows,
        columns,
        sorting: [],
        onSortingChange: () => {},
        pageIndex: 2,
        onPageIndexChange,
        isFavorite: () => false,
      })
    );

    act(() => {
      result.current.setPageIndex(5);
    });
    expect(onPageIndexChange).toHaveBeenCalledTimes(1);
    expect(onPageIndexChange).toHaveBeenCalledWith(5);

    // Re-selecting the current page is not a change.
    act(() => {
      result.current.setPageIndex(2);
    });
    expect(onPageIndexChange).toHaveBeenCalledTimes(1);
  });

  it('shows 24 rows per page and the rows for the requested page', () => {
    const base = createMockRows()[0];
    const rows = Array.from({ length: 30 }, (_, i) => ({
      ...base,
      combination: { ...base.combination, id: i + 1, uuid: `row-${i + 1}` },
    }));
    const columns = createTestColumns();
    const render = (pageIndex: number) =>
      renderHook(() =>
        useDevelopmentTable({
          rows,
          columns,
          sorting: [],
          onSortingChange: () => {},
          pageIndex,
          onPageIndexChange: () => {},
          isFavorite: () => false,
        })
      ).result.current;

    const first = uuidsOf(render(0));
    expect(first).toHaveLength(24);
    expect(first[0]).toBe('row-1');

    const second = uuidsOf(render(1));
    expect(second).toEqual(
      Array.from({ length: 6 }, (_, i) => `row-${25 + i}`)
    );
  });
});
