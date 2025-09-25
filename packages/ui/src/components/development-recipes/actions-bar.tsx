import { Grid, Rows, Upload, Plus } from 'lucide-react';
import { cn } from '../../lib/cn';
import { TemperatureUnitToggle } from './temperature-unit-toggle';

interface DevelopmentActionsBarProps {
  totalResults: number;
  viewMode: 'table' | 'grid';
  onViewModeChange: (mode: 'table' | 'grid') => void;
  onOpenImportModal: () => void;
  onOpenCustomRecipeModal: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  showImportButton?: boolean;
  isMobile?: boolean;
}

export function DevelopmentActionsBar({
  totalResults,
  viewMode,
  onViewModeChange,
  onOpenImportModal,
  onOpenCustomRecipeModal,
  onRefresh,
  isRefreshing,
  showImportButton = true,
  isMobile = false,
}: DevelopmentActionsBarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-subtle md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Development Recipes
        </h2>
        <p className="text-sm text-white/60">
          {totalResults.toLocaleString()} film and developer pairings.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!isMobile && (
          <div className="flex overflow-hidden rounded-full border border-white/10 text-sm">
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-white/60 transition hover:bg-white/10 hover:text-white',
                viewMode === 'table' && 'bg-white text-black'
              )}
            >
              <Rows className="h-4 w-4" />
              Table
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-white/60 transition hover:bg-white/10 hover:text-white',
                viewMode === 'grid' && 'bg-white text-black'
              )}
            >
              <Grid className="h-4 w-4" />
              Cards
            </button>
          </div>
        )}

        <TemperatureUnitToggle />

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(
            'flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white',
            isRefreshing && 'cursor-wait opacity-70'
          )}
        >
          Refresh
        </button>

        {showImportButton && (
          <button
            type="button"
            onClick={onOpenImportModal}
            className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
          >
            <Upload className="h-4 w-4" />
            Import recipe
          </button>
        )}
        <button
          type="button"
          onClick={onOpenCustomRecipeModal}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
        >
          <Plus className="h-4 w-4" />
          Add custom recipe
        </button>
      </div>
    </div>
  );
}
