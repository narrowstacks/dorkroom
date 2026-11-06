import type { SelectItem } from '@dorkroom/logic';
import { type Ref, useImperativeHandle, useRef } from 'react';
import { cn } from '../../lib/cn';
import {
  SearchableSelect,
  type SearchableSelectHandle,
} from '../searchable-select';

export interface FilmDeveloperSelectionHandle {
  /**
   * Focuses the Film input without opening its list, for after Start over. On a
   * touch screen the browser may still raise the keyboard.
   */
  focusFilm: () => void;
}

interface FilmDeveloperSelectionProps {
  ref?: Ref<FilmDeveloperSelectionHandle>;
  selectedFilm: string;
  onFilmChange: (value: string) => void;
  filmOptions: SelectItem[];
  selectedDeveloper: string;
  onDeveloperChange: (value: string) => void;
  developerOptions: SelectItem[];
  /** The picker still needed, which gets the brand outline. */
  needs?: 'film' | 'developer';
  /** Removes both clear controls, where the page has its own Start over. */
  hideClear?: boolean;
  /**
   * `card` is the framed original. `columns` and `stacked` drop the frame, for a
   * page that lays out its own surfaces, and give the inputs 44px targets.
   */
  layout?: 'card' | 'columns' | 'stacked';
}

/**
 * Dashed and set away from the input, because high contrast and darkroom give
 * the brand and focus tokens one colour. The input's focus style removes it, so
 * the two never show together.
 */
const NEEDED_OUTLINE =
  'outline-2 outline-offset-2 outline-dashed outline-[color:var(--color-brand)]';

export function FilmDeveloperSelection({
  ref,
  selectedFilm,
  onFilmChange,
  filmOptions,
  selectedDeveloper,
  onDeveloperChange,
  developerOptions,
  needs,
  hideClear = false,
  layout = 'card',
}: FilmDeveloperSelectionProps) {
  const hasSelections = selectedFilm || selectedDeveloper;
  const isCard = layout === 'card';
  const filmSelectRef = useRef<SearchableSelectHandle>(null);
  useImperativeHandle(ref, () => ({
    focusFilm: () => filmSelectRef.current?.focusWithoutOpening(),
  }));

  const clearSelections = () => {
    onFilmChange('');
    onDeveloperChange('');
  };

  const triggerClass = (picker: 'film' | 'developer') =>
    cn(!isCard && 'min-h-11', needs === picker && NEEDED_OUTLINE);

  return (
    <div
      className={cn(
        'relative z-10',
        isCard && 'rounded-2xl border p-6 shadow-subtle'
      )}
      style={
        isCard
          ? {
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'rgba(var(--color-background-rgb), 0.25)',
            }
          : undefined
      }
    >
      <div
        className={cn(
          'grid grid-cols-1 gap-4',
          layout !== 'stacked' && 'md:grid-cols-2'
        )}
      >
        <SearchableSelect
          ref={filmSelectRef}
          label="Film"
          placeholder="Search films..."
          selectedValue={selectedFilm}
          onValueChange={onFilmChange}
          items={filmOptions}
          triggerClassName={triggerClass('film')}
          allowClear={!hideClear}
        />
        <SearchableSelect
          label="Developer"
          placeholder="Search developers..."
          selectedValue={selectedDeveloper}
          onValueChange={onDeveloperChange}
          items={developerOptions}
          triggerClassName={triggerClass('developer')}
          allowClear={!hideClear}
        />
      </div>
      {/* The outline alone says nothing to a screen reader. */}
      {(!isCard || needs) && (
        <p aria-live="polite" className="sr-only">
          {needs ? `Choose a ${needs} next.` : ''}
        </p>
      )}
      {!hideClear && (
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
      )}
    </div>
  );
}
