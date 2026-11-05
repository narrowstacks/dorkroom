import type { FilmSort, SelectItem } from '@dorkroom/logic';
import { Search } from 'lucide-react';
import { type FC, useRef } from 'react';
import { cn } from '../../lib/cn';
import { optionChangeHandler } from '../../lib/select-options';
import { SearchableSelect } from '../searchable-select';
import { Select } from '../select';
import { FILM_TYPE_OPTIONS } from './film-type-options';

const DISCONTINUED_OPTIONS = [
  { label: 'All films', value: 'all' },
  { label: 'Active only', value: 'active' },
  { label: 'Discontinued only', value: 'discontinued' },
] as const;

const BASE_SORT_OPTIONS: { label: string; value: FilmSort }[] = [
  { label: 'Name', value: 'name' },
  { label: 'ISO', value: 'iso' },
];

const RECIPES_SORT_OPTION = {
  label: 'Most recipes',
  value: 'recipes',
} as const satisfies { label: string; value: FilmSort };

const TYPE_GROUP_LABEL_ID = 'film-toolbar-type-label';
const TYPE_GROUP_NAME = 'film-toolbar-type';

export interface FilmToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  colorTypeFilter: string;
  onColorTypeChange: (value: string) => void;
  isoSpeedFilter: string;
  onIsoSpeedChange: (value: string) => void;
  brandFilter: string;
  onBrandChange: (value: string) => void;
  discontinuedFilter: 'all' | 'active' | 'discontinued';
  onDiscontinuedChange: (value: 'all' | 'active' | 'discontinued') => void;
  brandOptions: SelectItem[];
  isoOptions: SelectItem[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  /** Null while the catalog loads, so no count is shown yet. */
  resultCount: number | null;
  /** The sort that is applied, not the one requested. */
  sort: FilmSort;
  onSortChange: (sort: FilmSort) => void;
  /** Whether "Most recipes" can be offered (not under a color or slide filter). */
  recipesSortAvailable: boolean;
  /** Whether to render the Sort select (phones; wider layouts sort by header). */
  showSortSelect: boolean;
  className?: string;
}

/**
 * Search, type, ISO, brand and status above the film results, replacing the
 * filter sidebar. The count is plain text: the page's live region announces it.
 */
export const FilmToolbar: FC<FilmToolbarProps> = ({
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
  sort,
  onSortChange,
  recipesSortAvailable,
  showSortSelect,
  className,
}) => {
  const sortOptions = recipesSortAvailable
    ? [...BASE_SORT_OPTIONS, RECIPES_SORT_OPTION]
    : BASE_SORT_OPTIONS;
  const searchRef = useRef<HTMLInputElement>(null);

  return (
    // z-10: the results below are absolutely positioned, transformed rows that
    // each form a stacking context, and an open SearchableSelect list would
    // otherwise render behind them (#596).
    <div
      className={cn(
        'relative z-10 flex flex-col gap-2 rounded-2xl md:gap-4 border border-[color:var(--color-border-secondary)] bg-surface p-3 sm:p-4 md:flex-row md:flex-wrap md:items-end',
        className
      )}
    >
      <div className="min-w-0 md:min-w-56 md:flex-1">
        <label htmlFor="film-search" className="sr-only">
          Search films
        </label>
        <div className="group relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted transition-colors group-focus-within:text-brand" />
          <input
            id="film-search"
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search films..."
            className="min-h-11 w-full rounded-xl border border-secondary bg-surface-muted px-3 py-2 pl-10 text-sm font-medium text-primary transition-colors focus:border-brand focus:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
          />
        </div>
      </div>

      <div className="min-w-0">
        <span id={TYPE_GROUP_LABEL_ID} className="sr-only">
          Film type
        </span>
        <div
          role="radiogroup"
          aria-labelledby={TYPE_GROUP_LABEL_ID}
          className="grid grid-cols-4 gap-1 rounded-xl border border-[color:var(--color-border-secondary)] p-1 md:inline-flex"
        >
          {FILM_TYPE_OPTIONS.map((option) => (
            <label key={option.value} className="flex min-w-0">
              <input
                type="radio"
                name={TYPE_GROUP_NAME}
                value={option.value}
                checked={option.value === colorTypeFilter}
                onChange={() => onColorTypeChange(option.value)}
                className="peer sr-only"
              />
              <span className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg px-1 text-center text-xs font-normal leading-tight text-secondary transition-colors hover:bg-hover-surface hover:text-on-hover-surface peer-checked:bg-text-primary peer-checked:font-semibold peer-checked:text-background peer-checked:hover:bg-text-primary peer-checked:hover:text-background peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--color-focus-ring)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[color:var(--color-surface)] sm:px-2 sm:text-sm md:px-3">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:contents">
        <SearchableSelect
          label="ISO speed"
          selectedValue={isoSpeedFilter}
          onValueChange={onIsoSpeedChange}
          items={isoOptions}
          placeholder="Select ISO..."
          triggerClassName="min-h-11"
          className="min-w-0 md:w-36"
        />
        <SearchableSelect
          label="Brand"
          selectedValue={brandFilter}
          onValueChange={onBrandChange}
          items={brandOptions}
          placeholder="Select brand..."
          triggerClassName="min-h-11"
          className="min-w-0 md:w-44"
        />
        <Select
          label="Status"
          selectedValue={discontinuedFilter}
          onValueChange={optionChangeHandler(
            DISCONTINUED_OPTIONS,
            onDiscontinuedChange
          )}
          items={DISCONTINUED_OPTIONS}
          selectClassName="min-h-11"
          className="min-w-0 md:w-44"
        />
        {showSortSelect && (
          <Select
            label="Sort"
            selectedValue={sort}
            onValueChange={optionChangeHandler(sortOptions, onSortChange)}
            items={sortOptions}
            selectClassName="min-h-11"
            className="min-w-0 md:w-40"
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 md:ml-auto md:justify-end">
        {resultCount !== null && (
          <p className="text-sm text-[color:var(--color-text-tertiary)]">
            {resultCount} {resultCount === 1 ? 'film' : 'films'}
          </p>
        )}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              onClearFilters();
              searchRef.current?.focus();
            }}
            className="min-h-11 rounded-full border border-secondary px-3 text-sm font-medium text-secondary transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};
