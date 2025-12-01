import { Grid, Plus, Rows, Upload } from 'lucide-react';
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
    <div
      className="flex flex-col gap-4 rounded-2xl border p-6 shadow-subtle md:flex-row md:items-center md:justify-between"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'rgba(var(--color-background-rgb), 0.25)',
      }}
    >
      <div>
        <h2
          className="text-lg font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Development Recipes
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          {totalResults.toLocaleString()} film and developer pairings.
        </p>
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
                viewMode === 'table' ? '' : ''
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
                  e.currentTarget.style.backgroundColor =
                    'rgba(var(--color-background-rgb), 0.15)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== 'table') {
                  e.currentTarget.style.backgroundColor =
                    'var(--actions-bar-table-bg-hover-leave, transparent)';
                  e.currentTarget.style.color = 'var(--color-text-tertiary)';
                }
              }}
            >
              <Rows className="h-4 w-4" />
              Table
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 transition',
                viewMode === 'grid' ? '' : ''
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
                  e.currentTarget.style.backgroundColor =
                    'rgba(var(--color-background-rgb), 0.15)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== 'grid') {
                  e.currentTarget.style.backgroundColor =
                    'var(--actions-bar-grid-bg-hover-leave, transparent)';
                  e.currentTarget.style.color = 'var(--color-text-tertiary)';
                }
              }}
            >
              <Grid className="h-4 w-4" />
              Cards
            </button>
          </div>
        )}

        <TemperatureUnitToggle />

        <button
          type="button"
          onClick={() => {
            console.log(
              '🖱️ Refresh button clicked, isRefreshing:',
              isRefreshing
            );
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
              e.currentTarget.style.borderColor = 'var(--color-border-primary)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isRefreshing) {
              e.currentTarget.style.borderColor = 'var(--color-border-primary)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
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
              e.currentTarget.style.borderColor = 'var(--color-border-primary)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-primary)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <Upload className="h-4 w-4" />
            Import recipe
          </button>
        )}
        <button
          type="button"
          onClick={onOpenCustomRecipeModal}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition"
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
          <Plus className="h-4 w-4" />
          Add custom recipe
        </button>
      </div>
    </div>
  );
}
