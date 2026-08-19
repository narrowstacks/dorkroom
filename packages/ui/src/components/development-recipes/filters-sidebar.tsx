import type { CustomRecipeFilter, SelectItem } from '@dorkroom/logic';
import type { SortingState } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { type FC, useRef } from 'react';
import { cssVars, setStyles } from '../../lib/dom';
import { optionChangeHandler } from '../../lib/select-options';
import { FilterPanelContainer } from '../filters/filter-panel-container';
import { FilterPanelHeader } from '../filters/filter-panel-header';
import { FilterPanelSection } from '../filters/filter-panel-section';
import { SearchableSelect } from '../searchable-select';
import { Select } from '../select';

interface FiltersSidebarProps {
  className?: string;
  // Free-text search across film, developer, and dilution
  searchQuery: string;
  onSearchChange: (query: string) => void;
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

const EMPTY_SORTING: SortingState = [];

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

const recipeTypeOptions = [
  { label: 'All recipes', value: 'all' },
  { label: 'Official only', value: 'official' },
  { label: 'Hide custom recipes', value: 'hide-custom' },
  { label: 'Only custom recipes', value: 'only-custom' },
] as const;

// eslint-disable-next-line react-doctor/no-many-boolean-props -- flags toggle independent optional filter sections, not a single variant axis
export const FiltersSidebar: FC<FiltersSidebarProps> = ({
  className,
  searchQuery,
  onSearchChange,
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
  sorting = EMPTY_SORTING,
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
  const searchIconRef = useRef<SVGSVGElement>(null);

  const hasSelections = selectedFilm || selectedDeveloper;

  const hasActiveFilters =
    !!searchQuery ||
    developerTypeFilter ||
    dilutionFilter ||
    isoFilter ||
    customRecipeFilter !== 'all' ||
    favoritesOnly;

  // Count active filters (including selections)
  const activeFilterCount = [
    searchQuery,
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

      <div
        className="space-y-3 rounded-xl border p-4 shadow-md"
        style={{
          borderColor: 'var(--color-border-primary)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <label
          htmlFor="recipe-search"
          className="block text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Search recipes
        </label>
        <div className="relative">
          <Search
            ref={searchIconRef}
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            id="recipe-search"
            type="text"
            aria-label="Search recipes"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search film, developer…"
            className="w-full rounded-lg border px-3 py-2.5 pl-10 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2"
            style={cssVars({
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'var(--color-surface-muted)',
              color: 'var(--color-text-primary)',
              '--tw-ring-color': 'var(--color-primary)',
            })}
            onFocus={(e) => {
              setStyles(e.target, {
                borderColor: 'var(--color-primary)',
                backgroundColor: 'var(--color-background)',
              });
              if (searchIconRef.current) {
                searchIconRef.current.style.color = 'var(--color-primary)';
              }
            }}
            onBlur={(e) => {
              setStyles(e.target, {
                borderColor: 'var(--color-border-secondary)',
                backgroundColor: 'var(--color-surface-muted)',
              });
              if (searchIconRef.current) {
                searchIconRef.current.style.color = 'var(--color-text-muted)';
              }
            }}
          />
        </div>
      </div>

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
              setStyles(e.currentTarget, {
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-background)',
                borderColor: 'var(--color-accent)',
              });
            }}
            onMouseLeave={(e) => {
              setStyles(e.currentTarget, {
                backgroundColor: 'transparent',
                color: 'var(--color-text-secondary)',
                borderColor: 'var(--color-border-secondary)',
              });
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
          onValueChange={optionChangeHandler(
            recipeTypeOptions,
            onCustomRecipeFilterChange
          )}
          items={recipeTypeOptions}
        />
        {onFavoritesOnlyChange && (
          <label
            className="flex cursor-pointer items-center gap-2.5 rounded-lg p-1 text-sm transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <input
              type="checkbox"
              aria-label="Favorites only"
              checked={favoritesOnly}
              onChange={(e) => onFavoritesOnlyChange(e.target.checked)}
              className="size-4 rounded border-2 transition-colors"
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
