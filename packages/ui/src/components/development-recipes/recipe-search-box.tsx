import { X } from 'lucide-react';
import { type FC, type RefObject, useId, useRef } from 'react';
import { cn } from '../../lib/cn';

export interface RecipeSearchBoxProps {
  /** The text in the box. A `q` link seeds it by starting here. */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hideLabel?: boolean;
  placeholder?: string;
  /** For focusing the box from outside, such as on opening a sheet. */
  inputRef?: RefObject<HTMLInputElement | null>;
  /**
   * Takes Escape from the browser, whose search input would clear itself after
   * the sheet has closed. Without it, Escape clears the box as usual.
   */
  onEscape?: () => void;
  /** Enter or the keyboard's Search key, such as to move to the first result. */
  onEnter?: () => void;
  className?: string;
}

/**
 * A labelled search input. Results are a plain list after it, so there is no
 * combobox: Tab walks from here into them. 16px text, or iOS zooms on focus. The
 * browser's own clear button is swapped for one with a 44px target.
 */
export const RecipeSearchBox: FC<RecipeSearchBoxProps> = ({
  value,
  onChange,
  label = 'Search recipes',
  hideLabel = false,
  placeholder = 'hp5 800 xtol',
  inputRef,
  onEscape,
  onEnter,
  className,
}) => {
  const id = useId();
  const ownRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? ownRef;
  return (
    <div className={cn('relative', className)}>
      <label
        htmlFor={id}
        className={cn(
          hideLabel
            ? 'sr-only'
            : 'mb-1 block text-sm font-medium text-secondary'
        )}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={ref}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            const handler =
              event.key === 'Escape'
                ? onEscape
                : event.key === 'Enter'
                  ? onEnter
                  : undefined;
            if (!handler) return;
            event.preventDefault();
            handler();
          }}
          placeholder={placeholder}
          enterKeyHint="search"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={cn(
            'block min-h-11 w-full rounded-xl border-1 border-secondary bg-[color:var(--color-surface-muted)] py-2 pl-3 pr-11 text-base text-primary placeholder:text-[color:var(--color-text-tertiary)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]',
            '[&::-webkit-search-cancel-button]:appearance-none'
          )}
        />
        {value !== '' && (
          <button
            type="button"
            aria-label="Clear text"
            // A mouse press must not take focus from the box first.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange('');
              // This button unmounts now, which would drop focus to the body.
              ref.current?.focus();
            }}
            className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-xl text-secondary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-focus-ring)] hoverable-icon-btn"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
};
