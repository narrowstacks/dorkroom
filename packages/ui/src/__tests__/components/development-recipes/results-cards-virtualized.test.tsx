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
import { DevelopmentResultsCardsVirtualized } from '../../../components/development-recipes/results-cards-virtualized';
import { TemperatureProvider } from '../../../contexts/temperature-context';

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  observedElements: Set<Element> = new Set();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.observedElements.add(target);
  }

  unobserve(target: Element) {
    this.observedElements.delete(target);
  }

  disconnect() {
    this.observedElements.clear();
  }

  // Helper to simulate resize
  simulateResize(entries: ResizeObserverEntry[]) {
    this.callback(entries, this);
  }
}

let mockResizeObserverInstance: MockResizeObserver | null = null;

// Mock useVirtualizer from @tanstack/react-virtual
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(({ count }) => ({
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 5) }, (_, i) => ({
        index: i,
        key: `row-${i}`,
        start: i * 280,
        end: (i + 1) * 280,
        size: 280,
      })),
    getTotalSize: () => count * 280,
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

// Test columns
const testColumns: ColumnDef<DevelopmentCombinationView>[] = [
  {
    id: 'film',
    accessorKey: 'film',
    header: 'Film',
  },
  {
    id: 'developer',
    accessorKey: 'developer',
    header: 'Developer',
  },
];

// Wrapper component for testing
const TestWrapper: FC<{ children: ReactNode }> = ({ children }) => (
  <TemperatureProvider>{children}</TemperatureProvider>
);

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
  return <TestWrapper>{children(table)}</TestWrapper>;
};

describe('DevelopmentResultsCardsVirtualized', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup ResizeObserver mock
    mockResizeObserverInstance = null;
    global.ResizeObserver = vi.fn((callback) => {
      mockResizeObserverInstance = new MockResizeObserver(callback);
      return mockResizeObserverInstance;
    }) as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    cleanup();
    mockResizeObserverInstance = null;
  });

  describe('rendering', () => {
    it('renders cards for each row', () => {
      const rows = createMockRows(3);

      render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
            />
          )}
        </TableWrapper>
      );

      // Should render film names
      expect(screen.getAllByText('Ilford HP5 Plus')).toHaveLength(3);
    });

    it('renders empty state when no rows', () => {
      render(
        <TableWrapper rows={[]}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
            />
          )}
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
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
              height="500px"
            />
          )}
        </TableWrapper>
      );

      const scrollContainer = container.firstChild as HTMLElement;
      expect(scrollContainer.style.height).toBe('500px');
    });
  });

  describe('card interactions', () => {
    it('calls onSelectCombination when card is clicked', () => {
      const rows = createMockRows(1);
      const onSelectCombination = vi.fn();

      render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
              onSelectCombination={onSelectCombination}
            />
          )}
        </TableWrapper>
      );

      const card = screen.getByRole('button', { name: /ilford hp5 plus/i });
      fireEvent.click(card);

      expect(onSelectCombination).toHaveBeenCalledTimes(1);
      expect(onSelectCombination).toHaveBeenCalledWith(rows[0]);
    });

    it('calls onSelectCombination when Enter is pressed', () => {
      const rows = createMockRows(1);
      const onSelectCombination = vi.fn();

      render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
              onSelectCombination={onSelectCombination}
            />
          )}
        </TableWrapper>
      );

      const card = screen.getByRole('button', { name: /ilford hp5 plus/i });
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(onSelectCombination).toHaveBeenCalledTimes(1);
    });

    it('calls onSelectCombination when Space is pressed', () => {
      const rows = createMockRows(1);
      const onSelectCombination = vi.fn();

      render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
              onSelectCombination={onSelectCombination}
            />
          )}
        </TableWrapper>
      );

      const card = screen.getByRole('button', { name: /ilford hp5 plus/i });
      fireEvent.keyDown(card, { key: ' ' });

      expect(onSelectCombination).toHaveBeenCalledTimes(1);
    });
  });

  describe('favorite functionality', () => {
    it('calls onToggleFavorite when favorite button is clicked', () => {
      const rows = createMockRows(1);
      const onToggleFavorite = vi.fn();

      render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
              onToggleFavorite={onToggleFavorite}
              isFavorite={() => false}
            />
          )}
        </TableWrapper>
      );

      const favoriteButton = screen.getByRole('button', {
        name: 'Add to favorites',
      });
      fireEvent.click(favoriteButton);

      expect(onToggleFavorite).toHaveBeenCalledTimes(1);
      expect(onToggleFavorite).toHaveBeenCalledWith(rows[0]);
    });

    it('does not trigger card selection when favorite button is clicked', () => {
      const rows = createMockRows(1);
      const onSelectCombination = vi.fn();
      const onToggleFavorite = vi.fn();

      render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
              onSelectCombination={onSelectCombination}
              onToggleFavorite={onToggleFavorite}
              isFavorite={() => false}
            />
          )}
        </TableWrapper>
      );

      const favoriteButton = screen.getByRole('button', {
        name: 'Add to favorites',
      });
      fireEvent.click(favoriteButton);

      expect(onToggleFavorite).toHaveBeenCalledTimes(1);
      expect(onSelectCombination).not.toHaveBeenCalled();
    });

    it('shows correct aria-pressed state for favorites', () => {
      const rows = createMockRows(1);
      const isFavorite = () => true;

      render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
              isFavorite={isFavorite}
            />
          )}
        </TableWrapper>
      );

      const favoriteButton = screen.getByRole('button', {
        name: 'Remove from favorites',
      });
      expect(favoriteButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('favorite transitions', () => {
    it('shows adding message during add transition', () => {
      const rows = createMockRows(1);
      const favoriteTransitions = new Map([['c1', 'adding' as const]]);

      render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
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
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
              favoriteTransitions={favoriteTransitions}
            />
          )}
        </TableWrapper>
      );

      // Skeleton should be rendered (look for animate-pulse class or skeleton structure)
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('custom recipe actions', () => {
    it('shows edit and delete buttons for custom recipes', () => {
      const customRows: DevelopmentCombinationView[] = [
        {
          ...createMockRows(1)[0],
          source: 'custom',
        },
      ];

      render(
        <TableWrapper rows={customRows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
              onEditCustomRecipe={() => {}}
              onDeleteCustomRecipe={() => {}}
            />
          )}
        </TableWrapper>
      );

      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Delete' })
      ).toBeInTheDocument();
    });

    it('calls onEditCustomRecipe when edit button is clicked', () => {
      const customRows: DevelopmentCombinationView[] = [
        {
          ...createMockRows(1)[0],
          source: 'custom',
        },
      ];
      const onEditCustomRecipe = vi.fn();
      const onSelectCombination = vi.fn();

      render(
        <TableWrapper rows={customRows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
              onEditCustomRecipe={onEditCustomRecipe}
              onSelectCombination={onSelectCombination}
            />
          )}
        </TableWrapper>
      );

      const editButton = screen.getByRole('button', { name: 'Edit' });
      fireEvent.click(editButton);

      expect(onEditCustomRecipe).toHaveBeenCalledTimes(1);
      expect(onSelectCombination).not.toHaveBeenCalled();
    });

    it('calls onDeleteCustomRecipe when delete button is clicked', () => {
      const customRows: DevelopmentCombinationView[] = [
        {
          ...createMockRows(1)[0],
          source: 'custom',
        },
      ];
      const onDeleteCustomRecipe = vi.fn();

      render(
        <TableWrapper rows={customRows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
              onDeleteCustomRecipe={onDeleteCustomRecipe}
            />
          )}
        </TableWrapper>
      );

      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      expect(onDeleteCustomRecipe).toHaveBeenCalledTimes(1);
    });

    it('shows Custom Recipe badge for custom recipes', () => {
      const customRows: DevelopmentCombinationView[] = [
        {
          ...createMockRows(1)[0],
          source: 'custom',
        },
      ];

      render(
        <TableWrapper rows={customRows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
            />
          )}
        </TableWrapper>
      );

      expect(screen.getByText('Custom Recipe')).toBeInTheDocument();
    });
  });

  describe('time formatting', () => {
    it('formats time less than 1 minute as seconds', () => {
      const rows: DevelopmentCombinationView[] = [
        {
          ...createMockRows(1)[0],
          combination: createMockCombination({ timeMinutes: 0.5 }),
        },
      ];

      render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
            />
          )}
        </TableWrapper>
      );

      expect(screen.getByText('30s')).toBeInTheDocument();
    });

    it('formats whole minutes without seconds', () => {
      const rows: DevelopmentCombinationView[] = [
        {
          ...createMockRows(1)[0],
          combination: createMockCombination({ timeMinutes: 8 }),
        },
      ];

      render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
            />
          )}
        </TableWrapper>
      );

      expect(screen.getByText('8 min')).toBeInTheDocument();
    });

    it('formats fractional minutes with seconds', () => {
      const rows: DevelopmentCombinationView[] = [
        {
          ...createMockRows(1)[0],
          combination: createMockCombination({ timeMinutes: 8.5 }),
        },
      ];

      render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
            />
          )}
        </TableWrapper>
      );

      expect(screen.getByText('8m 30s')).toBeInTheDocument();
    });
  });

  describe('dilution formatting', () => {
    it('displays custom dilution when available', () => {
      const rows: DevelopmentCombinationView[] = [
        {
          ...createMockRows(1)[0],
          combination: createMockCombination({ customDilution: '1+9' }),
        },
      ];

      render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
            />
          )}
        </TableWrapper>
      );

      expect(screen.getByText('1+9')).toBeInTheDocument();
    });

    it('displays Stock when no dilution specified', () => {
      const rows: DevelopmentCombinationView[] = [
        {
          ...createMockRows(1)[0],
          developer: { ...mockDeveloper, dilutions: [] },
          combination: createMockCombination({ dilutionId: null }),
        },
      ];

      render(
        <TableWrapper rows={rows}>
          {(table) => (
            <DevelopmentResultsCardsVirtualized
              table={table}
              isMobile={false}
            />
          )}
        </TableWrapper>
      );

      expect(screen.getByText('Stock')).toBeInTheDocument();
    });
  });
});
