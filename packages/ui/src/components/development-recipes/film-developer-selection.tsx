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
            className="rounded-full border px-4 py-2 text-sm font-medium transition"
            style={{
              borderColor: 'var(--color-border-secondary)',
              color: 'var(--color-text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-primary)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor =
                'var(--color-border-secondary)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            Clear selections
          </button>
        )}
      </div>
    </div>
  );
}
