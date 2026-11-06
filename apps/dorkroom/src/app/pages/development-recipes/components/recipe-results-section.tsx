import {
  cn,
  ResultsFrame,
  type ShareResult,
  SkeletonCard,
  SkeletonTableRow,
  VirtualizedErrorBoundary,
  type VirtualListFocusHandle,
} from '@dorkroom/ui';
import {
  type DevelopmentCombinationView,
  DevelopmentResultsCardsVirtualized,
  DevelopmentResultsTableVirtualized,
} from '@dorkroom/ui/development-recipes';
import type { Table } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import type { FC, Ref } from 'react';

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
  /** Receives the results list's handle for putting focus back on a recipe */
  resultsFocusRef?: Ref<VirtualListFocusHandle>;
  favoriteTransitions: Map<string, 'adding' | 'removing'>;
  onSelectCombination: (view: DevelopmentCombinationView) => void;
  onToggleFavorite: (view: DevelopmentCombinationView) => void;
  onShareCombination: (
    view: DevelopmentCombinationView
  ) => undefined | ShareResult | Promise<undefined | ShareResult>;
  onCopyCombination: (view: DevelopmentCombinationView) => Promise<void>;
  onEditCustomRecipe: (view: DevelopmentCombinationView) => void;
  onDeleteCustomRecipe: (view: DevelopmentCombinationView) => void;
  isFavorite: (view: DevelopmentCombinationView) => boolean;
  /** ID of the currently selected recipe to highlight */
  selectedRecipeId?: string | null;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
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
    resultsFocusRef,
    favoriteTransitions,
    onSelectCombination,
    onToggleFavorite,
    onShareCombination,
    onCopyCombination,
    onEditCustomRecipe,
    onDeleteCustomRecipe,
    isFavorite,
    selectedRecipeId,
    onClearFilters,
    hasActiveFilters,
  } = props;

  return (
    <div className="transition duration-500 ease-in-out">
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
            <Loader2 className="size-5 animate-spin" />
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
                  ? 'grid-cols-1 min-[480px]:grid-cols-2'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              )}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array, order never changes
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <ResultsFrame>
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
            </ResultsFrame>
          )}
        </div>
      )}

      {!isLoading && !isRefreshingData && (
        <div ref={resultsContainerRef} className="animate-slide-fade-top">
          <VirtualizedErrorBoundary>
            {isMobile || viewMode === 'grid' ? (
              <DevelopmentResultsCardsVirtualized
                table={table}
                onSelectCombination={onSelectCombination}
                isMobile={isMobile}
                isFavorite={(view: DevelopmentCombinationView) =>
                  isFavorite(view)
                }
                onToggleFavorite={onToggleFavorite}
                onShareCombination={onShareCombination}
                onCopyCombination={onCopyCombination}
                onEditCustomRecipe={onEditCustomRecipe}
                onDeleteCustomRecipe={onDeleteCustomRecipe}
                favoriteTransitions={favoriteTransitions}
                scrollContainerRef={virtualScrollContainerRef}
                selectedRecipeId={selectedRecipeId}
                focusHandleRef={resultsFocusRef}
                onClearFilters={onClearFilters}
                hasActiveFilters={hasActiveFilters}
              />
            ) : (
              <DevelopmentResultsTableVirtualized
                table={table}
                onSelectCombination={onSelectCombination}
                favoriteTransitions={favoriteTransitions}
                scrollContainerRef={virtualScrollContainerRef}
                selectedRecipeId={selectedRecipeId}
                focusHandleRef={resultsFocusRef}
                onClearFilters={onClearFilters}
                hasActiveFilters={hasActiveFilters}
              />
            )}
          </VirtualizedErrorBoundary>
        </div>
      )}
    </div>
  );
};
