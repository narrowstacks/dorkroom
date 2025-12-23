import type { SelectItem } from '@dorkroom/logic';
import { ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react';
import { type FC, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { SearchableSelect } from '../searchable-select';
import { Select } from '../select';

/** Static filter options - defined outside component to prevent recreation on each render */
const FILM_TYPE_OPTIONS: SelectItem[] = [
  { label: 'All types', value: '' },
  { label: 'Black & White', value: 'bw' },
  { label: 'Color', value: 'color' },
  { label: 'Slide', value: 'slide' },
];

const DISCONTINUED_OPTIONS: SelectItem[] = [
  { label: 'All films', value: 'all' },
  { label: 'Active only', value: 'active' },
  { label: 'Discontinued only', value: 'discontinued' },
];

interface FilmFiltersPanelProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Filters
  colorTypeFilter: string;
  onColorTypeChange: (value: string) => void;
  isoSpeedFilter: string;
  onIsoSpeedChange: (value: string) => void;
  brandFilter: string;
  onBrandChange: (value: string) => void;
  discontinuedFilter: 'all' | 'active' | 'discontinued';
  onDiscontinuedChange: (value: 'all' | 'active' | 'discontinued') => void;

  // Options
  brandOptions: SelectItem[];
  isoOptions: SelectItem[];

  // Actions
  onClearFilters: () => void;
  hasActiveFilters: boolean;

  className?: string;
  /** Callback when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
}

export const FilmFiltersPanel: FC<FilmFiltersPanelProps> = ({
  searchQuery,
  onSearchChange,
  colorTypeFilter,
  onColorTypeChange,
  isoSpeedFilter,
  onIsoSpeedChange,
  brandFilter,
  onBrandChange,
  discontinuedFilter,
  onDiscontinuedChange,
  brandOptions,
  isoOptions,
  onClearFilters,
  hasActiveFilters,
  className,
  onCollapsedChange,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const searchIconRef = useRef<SVGSVGElement>(null);

  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
  };

  // Count active filters (including search)
  const activeFilterCount = [
    searchQuery,
    colorTypeFilter,
    isoSpeedFilter,
    brandFilter,
    discontinuedFilter !== 'all',
  ].filter(Boolean).length;

  // Collapsed state - show only toggle button
  if (isCollapsed) {
    return (
      <div
        className={cn(
          'sticky top-6 flex flex-col items-center gap-3 rounded-2xl border p-3 shadow-lg animate-collapse-width',
          className
        )}
        style={{
          borderColor: 'var(--color-border-primary)',
          backgroundColor: 'var(--color-surface)',
          width: '64px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <button
          type="button"
          onClick={handleToggleCollapse}
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
            e.currentTarget.style.borderColor = 'var(--color-border-secondary)';
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
              hasActiveFilters
                ? `${activeFilterCount} filters active`
                : 'No filters'
            }
          >
            <Filter className="h-5 w-5" />
          </div>
          {hasActiveFilters && (
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
    );
  }

  // Expanded state
  return (
    <div
      className={cn(
        'sticky top-6 h-fit space-y-5 animate-expand-width',
        className
      )}
      style={{ width: '304px' }}
    >
      {/* Header with collapse button */}
      <div
        className="flex items-center justify-between rounded-xl border px-4 py-3 shadow-md"
        style={{
          borderColor: 'var(--color-border-primary)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
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
            Filters
          </h2>
          {hasActiveFilters && (
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
          onClick={handleToggleCollapse}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200"
          style={{
            color: 'var(--color-text-muted)',
            border: '1px solid transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              'var(--color-surface-muted)';
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

      {/* Search input - Primary action */}
      <div
        className="space-y-3 rounded-xl border p-4 shadow-md"
        style={{
          borderColor: 'var(--color-border-primary)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <label
          htmlFor="film-search"
          className="block text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Search Films
        </label>
        <div className="relative">
          <Search
            ref={searchIconRef}
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            id="film-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Type to search..."
            className="w-full rounded-lg border px-3 py-2.5 pl-10 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2"
            style={
              {
                borderColor: 'var(--color-border-secondary)',
                backgroundColor: 'var(--color-surface-muted)',
                color: 'var(--color-text-primary)',
                '--tw-ring-color': 'var(--color-primary)',
              } as React.CSSProperties
            }
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-primary)';
              e.target.style.backgroundColor = 'var(--color-background)';
              if (searchIconRef.current) {
                searchIconRef.current.style.color = 'var(--color-primary)';
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-border-secondary)';
              e.target.style.backgroundColor = 'var(--color-surface-muted)';
              if (searchIconRef.current) {
                searchIconRef.current.style.color = 'var(--color-text-muted)';
              }
            }}
          />
        </div>
      </div>

      {/* Filters section - Secondary controls */}
      <div
        className="space-y-4 rounded-xl border p-4 shadow-md"
        style={{
          borderColor: 'var(--color-border-primary)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div className="flex items-center justify-between">
          <h3
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <div
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: 'var(--color-primary)' }}
            />
            Filter Options
          </h3>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200"
              style={{
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                e.currentTarget.style.color = 'var(--color-background)';
                e.currentTarget.style.borderColor = 'var(--color-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.borderColor =
                  'var(--color-border-secondary)';
              }}
            >
              Clear all
            </button>
          )}
        </div>

        <div className="space-y-3.5">
          <Select
            label="Film type"
            selectedValue={colorTypeFilter}
            onValueChange={onColorTypeChange}
            items={FILM_TYPE_OPTIONS}
          />

          <SearchableSelect
            label="ISO speed"
            selectedValue={isoSpeedFilter}
            onValueChange={onIsoSpeedChange}
            items={isoOptions}
            placeholder="Select ISO..."
          />

          <SearchableSelect
            label="Brand"
            selectedValue={brandFilter}
            onValueChange={onBrandChange}
            items={brandOptions}
            placeholder="Select brand..."
          />

          <Select
            label="Status"
            selectedValue={discontinuedFilter}
            onValueChange={(value) =>
              onDiscontinuedChange(value as 'all' | 'active' | 'discontinued')
            }
            items={DISCONTINUED_OPTIONS}
          />
        </div>
      </div>
    </div>
  );
};
