/* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- CSS custom properties extend CSSProperties */
import type { SelectItem } from '@dorkroom/logic';
import { Search } from 'lucide-react';
import { type FC, useRef } from 'react';
import {
  FilterPanelContainer,
  FilterPanelHeader,
  FilterPanelSection,
} from '../filters';
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
  const searchIconRef = useRef<SVGSVGElement>(null);

  // Count active filters (including search)
  const activeFilterCount = [
    searchQuery,
    colorTypeFilter,
    isoSpeedFilter,
    brandFilter,
    discontinuedFilter !== 'all',
  ].filter(Boolean).length;

  return (
    <FilterPanelContainer
      className={className}
      activeFilterCount={activeFilterCount}
      hasActiveFilters={hasActiveFilters}
      onCollapsedChange={onCollapsedChange}
      defaultCollapsed={defaultCollapsed}
    >
      <FilterPanelHeader />

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

      {/* Filters section */}
      <FilterPanelSection
        title="Filter Options"
        onClear={onClearFilters}
        showClear={hasActiveFilters}
      >
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
      </FilterPanelSection>
    </FilterPanelContainer>
  );
};
