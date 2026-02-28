import type { CustomRecipeFilter, SelectItem } from '@dorkroom/logic';
import type { SortingState } from '@tanstack/react-table';
import type { FC } from 'react';
import {
  FilterPanelContainer,
  FilterPanelHeader,
  FilterPanelSection,
} from '../filters';
import { SearchableSelect } from '../searchable-select';
import { Select } from '../select';

interface FiltersSidebarProps {
  className?: string;
  // Film and Developer selection
  selectedFilm: string;
  onFilmChange: (value: string) => void;
  filmOptions: SelectItem[];
  selectedDeveloper: string;
  onDeveloperChange: (value: string) => void;
  developerOptions: SelectItem[];
  // Filters
  developerTypeFilter: string;
  onDeveloperTypeFilterChange: (value: string) => void;
  developerTypeOptions: SelectItem[];
  dilutionFilter: string;
  onDilutionFilterChange: (value: string) => void;
  dilutionOptions: SelectItem[];
  isoFilter: string;
  onIsoFilterChange: (value: string) => void;
  isoOptions: SelectItem[];
  customRecipeFilter: CustomRecipeFilter;
  onCustomRecipeFilterChange: (value: CustomRecipeFilter) => void;
  favoritesOnly?: boolean;
  onFavoritesOnlyChange?: (value: boolean) => void;
  // Sorting (for cards view)
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  showSortingControls?: boolean;
  // Actions
  onClearFilters: () => void;
  onClearSelections: () => void;
  showDeveloperTypeFilter?: boolean;
  showDilutionFilter?: boolean;
  showIsoFilter?: boolean;
  // Collapse state
  onCollapsedChange?: (collapsed: boolean) => void;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
}

const sortingOptions: SelectItem[] = [
  { label: 'Film (A-Z)', value: 'film-asc' },
  { label: 'Film (Z-A)', value: 'film-desc' },
  { label: 'Developer (A-Z)', value: 'developer-asc' },
  { label: 'Developer (Z-A)', value: 'developer-desc' },
  { label: 'ISO (Low to High)', value: 'combination.shootingIso-asc' },
  { label: 'ISO (High to Low)', value: 'combination.shootingIso-desc' },
  { label: 'Time (Short to Long)', value: 'combination.timeMinutes-asc' },
  { label: 'Time (Long to Short)', value: 'combination.timeMinutes-desc' },
  {
    label: 'Temperature (Low to High)',
    value: 'combination.temperatureF-asc',
  },
  {
    label: 'Temperature (High to Low)',
    value: 'combination.temperatureF-desc',
  },
];

const recipeTypeOptions: SelectItem[] = [
  { label: 'All recipes', value: 'all' },
  { label: 'Official only', value: 'official' },
  { label: 'Hide custom recipes', value: 'hide-custom' },
  { label: 'Only custom recipes', value: 'only-custom' },
];

export const FiltersSidebar: FC<FiltersSidebarProps> = ({
  className,
  selectedFilm,
  onFilmChange,
  filmOptions,
  selectedDeveloper,
  onDeveloperChange,
  developerOptions,
  developerTypeFilter,
  onDeveloperTypeFilterChange,
  developerTypeOptions,
  dilutionFilter,
  onDilutionFilterChange,
  dilutionOptions,
  isoFilter,
  onIsoFilterChange,
  isoOptions,
  customRecipeFilter,
  onCustomRecipeFilterChange,
  favoritesOnly = false,
  onFavoritesOnlyChange,
  sorting = [],
  onSortingChange,
  showSortingControls = false,
  onClearFilters,
  onClearSelections,
  showDeveloperTypeFilter = true,
  showDilutionFilter = true,
  showIsoFilter = true,
  onCollapsedChange,
  collapsed,
  defaultCollapsed = false,
}) => {
  const hasSelections = selectedFilm || selectedDeveloper;

  const hasActiveFilters =
    developerTypeFilter ||
    dilutionFilter ||
    isoFilter ||
    customRecipeFilter !== 'all' ||
    favoritesOnly;

  // Count active filters (including selections)
  const activeFilterCount = [
    selectedFilm,
    selectedDeveloper,
    developerTypeFilter,
    dilutionFilter,
    isoFilter,
    customRecipeFilter !== 'all',
    favoritesOnly,
  ].filter(Boolean).length;

  // Get current sorting value for select
  const getCurrentSortingValue = (): string => {
    if (sorting.length === 0) return 'film-asc';
    const sort = sorting[0];
    const direction = sort.desc ? 'desc' : 'asc';
    return `${sort.id}-${direction}`;
  };

  const handleSortingChange = (value: string) => {
    // Use lastIndexOf to handle column IDs that contain dashes (e.g., "combination.shootingIso-asc")
    const lastDash = value.lastIndexOf('-');
    const id = value.slice(0, lastDash);
    const direction = value.slice(lastDash + 1);
    onSortingChange?.([{ id, desc: direction === 'desc' }]);
  };

  const handleClearAll = () => {
    onClearSelections();
    onClearFilters();
  };

  return (
    <FilterPanelContainer
      className={className}
      activeFilterCount={activeFilterCount}
      hasActiveFilters={!!(hasActiveFilters || hasSelections)}
      onCollapsedChange={onCollapsedChange}
      collapsed={collapsed}
      defaultCollapsed={defaultCollapsed}
    >
      <FilterPanelHeader />

      <FilterPanelSection
        title="Filters"
        onClear={handleClearAll}
        showClear={!!(hasSelections || hasActiveFilters)}
      >
        <SearchableSelect
          label="Film"
          placeholder="Search films..."
          selectedValue={selectedFilm}
          onValueChange={onFilmChange}
          items={filmOptions}
        />
        <SearchableSelect
          label="Developer"
          placeholder="Search developers..."
          selectedValue={selectedDeveloper}
          onValueChange={onDeveloperChange}
          items={developerOptions}
        />
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="self-start rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200"
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
            Clear filters
          </button>
        )}
        {showDeveloperTypeFilter && (
          <Select
            label="Developer type"
            selectedValue={developerTypeFilter}
            onValueChange={onDeveloperTypeFilterChange}
            items={developerTypeOptions}
          />
        )}
        {showDilutionFilter && (
          <Select
            label="Dilution"
            selectedValue={dilutionFilter}
            onValueChange={onDilutionFilterChange}
            items={dilutionOptions}
          />
        )}
        {showIsoFilter && (
          <Select
            label="ISO"
            selectedValue={isoFilter}
            onValueChange={onIsoFilterChange}
            items={isoOptions}
          />
        )}
        <Select
          label="Recipe type"
          selectedValue={customRecipeFilter}
          onValueChange={(value) =>
            onCustomRecipeFilterChange(value as CustomRecipeFilter)
          }
          items={recipeTypeOptions}
        />
        {onFavoritesOnlyChange && (
          <label
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-sm transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(e) => onFavoritesOnlyChange(e.target.checked)}
              className="h-4 w-4 rounded border-2 transition-colors"
              style={{
                borderColor: favoritesOnly
                  ? 'var(--color-primary)'
                  : 'var(--color-border-secondary)',
                accentColor: 'var(--color-primary)',
              }}
            />
            Favorites only
          </label>
        )}
      </FilterPanelSection>

      {/* Sort By section */}
      {showSortingControls && onSortingChange && (
        <FilterPanelSection title="Sort By">
          <Select
            label=""
            selectedValue={getCurrentSortingValue()}
            onValueChange={handleSortingChange}
            items={sortingOptions}
          />
        </FilterPanelSection>
      )}
    </FilterPanelContainer>
  );
};
