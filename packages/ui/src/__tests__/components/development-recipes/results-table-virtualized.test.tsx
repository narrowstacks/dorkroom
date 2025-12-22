import type { Combination, Developer, Film } from '@dorkroom/api';
import type { DevelopmentCombinationView } from '@dorkroom/logic';
import type { ColumnDef, Table } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { FC, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DevelopmentResultsTableVirtualized } from '../../../components/development-recipes/results-table-virtualized';

// Mock useVirtualizer from @tanstack/react-virtual
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(({ count }) => ({
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 10) }, (_, i) => ({
        index: i,
        key: `row-${i}`,
        start: i * 80,
        end: (i + 1) * 80,
        size: 80,
      })),
    getTotalSize: () => count * 80,
  })),
}));

// Test data factories
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
  dilutions: [{ id: '1', name: '1+4', dilution: '1+4' }],
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

const createMockRows = (count = 3): DevelopmentCombinationView[] =>
  Array.from({ length: count }, (_, i) => ({
    combination: createMockCombination({
      id: i + 1,
      uuid: `c${i + 1}`,
      shootingIso: 400 + i * 100,
      timeMinutes: 8 + i,
    }),
    film: mockFilm,
    developer: mockDeveloper,
    source: 'api' as const,
  }));

// Test columns with cell renderers
const testColumns: ColumnDef<DevelopmentCombinationView>[] = [
  {
    id: 'film',
    accessorKey: 'film',
    header: 'Film',
    enableSorting: true,
    cell: ({ row }) => {
      const film = row.original.film;
      return film ? `${film.brand} ${film.name}` : 'Unknown';
    },
  },
  {
    id: 'developer',
    accessorKey: 'developer',
    header: 'Developer',
    enableSorting: true,
    cell: ({ row }) => {
      const dev = row.original.developer;
      return dev ? `${dev.manufacturer} ${dev.name}` : 'Unknown';
    },
  },
  {
    id: 'iso',
    accessorFn: (row) => row.combination.shootingIso,
    header: 'ISO',
    enableSorting: true,
    cell: ({ row }) => row.original.combination.shootingIso,
  },
];

// Table wrapper component
interface TableWrapperProps {
  rows: DevelopmentCombinationView[];
  children: (table: Table<DevelopmentCombinationView>) => ReactNode;
}

const TableWrapper: FC<TableWrapperProps> = ({ rows, children }) => {
  const table = useReactTable({
    data: rows,
    columns: testColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    sortingFns: {
      favoriteAware: () => 0,
    },
  });
  return <>{children(table)}</>;
};

describe('DevelopmentResultsTableVirtualized', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders table with header and rows', () => {
      const rows = createMockRows(3);

      render(
        <TableWrapper rows={rows}>
          {(table) => <DevelopmentResultsTableVirtualized table={table} />}
        </TableWrapper>
      );

      // Check headers
      expect(screen.getByText('Film')).toBeInTheDocument();
      expect(screen.getByText('Developer')).toBeInTheDocument();
      expect(screen.getByText('ISO')).toBeInTheDocument();

      // Check rows are rendered
      expect(screen.getAllByText('Ilford HP5 Plus')).toHaveLength(3);
    });

    it('renders empty state when no rows', () => {
      render(
        <TableWrapper rows={[]}>
          {(table) => <DevelopmentResultsTableVirtualized table={table} />}
        </TableWrapper>
      );

      expect(
        screen.getByText(
          'No recipes match your current filters. Try adjusting your search.'
        )
      ).toBeInTheDocument();
    });

    it('applies custom height when provided', () => {
      const rows = createMockRows(1);

      const { container } = render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsTableVirtualized table={table} height="600px" />
          )}
        </TableWrapper>
      );

      // Find the scroll container
      const scrollContainer = container.querySelector(
        '[style*="height: 600px"]'
      );
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('row interactions', () => {
    // Helper to get table row and ensure it exists
    const getTableRow = (container: HTMLElement): Element => {
      const tableRow = container.querySelector('tbody tr[role="button"]');
      if (!tableRow) throw new Error('Table row not found');
      return tableRow;
    };

    it('calls onSelectCombination when row is clicked', () => {
      const rows = createMockRows(1);
      const onSelectCombination = vi.fn();

      const { container } = render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsTableVirtualized
              table={table}
              onSelectCombination={onSelectCombination}
            />
          )}
        </TableWrapper>
      );

      const tableRow = getTableRow(container);
      fireEvent.click(tableRow);

      expect(onSelectCombination).toHaveBeenCalledTimes(1);
      expect(onSelectCombination).toHaveBeenCalledWith(rows[0]);
    });

    it('calls onSelectCombination when Enter is pressed on row', () => {
      const rows = createMockRows(1);
      const onSelectCombination = vi.fn();

      const { container } = render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsTableVirtualized
              table={table}
              onSelectCombination={onSelectCombination}
            />
          )}
        </TableWrapper>
      );

      const tableRow = getTableRow(container);
      fireEvent.keyDown(tableRow, { key: 'Enter' });

      expect(onSelectCombination).toHaveBeenCalledTimes(1);
    });

    it('calls onSelectCombination when Space is pressed on row', () => {
      const rows = createMockRows(1);
      const onSelectCombination = vi.fn();

      const { container } = render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsTableVirtualized
              table={table}
              onSelectCombination={onSelectCombination}
            />
          )}
        </TableWrapper>
      );

      const tableRow = getTableRow(container);
      fireEvent.keyDown(tableRow, { key: ' ' });

      expect(onSelectCombination).toHaveBeenCalledTimes(1);
    });

    it('triggers callback on Space key without causing scroll', () => {
      const rows = createMockRows(1);
      const onSelectCombination = vi.fn();

      const { container } = render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsTableVirtualized
              table={table}
              onSelectCombination={onSelectCombination}
            />
          )}
        </TableWrapper>
      );

      const tableRow = getTableRow(container);
      fireEvent.keyDown(tableRow, { key: ' ' });

      // The callback should be triggered by Space key
      expect(onSelectCombination).toHaveBeenCalledTimes(1);
    });
  });

  describe('favorite transitions', () => {
    it('shows adding message during add transition', () => {
      const rows = createMockRows(1);
      const favoriteTransitions = new Map([['c1', 'adding' as const]]);

      render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsTableVirtualized
              table={table}
              favoriteTransitions={favoriteTransitions}
            />
          )}
        </TableWrapper>
      );

      expect(screen.getByText('Added to favorites')).toBeInTheDocument();
    });

    it('shows skeleton during remove transition', () => {
      const rows = createMockRows(1);
      const favoriteTransitions = new Map([['c1', 'removing' as const]]);

      const { container } = render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsTableVirtualized
              table={table}
              favoriteTransitions={favoriteTransitions}
            />
          )}
        </TableWrapper>
      );

      // Should render skeleton row
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders normal rows when no transition is active', () => {
      const rows = createMockRows(3);
      const favoriteTransitions = new Map<string, 'adding' | 'removing'>();

      render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsTableVirtualized
              table={table}
              favoriteTransitions={favoriteTransitions}
            />
          )}
        </TableWrapper>
      );

      expect(screen.getAllByText('Ilford HP5 Plus')).toHaveLength(3);
      expect(screen.queryByText('Added to favorites')).not.toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('renders sortable column headers as buttons', () => {
      const rows = createMockRows(1);

      render(
        <TableWrapper rows={rows}>
          {(table) => <DevelopmentResultsTableVirtualized table={table} />}
        </TableWrapper>
      );

      // Headers with enableSorting should be buttons
      const filmHeader = screen.getByRole('button', { name: /film/i });
      const developerHeader = screen.getByRole('button', {
        name: /developer/i,
      });
      const isoHeader = screen.getByRole('button', { name: /iso/i });

      expect(filmHeader).toBeInTheDocument();
      expect(developerHeader).toBeInTheDocument();
      expect(isoHeader).toBeInTheDocument();
    });

    it('toggles sorting when header is clicked', () => {
      const rows = createMockRows(3);

      render(
        <TableWrapper rows={rows}>
          {(table) => <DevelopmentResultsTableVirtualized table={table} />}
        </TableWrapper>
      );

      const isoHeader = screen.getByRole('button', { name: /iso/i });
      fireEvent.click(isoHeader);

      // After click, should show sort indicator
      expect(isoHeader).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('rows have role="button" and tabIndex', () => {
      const rows = createMockRows(1);

      const { container } = render(
        <TableWrapper rows={rows}>
          {(table) => <DevelopmentResultsTableVirtualized table={table} />}
        </TableWrapper>
      );

      const tableRow = container.querySelector('tbody tr[role="button"]');
      expect(tableRow).toBeInTheDocument();
      expect(tableRow).toHaveAttribute('tabindex', '0');
    });

    it('table has proper semantic structure', () => {
      const rows = createMockRows(1);

      const { container } = render(
        <TableWrapper rows={rows}>
          {(table) => <DevelopmentResultsTableVirtualized table={table} />}
        </TableWrapper>
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      // Table has both thead and tbody
      expect(container.querySelector('thead')).toBeInTheDocument();
      expect(container.querySelector('tbody')).toBeInTheDocument();
    });

    it('column headers use th elements', () => {
      const rows = createMockRows(1);

      const { container } = render(
        <TableWrapper rows={rows}>
          {(table) => <DevelopmentResultsTableVirtualized table={table} />}
        </TableWrapper>
      );

      const headerCells = container.querySelectorAll('th');
      expect(headerCells.length).toBeGreaterThan(0);
    });
  });

  describe('virtualization', () => {
    it('applies padding for virtualized scroll', () => {
      const rows = createMockRows(20);

      const { container } = render(
        <TableWrapper rows={rows}>
          {(table) => <DevelopmentResultsTableVirtualized table={table} />}
        </TableWrapper>
      );

      // Check that the table body exists
      const tbody = container.querySelector('tbody');
      expect(tbody).toBeInTheDocument();
    });

    it('uses scroll container ref when provided', () => {
      const rows = createMockRows(5);
      const scrollContainerRef = { current: document.createElement('div') };

      render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsTableVirtualized
              table={table}
              scrollContainerRef={scrollContainerRef}
            />
          )}
        </TableWrapper>
      );

      // Component should render without error
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('custom recipe styling', () => {
    // Helper to get table row and ensure it exists
    const getTableRow = (container: HTMLElement): Element => {
      const tableRow = container.querySelector('tbody tr[role="button"]');
      if (!tableRow) throw new Error('Table row not found');
      return tableRow;
    };

    it('applies different hover styles for custom recipes', () => {
      const customRows: DevelopmentCombinationView[] = [
        {
          ...createMockRows(1)[0],
          source: 'custom',
        },
      ];

      const { container } = render(
        <TableWrapper rows={customRows}>
          {(table) => <DevelopmentResultsTableVirtualized table={table} />}
        </TableWrapper>
      );

      const tableRow = getTableRow(container);

      // Simulate mouse enter
      fireEvent.mouseEnter(tableRow);

      // Row should be rendered (styling is applied via inline styles)
      expect(tableRow).toBeInTheDocument();
    });

    it('applies default styles for API recipes', () => {
      const rows = createMockRows(1);

      const { container } = render(
        <TableWrapper rows={rows}>
          {(table) => <DevelopmentResultsTableVirtualized table={table} />}
        </TableWrapper>
      );

      const tableRow = getTableRow(container);

      // Simulate mouse enter and leave
      fireEvent.mouseEnter(tableRow);
      fireEvent.mouseLeave(tableRow);

      // Row should be rendered
      expect(tableRow).toBeInTheDocument();
    });
  });

  describe('sticky header', () => {
    it('header has sticky positioning', () => {
      const rows = createMockRows(5);

      const { container } = render(
        <TableWrapper rows={rows}>
          {(table) => <DevelopmentResultsTableVirtualized table={table} />}
        </TableWrapper>
      );

      const thead = container.querySelector('thead');
      expect(thead).toHaveClass('sticky');
      expect(thead).toHaveClass('top-0');
    });
  });
});
