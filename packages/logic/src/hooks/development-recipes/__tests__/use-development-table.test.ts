import type { Combination, Developer, Film } from '@dorkroom/api';
import type { ColumnDef } from '@tanstack/react-table';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  type DevelopmentCombinationView,
  useDevelopmentTable,
} from '../use-development-table';

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

  // Create minimal column definitions for testing (avoiding circular dependency with @dorkroom/ui)
  const createTestColumns = (): ColumnDef<DevelopmentCombinationView>[] => [
    {
      id: 'film',
      accessorKey: 'film',
      header: 'Film',
      enableSorting: true,
    },
    {
      id: 'developer',
      accessorKey: 'developer',
      header: 'Developer',
      enableSorting: true,
    },
    {
      id: 'combination.shootingIso',
      accessorFn: (row) => row.combination.shootingIso,
      header: 'ISO',
      enableSorting: true,
    },
    {
      id: 'combination.timeMinutes',
      accessorFn: (row) => row.combination.timeMinutes,
      header: 'Time',
      enableSorting: true,
    },
    {
      id: 'combination.temperatureF',
      accessorFn: (row) => row.combination.temperatureF,
      header: 'Temp',
      enableSorting: true,
    },
  ];

  it('should initialize table with default sorting', () => {
    const rows = createMockRows();
    const columns = createTestColumns();
    const isFavorite = () => false;

    const { result } = renderHook(() =>
      useDevelopmentTable({
        rows,
        columns,
        sorting: [{ id: 'film', desc: false }],
        onSortingChange: () => {},
        pageIndex: 0,
        onPageIndexChange: () => {},
        isFavorite,
      })
    );

    expect(result.current.getState().sorting).toEqual([
      { id: 'film', desc: false },
    ]);
  });

  it('should sort by ISO (low to high)', () => {
    const rows = createMockRows();
    const columns = createTestColumns();
    const isFavorite = () => false;

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

    const sortedRows = result.current.getRowModel().rows;

    // Verify sorting: 200, 400, 800
    expect(sortedRows[0].original.combination.shootingIso).toBe(200);
    expect(sortedRows[1].original.combination.shootingIso).toBe(400);
    expect(sortedRows[2].original.combination.shootingIso).toBe(800);
  });

  it('should sort by ISO (high to low)', () => {
    const rows = createMockRows();
    const columns = createTestColumns();
    const isFavorite = () => false;

    const { result } = renderHook(() =>
      useDevelopmentTable({
        rows,
        columns,
        sorting: [{ id: 'combination.shootingIso', desc: true }],
        onSortingChange: () => {},
        pageIndex: 0,
        onPageIndexChange: () => {},
        isFavorite,
      })
    );

    const sortedRows = result.current.getRowModel().rows;

    // Verify sorting: 800, 400, 200
    expect(sortedRows[0].original.combination.shootingIso).toBe(800);
    expect(sortedRows[1].original.combination.shootingIso).toBe(400);
    expect(sortedRows[2].original.combination.shootingIso).toBe(200);
  });

  it('should sort by time (short to long)', () => {
    const rows = createMockRows();
    const columns = createTestColumns();
    const isFavorite = () => false;

    const { result } = renderHook(() =>
      useDevelopmentTable({
        rows,
        columns,
        sorting: [{ id: 'combination.timeMinutes', desc: false }],
        onSortingChange: () => {},
        pageIndex: 0,
        onPageIndexChange: () => {},
        isFavorite,
      })
    );

    const sortedRows = result.current.getRowModel().rows;

    // Verify sorting: 6, 8, 10
    expect(sortedRows[0].original.combination.timeMinutes).toBe(6);
    expect(sortedRows[1].original.combination.timeMinutes).toBe(8);
    expect(sortedRows[2].original.combination.timeMinutes).toBe(10);
  });

  it('should sort by temperature (low to high)', () => {
    const rows = createMockRows();
    const columns = createTestColumns();
    const isFavorite = () => false;

    const { result } = renderHook(() =>
      useDevelopmentTable({
        rows,
        columns,
        sorting: [{ id: 'combination.temperatureF', desc: false }],
        onSortingChange: () => {},
        pageIndex: 0,
        onPageIndexChange: () => {},
        isFavorite,
      })
    );

    const sortedRows = result.current.getRowModel().rows;

    // Verify sorting: 65, 68, 70
    expect(sortedRows[0].original.combination.temperatureF).toBe(65);
    expect(sortedRows[1].original.combination.temperatureF).toBe(68);
    expect(sortedRows[2].original.combination.temperatureF).toBe(70);
  });

  it('should keep favorites first regardless of sorting', () => {
    const rows = createMockRows();
    const columns = createTestColumns();
    // Make c2 (ISO 200) a favorite
    const isFavorite = (id: string) => id === 'c2';

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

    const sortedRows = result.current.getRowModel().rows;

    // First row should be the favorite (c2) even though ISO sorting is enabled
    expect(sortedRows[0].original.combination.uuid).toBe('c2');
    // Then the rest should be sorted by ISO: 400, 800
    expect(sortedRows[1].original.combination.shootingIso).toBe(400);
    expect(sortedRows[2].original.combination.shootingIso).toBe(800);
  });

  it('should handle pagination correctly', () => {
    const rows = createMockRows();
    const columns = createTestColumns();
    const isFavorite = () => false;

    const { result } = renderHook(() =>
      useDevelopmentTable({
        rows,
        columns,
        sorting: [],
        onSortingChange: () => {},
        pageIndex: 0,
        onPageIndexChange: () => {},
        isFavorite,
      })
    );

    const paginationState = result.current.getState().pagination;

    expect(paginationState.pageIndex).toBe(0);
    expect(paginationState.pageSize).toBe(24);
  });
});
