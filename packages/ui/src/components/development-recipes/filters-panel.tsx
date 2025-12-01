import type { CustomRecipeFilter, SelectItem } from '@dorkroom/logic';
import { cn } from '../../lib/cn';
import { SearchableSelect } from '../searchable-select';
import { Select } from '../select';

interface DevelopmentFiltersProps {
  className?: string;
  selectedFilm: string;
  onFilmChange: (value: string) => void;
  filmOptions: SelectItem[];
  selectedDeveloper: string;
  onDeveloperChange: (value: string) => void;
  developerOptions: SelectItem[];
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
  onClearFilters: () => void;
  showDeveloperTypeFilter?: boolean;
}

export function DevelopmentFiltersPanel({
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
  onClearFilters,
  showDeveloperTypeFilter = true,
}: DevelopmentFiltersProps) {
  const customRecipeOptions: SelectItem[] = [
    { label: 'All recipes', value: 'all' },
    { label: 'Hide custom recipes', value: 'hide-custom' },
    { label: 'Only custom recipes', value: 'only-custom' },
  ];

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/5 p-6 shadow-subtle backdrop-blur',
        className
      )}
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Filters</h3>
          <p className="text-sm text-white/60">
            Narrow down combinations by film, developer, dilution, ISO, recipe
            type, and tags.
          </p>
        </div>
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
        >
          Clear filters
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        {showDeveloperTypeFilter && (
          <Select
            label="Developer type"
            selectedValue={developerTypeFilter}
            onValueChange={onDeveloperTypeFilterChange}
            items={developerTypeOptions}
          />
        )}
        <Select
          label="Dilution"
          selectedValue={dilutionFilter}
          onValueChange={onDilutionFilterChange}
          items={dilutionOptions}
        />
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
      </div>
    </div>
  );
}
