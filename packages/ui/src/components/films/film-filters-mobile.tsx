import type { SelectItem } from '@dorkroom/logic';
import { ChevronDown, Search } from 'lucide-react';
import { type FC, useState } from 'react';
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

interface FilmFiltersMobileProps {
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

  // Mobile-specific
  resultCount: number;

  className?: string;
}

export const FilmFiltersMobile: FC<FilmFiltersMobileProps> = ({
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
  resultCount,
  className,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Count active filters
  const activeFilterCount = [
    colorTypeFilter,
    isoSpeedFilter,
    brandFilter,
    discontinuedFilter !== 'all' ? discontinuedFilter : '',
  ].filter(Boolean).length;

  return (
    <div
      className={cn(
        'relative z-0 rounded-2xl border shadow-subtle backdrop-blur',
        className
      )}
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'rgba(var(--color-background-rgb), 0.25)',
      }}
    >
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'flex w-full items-center justify-between p-4 text-left transition',
          isCollapsed ? 'rounded-2xl' : 'rounded-t-2xl'
        )}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor =
            'rgba(var(--color-background-rgb), 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor =
            'var(--collapsible-filters-bg-hover-leave, transparent)';
        }}
      >
        <div>
          <div className="flex items-center gap-3">
            <h3
              className="text-base font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Filters
            </h3>
            {hasActiveFilters && (
              <div
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: 'rgba(var(--color-background-rgb), 0.2)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {activeFilterCount} active
              </div>
            )}
          </div>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {resultCount} {resultCount === 1 ? 'film' : 'films'} found
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 transition-transform',
            !isCollapsed && 'rotate-180'
          )}
          style={{ color: 'var(--color-text-tertiary)' }}
        />
      </button>

      {!isCollapsed && (
        <div
          className="border-t p-6"
          style={{ borderColor: 'var(--color-border-secondary)' }}
        >
          {/* Search input */}
          <div className="mb-4 space-y-2">
            <label
              htmlFor="film-search-mobile"
              className="block text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Search
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}
              />
              <input
                id="film-search-mobile"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search films..."
                className="w-full rounded-lg border px-3 py-2 pl-9 focus:outline-none focus:ring-2"
                style={
                  {
                    borderColor: 'var(--color-border-secondary)',
                    backgroundColor: 'var(--color-surface-muted)',
                    color: 'var(--color-text-primary)',
                    '--tw-ring-color': 'var(--color-border-primary)',
                  } as React.CSSProperties
                }
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-border-primary)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border-secondary)';
                }}
              />
            </div>
          </div>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={onClearFilters}
                className="rounded-full border px-3 py-1.5 text-sm font-medium transition"
                style={{
                  borderColor: 'var(--color-border-secondary)',
                  color: 'var(--color-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor =
                    'var(--color-border-primary)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    'var(--color-border-secondary)';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }}
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Filter controls */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
      )}
    </div>
  );
};
