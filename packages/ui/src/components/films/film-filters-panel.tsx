import type { SelectItem } from '@dorkroom/logic';
import { Search } from 'lucide-react';
import type { FC } from 'react';
import { optionChangeHandler } from '../../lib/select-options';
import { FilterPanelContainer } from '../filters/filter-panel-container';
import { FilterPanelHeader } from '../filters/filter-panel-header';
import { FilterPanelSection } from '../filters/filter-panel-section';
import { SearchableSelect } from '../searchable-select';
import { Select } from '../select';

/** Static filter options - defined outside component to prevent recreation on each render */
const FILM_TYPE_OPTIONS: SelectItem[] = [
  { label: 'All types', value: '' },
  { label: 'Black & White', value: 'bw' },
  { label: 'Color', value: 'color' },
  { label: 'Slide', value: 'slide' },
];

const DISCONTINUED_OPTIONS = [
  { label: 'All films', value: 'all' },
  { label: 'Active only', value: 'active' },
  { label: 'Discontinued only', value: 'discontinued' },
] as const;

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
        <div className="group relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted transition-colors group-focus-within:text-brand" />
          <input
            id="film-search"
            type="text"
            aria-label="Search Films"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Type to search..."
            className="w-full rounded-lg border border-secondary bg-surface-muted px-3 py-2.5 pl-10 text-sm font-medium text-primary transition-all duration-200 focus:border-brand focus:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
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
          onValueChange={optionChangeHandler(
            DISCONTINUED_OPTIONS,
            onDiscontinuedChange
          )}
          items={DISCONTINUED_OPTIONS}
        />
      </FilterPanelSection>
    </FilterPanelContainer>
  );
};
