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
  /**
   * `columns` puts the two side by side from `md` up, `stacked` always one
   * above the other. Both give the inputs 44px targets and no frame, for a
   * page that lays out its own surfaces. The page has its own Start over, so
   * the inputs carry no clear control.
   */
  layout?: 'columns' | 'stacked';
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
  layout = 'columns',
}: FilmDeveloperSelectionProps) {
  const filmSelectRef = useRef<SearchableSelectHandle>(null);
  useImperativeHandle(ref, () => ({
    focusFilm: () => filmSelectRef.current?.focusWithoutOpening(),
  }));

  const triggerClass = (picker: 'film' | 'developer') =>
    cn('min-h-11', needs === picker && NEEDED_OUTLINE);

  return (
    <div className="relative z-10">
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
          allowClear={false}
        />
        <SearchableSelect
          label="Developer"
          placeholder="Search developers..."
          selectedValue={selectedDeveloper}
          onValueChange={onDeveloperChange}
          items={developerOptions}
          triggerClassName={triggerClass('developer')}
          allowClear={false}
        />
      </div>
      {/* The outline alone says nothing to a screen reader. */}
      <p aria-live="polite" className="sr-only">
        {needs ? `Choose a ${needs} next.` : ''}
      </p>
    </div>
  );
}
