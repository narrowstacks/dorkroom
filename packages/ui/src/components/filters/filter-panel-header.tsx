import { ChevronLeft, Filter } from 'lucide-react';
import type { FC } from 'react';
import { setStyles } from '../../lib/dom';
import { useFilterPanel } from './filter-panel-context';

interface FilterPanelHeaderProps {
  /** Title to display (default: "Filters") */
  title?: string;
}

export const FilterPanelHeader: FC<FilterPanelHeaderProps> = ({
  title = 'Filters',
}) => {
  const { toggle, activeFilterCount } = useFilterPanel();

  return (
    <div
      className="flex items-center justify-between rounded-2xl border px-4 py-3 shadow-subtle"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'rgba(var(--color-background-rgb), 0.25)',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex size-8 items-center justify-center rounded-lg darkroom-invert-icon"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-background)',
          }}
        >
          <Filter className="size-4" />
        </div>
        <h2
          className="text-lg font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </h2>
        {activeFilterCount > 0 && (
          <span
            className="ml-1 flex size-6 items-center justify-center rounded-full text-xs font-bold"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-background)',
            }}
          >
            {activeFilterCount}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={toggle}
        className="flex size-8 items-center justify-center rounded-lg transition-all duration-200"
        style={{
          color: 'var(--color-text-muted)',
          border: '1px solid transparent',
        }}
        onMouseEnter={(e) => {
          setStyles(e.currentTarget, {
            backgroundColor: 'var(--color-surface-muted)',
            borderColor: 'var(--color-border-secondary)',
            color: 'var(--color-text-primary)',
          });
        }}
        onMouseLeave={(e) => {
          setStyles(e.currentTarget, {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            color: 'var(--color-text-muted)',
          });
        }}
        aria-label="Collapse filters"
        title="Collapse filters"
      >
        <ChevronLeft className="size-5" />
      </button>
    </div>
  );
};
