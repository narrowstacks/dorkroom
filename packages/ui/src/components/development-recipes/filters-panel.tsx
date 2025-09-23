import { TextInput } from '../text-input';
import { Select } from '../select';
import type { SelectItem } from '@dorkroom/logic';
import { cn } from '../../lib/cn';

interface DevelopmentFiltersProps {
  className?: string;
  filmSearch: string;
  onFilmSearchChange: (value: string) => void;
  developerSearch: string;
  onDeveloperSearchChange: (value: string) => void;
  developerTypeFilter: string;
  onDeveloperTypeFilterChange: (value: string) => void;
  developerTypeOptions: SelectItem[];
  dilutionFilter: string;
  onDilutionFilterChange: (value: string) => void;
  dilutionOptions: SelectItem[];
  isoFilter: string;
  onIsoFilterChange: (value: string) => void;
  isoOptions: SelectItem[];
  onClearFilters: () => void;
}

export function DevelopmentFiltersPanel({
  className,
  filmSearch,
  onFilmSearchChange,
  developerSearch,
  onDeveloperSearchChange,
  developerTypeFilter,
  onDeveloperTypeFilterChange,
  developerTypeOptions,
  dilutionFilter,
  onDilutionFilterChange,
  dilutionOptions,
  isoFilter,
  onIsoFilterChange,
  isoOptions,
  onClearFilters,
}: DevelopmentFiltersProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/5 p-6 shadow-subtle backdrop-blur',
        className,
      )}
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Filters</h3>
          <p className="text-sm text-white/60">
            Narrow down combinations by film, developer, dilution, and ISO.
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
        <TextInput
          label="Film search"
          placeholder="Search by film brand or name"
          value={filmSearch}
          onChange={onFilmSearchChange}
        />
        <TextInput
          label="Developer search"
          placeholder="Search by developer or manufacturer"
          value={developerSearch}
          onChange={onDeveloperSearchChange}
        />
        <Select
          label="Developer type"
          selectedValue={developerTypeFilter}
          onValueChange={onDeveloperTypeFilterChange}
          items={developerTypeOptions}
        />
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
      </div>
    </div>
  );
}
