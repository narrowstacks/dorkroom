import { Grid, Plus, Rows, Upload } from 'lucide-react';
import { cn } from '../../lib/cn';
import { setStyles } from '../../lib/dom';
import { getRouteIcon } from '../../lib/navigation';
import { TemperatureUnitToggle } from './temperature-unit-toggle';

// Development recipes carry the Film category's rose accent (plan 007).
const RecipeIcon = getRouteIcon('/development');

interface DevelopmentActionsBarProps {
  totalResults: number;
  viewMode: 'table' | 'grid';
  onViewModeChange: (mode: 'table' | 'grid') => void;
  onOpenImportModal: () => void;
  onOpenCustomRecipeModal: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  /** Whether the initial data load is still in flight; suppresses the "0 pairings" subtitle. */
  isLoading?: boolean;
  showImportButton?: boolean;
  isMobile?: boolean;
}

// eslint-disable-next-line react-doctor/no-many-boolean-props -- isRefreshing / isLoading / showImportButton / isMobile are independent display/state flags on a toolbar, not a variant axis; compound-component split would add more indirection than value here
export function DevelopmentActionsBar({
  totalResults,
  viewMode,
  onViewModeChange,
  onOpenImportModal,
  onOpenCustomRecipeModal,
  onRefresh,
  isRefreshing,
  isLoading = false,
  showImportButton = true,
  isMobile = false,
}: DevelopmentActionsBarProps) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-4 shadow-subtle md:flex-row md:items-center md:justify-between"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'rgba(var(--color-background-rgb), 0.25)',
      }}
    >
      <div className="flex items-center gap-4">
        {RecipeIcon && (
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border"
            style={{
              background: 'var(--accent-rose-gradient)',
              borderColor:
                'var(--accent-rose-border, var(--color-border-secondary))',
              // RecipeIcon inherits this via currentColor.
              color: 'var(--color-on-accent)',
            }}
          >
            <RecipeIcon className="size-5" />
          </div>
        )}
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Development Recipes
          </h2>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {isLoading
              ? 'Loading recipes…'
              : `${totalResults.toLocaleString()} film and developer pairings.`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!isMobile && (
          <div
            className="flex overflow-hidden rounded-full border text-sm"
            style={{ borderColor: 'var(--color-border-secondary)' }}
          >
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 transition',
                viewMode === 'table' && 'darkroom-invert-icon'
              )}
              style={
                viewMode === 'table'
                  ? {
                      backgroundColor: 'var(--color-text-primary)',
                      color: 'var(--color-background)',
                    }
                  : {
                      color: 'var(--color-text-tertiary)',
                    }
              }
              onMouseEnter={(e) => {
                if (viewMode !== 'table') {
                  setStyles(e.currentTarget, {
                    backgroundColor: 'rgba(var(--color-background-rgb), 0.15)',
                    color: 'var(--color-text-primary)',
                  });
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== 'table') {
                  setStyles(e.currentTarget, {
                    backgroundColor:
                      'var(--actions-bar-table-bg-hover-leave, transparent)',
                    color: 'var(--color-text-tertiary)',
                  });
                }
              }}
            >
              <Rows className="size-4" />
              Table
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 transition',
                viewMode === 'grid' && 'darkroom-invert-icon'
              )}
              style={
                viewMode === 'grid'
                  ? {
                      backgroundColor: 'var(--color-text-primary)',
                      color: 'var(--color-background)',
                    }
                  : {
                      color: 'var(--color-text-tertiary)',
                    }
              }
              onMouseEnter={(e) => {
                if (viewMode !== 'grid') {
                  setStyles(e.currentTarget, {
                    backgroundColor: 'rgba(var(--color-background-rgb), 0.15)',
                    color: 'var(--color-text-primary)',
                  });
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== 'grid') {
                  setStyles(e.currentTarget, {
                    backgroundColor:
                      'var(--actions-bar-grid-bg-hover-leave, transparent)',
                    color: 'var(--color-text-tertiary)',
                  });
                }
              }}
            >
              <Grid className="size-4" />
              Cards
            </button>
          </div>
        )}

        <TemperatureUnitToggle />

        <button
          type="button"
          onClick={() => {
            onRefresh();
          }}
          disabled={isRefreshing}
          className={cn(
            'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
            isRefreshing && 'cursor-wait opacity-70'
          )}
          style={{
            borderColor: 'var(--color-border-primary)',
            color: 'var(--color-text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (!isRefreshing) {
              setStyles(e.currentTarget, {
                borderColor: 'var(--color-border-primary)',
                color: 'var(--color-text-primary)',
              });
            }
          }}
          onMouseLeave={(e) => {
            if (!isRefreshing) {
              setStyles(e.currentTarget, {
                borderColor: 'var(--color-border-primary)',
                color: 'var(--color-text-secondary)',
              });
            }
          }}
        >
          Refresh
        </button>

        {showImportButton && (
          <button
            type="button"
            onClick={onOpenImportModal}
            className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition"
            style={{
              borderColor: 'var(--color-border-primary)',
              color: 'var(--color-text-secondary)',
            }}
            onMouseEnter={(e) => {
              setStyles(e.currentTarget, {
                borderColor: 'var(--color-border-primary)',
                color: 'var(--color-text-primary)',
              });
            }}
            onMouseLeave={(e) => {
              setStyles(e.currentTarget, {
                borderColor: 'var(--color-border-primary)',
                color: 'var(--color-text-secondary)',
              });
            }}
          >
            <Upload className="size-4" />
            Import recipe
          </button>
        )}
        <button
          type="button"
          onClick={onOpenCustomRecipeModal}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition darkroom-invert-icon"
          style={{
            backgroundColor: 'var(--color-text-primary)',
            color: 'var(--color-background)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <Plus className="size-4" />
          Add custom recipe
        </button>
      </div>
    </div>
  );
}
