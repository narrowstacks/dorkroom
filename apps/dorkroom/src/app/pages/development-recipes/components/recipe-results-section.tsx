import {
  cn,
  type DevelopmentCombinationView,
  DevelopmentResultsCardsVirtualized,
  DevelopmentResultsTableVirtualized,
  type ShareResult,
  SkeletonCard,
  SkeletonTableRow,
  VirtualizedErrorBoundary,
} from '@dorkroom/ui';
import type { Table } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import type { FC } from 'react';

export interface RecipeResultsSectionProps {
  isLoading: boolean;
  isRefreshingData: boolean;
  isLoaded: boolean;
  isMobile: boolean;
  viewMode: 'table' | 'grid';
  table: Table<DevelopmentCombinationView>;
  resultsContainerRef: React.RefObject<HTMLDivElement | null>;
  /** Ref to the virtualized scroll container, used to scroll to top on page change */
  virtualScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  favoriteTransitions: Map<string, 'adding' | 'removing'>;
  onSelectCombination: (view: DevelopmentCombinationView) => void;
  onToggleFavorite: (view: DevelopmentCombinationView) => void;
  onShareCombination: (
    view: DevelopmentCombinationView
  ) => undefined | ShareResult | Promise<undefined | ShareResult>;
  onCopyCombination: (view: DevelopmentCombinationView) => Promise<void>;
  onEditCustomRecipe: (view: DevelopmentCombinationView) => void;
  onDeleteCustomRecipe: (view: DevelopmentCombinationView) => Promise<void>;
  isFavorite: (view: DevelopmentCombinationView) => boolean;
}

export const RecipeResultsSection: FC<RecipeResultsSectionProps> = (props) => {
  const {
    isLoading,
    isRefreshingData,
    isLoaded,
    isMobile,
    viewMode,
    table,
    resultsContainerRef,
    virtualScrollContainerRef,
    favoriteTransitions,
    onSelectCombination,
    onToggleFavorite,
    onShareCombination,
    onCopyCombination,
    onEditCustomRecipe,
    onDeleteCustomRecipe,
    isFavorite,
  } = props;

  return (
    <div className="transition-all duration-500 ease-in-out">
      {(isLoading || isRefreshingData) && (
        <div className="space-y-4 animate-slide-fade-top">
          <div
            className="flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm"
            style={{
              borderWidth: 1,
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Loader2 className="h-5 w-5 animate-spin" />
            <div>
              <div className="font-medium text-[color:var(--color-text-primary)]">
                {!isLoaded
                  ? 'Loading development recipes...'
                  : 'Refreshing recipes...'}
              </div>
              <div className="text-xs text-[color:var(--color-text-tertiary)]">
                {!isLoaded
                  ? 'Fetching films, developers, and combinations'
                  : 'Updating data from server'}
              </div>
            </div>
          </div>

          {isMobile || viewMode === 'grid' ? (
            <div
              className={cn(
                'grid gap-4',
                isMobile
                  ? 'grid-cols-2'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              )}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array, order never changes
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div
              className="overflow-hidden rounded-2xl border"
              style={{
                borderColor: 'var(--color-border-secondary)',
                backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
              }}
            >
              <table className="w-full">
                <thead
                  className="border-b"
                  style={{
                    borderColor: 'var(--color-border-secondary)',
                    backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
                  }}
                >
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--color-text-tertiary)]">
                      Film
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--color-text-tertiary)]">
                      Developer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--color-text-tertiary)]">
                      ISO
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--color-text-tertiary)]">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--color-text-tertiary)]">
                      Temperature
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--color-text-tertiary)]">
                      Dilution
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array, order never changes
                    <SkeletonTableRow key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!isLoading && !isRefreshingData && (
        <div
          ref={resultsContainerRef}
          key={`results-${isLoaded}-${table.getRowModel().rows.length}`}
          className="animate-slide-fade-top"
        >
          <VirtualizedErrorBoundary>
            {isMobile || viewMode === 'grid' ? (
              <DevelopmentResultsCardsVirtualized
                table={table}
                onSelectCombination={onSelectCombination}
                isMobile={isMobile}
                isFavorite={(view) => isFavorite(view)}
                onToggleFavorite={onToggleFavorite}
                onShareCombination={onShareCombination}
                onCopyCombination={onCopyCombination}
                onEditCustomRecipe={onEditCustomRecipe}
                onDeleteCustomRecipe={onDeleteCustomRecipe}
                favoriteTransitions={favoriteTransitions}
                scrollContainerRef={virtualScrollContainerRef}
              />
            ) : (
              <DevelopmentResultsTableVirtualized
                table={table}
                onSelectCombination={onSelectCombination}
                favoriteTransitions={favoriteTransitions}
                scrollContainerRef={virtualScrollContainerRef}
              />
            )}
          </VirtualizedErrorBoundary>
        </div>
      )}
    </div>
  );
};
