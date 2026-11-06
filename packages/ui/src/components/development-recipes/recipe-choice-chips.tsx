import { Check } from 'lucide-react';
import { type FocusEvent, useId, useLayoutEffect, useRef } from 'react';
import { cn } from '../../lib/cn';

export interface RecipeChoiceOption<T extends string = string> {
  id: T;
  label: string;
  /** Second line, such as the development time. */
  detail?: string;
  /** Further lines, such as "box speed" or the temperature a speed is published at. */
  notes?: readonly string[];
  /** Spoken name; carry the time here. Falls back to the visible lines. */
  accessibleName?: string;
}

export interface RecipeChoiceChipsProps<T extends string = string> {
  /** Names the group for assistive technology and, unless hidden, shows above it. */
  label: string;
  hideLabel?: boolean;
  options: readonly RecipeChoiceOption<T>[];
  /** Selected option id, or null when none matches (a free-typed value). */
  value: T | null;
  onChange: (id: T) => void;
  /** One swipeable row, for phones. Otherwise the chips wrap. */
  scroll?: boolean;
  className?: string;
}

/**
 * Scroll `row` just far enough to show `chip` whole. The focused radio is a 1px
 * box, so the browser would scroll to that, not to the chip. Set scrollLeft
 * directly: `scrollIntoView` options are read as `true` by Safari and iOS before
 * 16, which can scroll the page too.
 */
function revealInRow(row: HTMLElement, chip: Element) {
  const rowBox = row.getBoundingClientRect();
  const chipBox = chip.getBoundingClientRect();
  const edge = 4;
  if (chipBox.left < rowBox.left + edge) {
    row.scrollLeft += chipBox.left - rowBox.left - edge;
  } else if (chipBox.right > rowBox.right - edge) {
    row.scrollLeft += chipBox.right - rowBox.right + edge;
  }
}

/**
 * A single-choice group of tappable chips. Each is a native radio input, so
 * the browser gives the group one tab stop and arrow keys that move and select.
 * The selected chip carries a check and a heavier border as well as a tint,
 * because the darkroom and high-contrast themes collapse colour.
 */
export function RecipeChoiceChips<T extends string = string>({
  label,
  hideLabel = false,
  options,
  value,
  onChange,
  scroll = false,
  className,
}: RecipeChoiceChipsProps<T>) {
  const labelId = useId();
  const groupName = useId();
  const rowRef = useRef<HTMLDivElement>(null);

  const reveal = (chip: Element | null | undefined) => {
    if (scroll && rowRef.current && chip) revealInRow(rowRef.current, chip);
  };

  // A recipe can open on a chip past the row's end. Moves only the row, and
  // never focus. Runs again once web fonts load, which widen the chips after
  // the first measurement.
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!scroll || !row) return;
    const run = () => {
      const chip = row.querySelector('input:checked')?.parentElement;
      if (chip) revealInRow(row, chip);
    };
    run();
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) run();
    });
    return () => {
      live = false;
    };
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- `value` is read through the DOM: it decides which input is `:checked` in the query above
  }, [value, scroll]);

  return (
    <div className={className}>
      <div
        id={labelId}
        className={cn(
          'text-sm font-semibold text-primary',
          hideLabel ? 'sr-only' : 'mb-2'
        )}
      >
        {label}
      </div>
      <div
        ref={rowRef}
        role="radiogroup"
        aria-labelledby={labelId}
        className={cn(
          'flex gap-2 p-0.5',
          scroll ? 'overflow-x-auto pb-2 [scrollbar-width:thin]' : 'flex-wrap'
        )}
      >
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <label key={option.id} className="relative shrink-0">
              <input
                type="radio"
                name={groupName}
                checked={selected}
                onChange={() => onChange(option.id)}
                onFocus={(event: FocusEvent<HTMLInputElement>) =>
                  reveal(event.currentTarget.parentElement)
                }
                aria-label={
                  option.accessibleName ??
                  [option.label, option.detail, ...(option.notes ?? [])]
                    .filter(Boolean)
                    .join(', ')
                }
                className="peer sr-only"
              />
              <span
                className={cn(
                  'relative flex min-h-11 min-w-11 cursor-pointer flex-col items-center justify-center rounded-xl border-1 px-6 py-1.5 text-center tabular-nums transition-colors',
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--color-focus-ring)]',
                  selected
                    ? 'border-primary bg-recipe-selected text-primary shadow-[inset_0_0_0_1px_var(--color-border-primary)]'
                    : 'border-secondary text-primary hover:bg-hover-surface hover:text-on-hover-surface'
                )}
              >
                {selected && (
                  <Check
                    aria-hidden="true"
                    className="absolute bottom-0 left-1.5 top-0 my-auto size-4"
                  />
                )}
                <span className="text-sm font-medium">{option.label}</span>
                {option.detail && (
                  <span className="text-xs">{option.detail}</span>
                )}
                {option.notes?.map((note) => (
                  <span key={note} className="text-xs">
                    {note}
                  </span>
                ))}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
