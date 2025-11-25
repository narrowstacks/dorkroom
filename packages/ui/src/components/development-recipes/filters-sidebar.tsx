import { type FC } from 'react';
import { SearchableSelect } from '../searchable-select';
import { Select } from '../select';
import type { SelectItem, CustomRecipeFilter } from '@dorkroom/logic';
import type { SortingState } from '@tanstack/react-table';
import { cn } from '../../lib/cn';

interface FiltersSidebarProps {
  className?: string;
  // Film and Developer selection
  selectedFilm: string;
  onFilmChange: (value: string) => void;
  filmOptions: SelectItem[];
  selectedDeveloper: string;
  onDeveloperChange: (value: string) => void;
  developerOptions: SelectItem[];
  // Advanced filters
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
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  tagOptions: SelectItem[];
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
  tagFilter,
  onTagFilterChange,
  tagOptions,
  favoritesOnly = false,
  onFavoritesOnlyChange,
  sorting = [],
  onSortingChange,
  showSortingControls = false,
  onClearFilters,
  onClearSelections,
  showDeveloperTypeFilter = true,
  showDilutionFilter = true,
}) => {
  const hasSelections = selectedFilm || selectedDeveloper;

  const customRecipeOptions = [
    { label: 'All recipes', value: 'all' },
    { label: 'Hide custom recipes', value: 'hide-custom' },
    { label: 'Only custom recipes', value: 'only-custom' },
  ];

  const hasActiveFilters =
    developerTypeFilter ||
    dilutionFilter ||
    isoFilter ||
    customRecipeFilter !== 'all' ||
    tagFilter ||
    favoritesOnly;

  // Get current sorting value for select
  const getCurrentSortingValue = (): string => {
    if (sorting.length === 0) return 'film-asc';
    const sort = sorting[0];
    const direction = sort.desc ? 'desc' : 'asc';
    return `${sort.id}-${direction}`;
  };

  const handleSortingChange = (value: string) => {
    const [id, direction] = value.split('-');
    onSortingChange?.([{ id, desc: direction === 'desc' }]);
  };

  return (
    <div
      className={cn(
        'sticky top-6 h-fit space-y-4 rounded-2xl border p-4 shadow-subtle backdrop-blur',
        className
      )}
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'rgba(var(--color-background-rgb), 0.25)',
      }}
    >
      <div>
        <h3
          className="mb-3 text-sm font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Film & Developer
        </h3>

        <div className="space-y-3">
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

          {hasSelections && (
            <button
              type="button"
              onClick={onClearSelections}
              className={cn(
                'w-full rounded-full border px-3 py-1.5 text-sm font-medium transition',
                'border-[var(--color-border-secondary)] text-[var(--color-text-secondary)]',
                'hover:border-[var(--color-border-primary)] hover:text-[var(--color-text-primary)]'
              )}
            >
              Clear selections
            </button>
          )}
        </div>
      </div>

      <div
        className="border-t pt-4"
        style={{ borderColor: 'var(--color-border-secondary)' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Advanced Filters
          </h3>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs transition"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              Clear all
            </button>
          )}
        </div>

        <div className="space-y-3">
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
          <Select
            label="ISO"
            selectedValue={isoFilter}
            onValueChange={onIsoFilterChange}
            items={isoOptions}
          />
          <Select
            label="Recipe type"
            selectedValue={customRecipeFilter}
            onValueChange={(value) =>
              onCustomRecipeFilterChange(value as CustomRecipeFilter)
            }
            items={customRecipeOptions}
          />
          <Select
            label="Tag"
            selectedValue={tagFilter}
            onValueChange={onTagFilterChange}
            items={tagOptions}
          />
          {onFavoritesOnlyChange && (
            <label
              className="flex items-center gap-2 text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <input
                type="checkbox"
                checked={favoritesOnly}
                onChange={(e) => onFavoritesOnlyChange(e.target.checked)}
                className="rounded"
              />
              Favorites only
            </label>
          )}
        </div>
      </div>

      {showSortingControls && onSortingChange && (
        <div
          className="border-t pt-4"
          style={{ borderColor: 'var(--color-border-secondary)' }}
        >
          <h3
            className="mb-3 text-sm font-semibold uppercase tracking-wide"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Sort By
          </h3>

          <Select
            label=""
            selectedValue={getCurrentSortingValue()}
            onValueChange={handleSortingChange}
            items={sortingOptions}
          />
        </div>
      )}
    </div>
  );
};
