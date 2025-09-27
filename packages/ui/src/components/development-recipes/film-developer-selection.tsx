import { SearchableSelect } from '../searchable-select';
import type { SelectItem } from '@dorkroom/logic';
import { cn } from '../../lib/cn';

interface FilmDeveloperSelectionProps {
  className?: string;
  selectedFilm: string;
  onFilmChange: (value: string) => void;
  filmOptions: SelectItem[];
  selectedDeveloper: string;
  onDeveloperChange: (value: string) => void;
  developerOptions: SelectItem[];
}

/**
 * Render a pair of searchable selects for choosing a film and a developer, plus a button to clear both selections when any is chosen.
 *
 * @param className - Optional additional class names to apply to the container.
 * @param selectedFilm - Currently selected film identifier or empty string when none is selected.
 * @param onFilmChange - Callback invoked with the new film identifier when the film selection changes.
 * @param filmOptions - Available film options to populate the film select.
 * @param selectedDeveloper - Currently selected developer identifier or empty string when none is selected.
 * @param onDeveloperChange - Callback invoked with the new developer identifier when the developer selection changes.
 * @param developerOptions - Available developer options to populate the developer select.
 * @returns A React element containing the two searchable selects and a conditional "Clear selections" button that resets both selections.
 */
export function FilmDeveloperSelection({
  className,
  selectedFilm,
  onFilmChange,
  filmOptions,
  selectedDeveloper,
  onDeveloperChange,
  developerOptions,
}: FilmDeveloperSelectionProps) {
  const hasSelections = selectedFilm || selectedDeveloper;

  const clearSelections = () => {
    onFilmChange('');
    onDeveloperChange('');
  };

  return (
    <div
      className={cn(
        'relative z-10 rounded-2xl border p-6 shadow-subtle backdrop-blur',
        className
      )}
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'rgba(var(--color-background-rgb), 0.25)',
      }}
    >
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
      </div>
      <div className="flex items-center justify-between gap-4 pt-4">
        {hasSelections && (
          <button
            type="button"
            onClick={clearSelections}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium transition',
              'border-[var(--color-border-secondary)] text-[var(--color-text-secondary)]',
              'hover:border-[var(--color-border-primary)] hover:text-[var(--color-text-primary)]',
              'focus-visible:border-[var(--color-border-primary)] focus-visible:text-[var(--color-text-primary)]',
              'active:border-[var(--color-border-primary)] active:text-[var(--color-text-primary)]'
            )}
          >
            Clear selections
          </button>
        )}
      </div>
    </div>
  );
}
