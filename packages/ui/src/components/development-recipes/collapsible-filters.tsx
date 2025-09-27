import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Select } from '../select';
import type { SelectItem, CustomRecipeFilter } from '@dorkroom/logic';
import { cn } from '../../lib/cn';

interface CollapsibleFiltersProps {
  className?: string;
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
  showDilutionFilter?: boolean;
  defaultCollapsed?: boolean;
  favoritesOnly?: boolean;
  onFavoritesOnlyChange?: (value: boolean) => void;
}

export function CollapsibleFilters({
  className,
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
  showDilutionFilter = true,
  defaultCollapsed = true,
  favoritesOnly = false,
  onFavoritesOnlyChange,
}: CollapsibleFiltersProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const customRecipeOptions = [
    { label: 'All recipes', value: 'all' },
    { label: 'Hide custom recipes', value: 'hide-custom' },
    { label: 'Only custom recipes', value: 'only-custom' },
  ];

  // Check if any filters are active
  const hasActiveFilters =
    developerTypeFilter ||
    dilutionFilter ||
    isoFilter ||
    customRecipeFilter !== 'all' ||
    tagFilter ||
    favoritesOnly;

  const activeFilterCount = [
    developerTypeFilter,
    dilutionFilter,
    isoFilter,
    customRecipeFilter !== 'all' ? customRecipeFilter : '',
    tagFilter,
    favoritesOnly ? 'favorites' : '',
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
          e.currentTarget.style.backgroundColor = 'var(--collapsible-filters-bg-hover-leave, transparent)';
        }}
      >
        <div>
          <div className="flex items-center gap-3">
            <h3
              className="text-base font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Advanced Filters
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
            Refine results by developer type, dilution, ISO, recipe type, and
            tags.
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
          <div className="mb-2 flex items-center justify-between">
            {hasActiveFilters && (
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
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              <div className="flex items-end">
                <label
                  className="flex items-center gap-2 text-xs"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  <input
                    type="checkbox"
                    checked={favoritesOnly}
                    onChange={(e) => onFavoritesOnlyChange(e.target.checked)}
                  />
                  Favorites only
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
