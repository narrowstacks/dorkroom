import { ChevronRight, Filter } from 'lucide-react';
import { type FC, type ReactNode, useCallback, useMemo, useState } from 'react';
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
  /** Controlled collapsed state (overrides defaultCollapsed) */
  collapsed?: boolean;
  /** Initial collapsed state (uncontrolled mode) */
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
  collapsed,
  defaultCollapsed = false,
  expandedWidth = 304,
  collapsedWidth = 64,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(
    () => defaultCollapsed
  );
  const isControlled = collapsed !== undefined;
  const isCollapsed = isControlled ? collapsed : internalCollapsed;

  const toggle = useCallback(() => {
    const newCollapsed = !isCollapsed;
    if (!isControlled) {
      setInternalCollapsed(newCollapsed);
    }
    onCollapsedChange?.(newCollapsed);
  }, [isCollapsed, isControlled, onCollapsedChange]);

  // Memoize so consumers don't redraw on every render of this container.
  const contextValue = useMemo(
    () => ({
      isCollapsed,
      toggle,
      activeFilterCount,
      hasActiveFilters,
    }),
    [isCollapsed, toggle, activeFilterCount, hasActiveFilters]
  );

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
            // Border width and style stay inline: a `border` class on a
            // `rounded-xl` element is repainted by the high-contrast theme's
            // `.rounded-xl.border` rule, which would swallow the hover colours.
            className="flex size-11 items-center justify-center rounded-xl border-secondary bg-surface-muted text-secondary transition-all duration-200 hover:scale-105 hover:border-brand hover:bg-brand hover:text-background darkroom-hover-invert-icon"
            style={{ borderWidth: 1, borderStyle: 'solid' }}
            aria-label="Expand filters"
            title="Expand filters"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="relative flex size-11 items-center justify-center">
            <div
              className={cn(
                'flex size-full items-center justify-center rounded-xl transition-all duration-200',
                // The darkroom svg rule pins the icon to the brand colour,
                // which is also its fill while filters are active.
                hasActiveFilters && 'darkroom-invert-icon'
              )}
              style={{
                backgroundColor: hasActiveFilters
                  ? 'var(--color-brand)'
                  : 'var(--color-surface-muted)',
                color: hasActiveFilters
                  ? 'var(--color-background)'
                  : 'var(--color-text-muted)',
                border: hasActiveFilters
                  ? '1px solid var(--color-brand)'
                  : '1px solid var(--color-border-secondary)',
              }}
              title={
                activeFilterCount > 0
                  ? `${activeFilterCount} filters active`
                  : 'No filters'
              }
            >
              <Filter className="size-5" />
            </div>
            {activeFilterCount > 0 && (
              <span
                className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full text-[11px] font-bold"
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
