import { ChevronLeft, Filter } from 'lucide-react';
import type { FC } from 'react';
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
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-background)',
          }}
        >
          <Filter className="h-4 w-4" />
        </div>
        <h2
          className="text-lg font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </h2>
        {activeFilterCount > 0 && (
          <span
            className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
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
        className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200"
        style={{
          color: 'var(--color-text-muted)',
          border: '1px solid transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-surface-muted)';
          e.currentTarget.style.borderColor = 'var(--color-border-secondary)';
          e.currentTarget.style.color = 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-muted)';
        }}
        aria-label="Collapse filters"
        title="Collapse filters"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
    </div>
  );
};
