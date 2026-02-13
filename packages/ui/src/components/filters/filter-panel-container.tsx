import { ChevronRight, Filter } from 'lucide-react';
import { type FC, type ReactNode, useState } from 'react';
import { cn } from '../../lib/cn';
import { FilterPanelContext } from './filter-panel-context';

interface FilterPanelContainerProps {
  children: ReactNode;
  className?: string;
  /** Number of active filters to show in badge */
  activeFilterCount: number;
  /** Whether any filters are active (controls collapsed indicator color) */
  hasActiveFilters: boolean;
  /** Callback when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** Fixed width when expanded (default: 304px) */
  expandedWidth?: number;
  /** Fixed width when collapsed (default: 64px) */
  collapsedWidth?: number;
}

export const FilterPanelContainer: FC<FilterPanelContainerProps> = ({
  children,
  className,
  activeFilterCount,
  hasActiveFilters,
  onCollapsedChange,
  defaultCollapsed = false,
  expandedWidth = 304,
  collapsedWidth = 64,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
  };

  const contextValue = {
    isCollapsed,
    toggle,
    activeFilterCount,
    hasActiveFilters,
  };

  // Collapsed state - show only toggle button and filter badge
  if (isCollapsed) {
    return (
      <FilterPanelContext.Provider value={contextValue}>
        <div
          className={cn(
            'sticky top-3 flex flex-col items-center gap-3 rounded-2xl border p-3 shadow-lg animate-collapse-width',
            className
          )}
          style={{
            borderColor: 'var(--color-border-primary)',
            backgroundColor: 'var(--color-surface)',
            width: `${collapsedWidth}px`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
        >
          <button
            type="button"
            onClick={toggle}
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200"
            style={{
              backgroundColor: 'var(--color-surface-muted)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              e.currentTarget.style.color = 'var(--color-background)';
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                'var(--color-surface-muted)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
              e.currentTarget.style.borderColor =
                'var(--color-border-secondary)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            aria-label="Expand filters"
            title="Expand filters"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="relative flex h-11 w-11 items-center justify-center">
            <div
              className="flex h-full w-full items-center justify-center rounded-xl transition-all duration-200"
              style={{
                backgroundColor: hasActiveFilters
                  ? 'var(--color-primary)'
                  : 'var(--color-surface-muted)',
                color: hasActiveFilters
                  ? 'var(--color-background)'
                  : 'var(--color-text-muted)',
                border: hasActiveFilters
                  ? '1px solid var(--color-primary)'
                  : '1px solid var(--color-border-secondary)',
              }}
              title={
                activeFilterCount > 0
                  ? `${activeFilterCount} filters active`
                  : 'No filters'
              }
            >
              <Filter className="h-5 w-5" />
            </div>
            {activeFilterCount > 0 && (
              <span
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-background)',
                  border: '2px solid var(--color-surface)',
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </div>
        </div>
      </FilterPanelContext.Provider>
    );
  }

  // Expanded state
  return (
    <FilterPanelContext.Provider value={contextValue}>
      <div
        className={cn(
          'sticky top-3 h-fit space-y-3 animate-expand-width',
          className
        )}
        style={{ width: `${expandedWidth}px` }}
      >
        {children}
      </div>
    </FilterPanelContext.Provider>
  );
};
