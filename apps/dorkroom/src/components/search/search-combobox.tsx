import type { HomeSuggestion, HomeSuggestionHint } from '@dorkroom/logic';
import { cn } from '@dorkroom/ui';
import { Search, X } from 'lucide-react';
import {
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useId,
  useState,
} from 'react';
import { isSearchShortcut, SEARCH_KEYSHORTCUTS } from './search-shortcut';

const HINT_LABELS = {
  film: 'Film',
  developer: 'Developer',
  tool: 'Tool',
  recipe: 'Recipe',
  reciprocity: 'Reciprocity',
  border: 'Border',
  resize: 'Resize',
  mat: 'Mat',
  lens: 'Lens',
  stops: 'Stops',
  camera_exposure: 'Camera',
} as const satisfies Record<HomeSuggestionHint, string>;

interface SearchComboboxProps {
  /** The text box, so the page can return focus to it. */
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
  suggestions: readonly HomeSuggestion[];
  /** A suggestion was picked: fill the box with its query. */
  onSelect: (suggestion: HomeSuggestion) => void;
  /** First interest in searching (focus, pointer, key), to start loading data. */
  onIntent: () => void;
  placeholder: string;
  /**
   * The box stands on its own on the page (the home hero, the default):
   * Escape with the list closed clears it, and an empty box shows the "/"
   * key that focuses it. Off in the search dialog, where that Escape closes
   * the dialog and the box already has focus.
   */
  standalone?: boolean;
}

/**
 * The search box: a WAI-ARIA 1.2 combobox with a list of suggestions.
 * Arrow keys move through the list (focus stays in the box), Enter picks,
 * Escape closes the list or else clears the box (see `standalone`), Tab
 * closes it and moves on. The search shortcut (Cmd+K, Ctrl+K, or "/" outside
 * a text field) focuses the box.
 */
export function SearchCombobox({
  inputRef,
  value,
  onChange,
  suggestions,
  onSelect,
  onIntent,
  placeholder,
  standalone = true,
}: SearchComboboxProps) {
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const expanded = open && suggestions.length > 0;
  const activeIndex = active < suggestions.length ? active : -1;

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!isSearchShortcut(event)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [inputRef]);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const pick = (suggestion: HomeSuggestion) => {
    onSelect(suggestion);
    close();
  };

  const move = (step: 1 | -1) => {
    onIntent();
    if (!expanded) {
      setOpen(true);
      setActive(step === 1 ? 0 : suggestions.length - 1);
      return;
    }
    const count = suggestions.length;
    setActive((index) =>
      index < 0 ? (step === 1 ? 0 : count - 1) : (index + step + count) % count
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (event.altKey) setOpen(true);
        else move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        move(-1);
        break;
      case 'Enter':
        if (expanded && activeIndex >= 0) {
          event.preventDefault();
          pick(suggestions[activeIndex]);
        } else {
          close();
        }
        break;
      case 'Escape':
        if (expanded) {
          event.preventDefault();
          close();
        } else if (value && standalone) {
          event.preventDefault();
          onChange('');
        }
        break;
      case 'Tab':
        close();
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search recipes, films and calculators
      </label>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[color:var(--color-text-tertiary)]"
      />
      <input
        ref={inputRef}
        id={`${listId}-input`}
        type="text"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-keyshortcuts={SEARCH_KEYSHORTCUTS}
        aria-activedescendant={
          expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined
        }
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onIntent();
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={onIntent}
        onPointerEnter={onIntent}
        onClick={() => setOpen(true)}
        onBlur={close}
        onKeyDown={onKeyDown}
        className="w-full rounded-xl border border-[color:var(--color-border-primary)] bg-[color:var(--color-background)] py-3.5 pl-12 pr-12 text-base text-[color:var(--color-text-primary)] transition-colors placeholder:text-[color:var(--color-text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] sm:text-lg"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[color:var(--color-text-tertiary)] transition-colors hover:text-[color:var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : standalone ? (
        <kbd
          aria-hidden
          className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-lg border border-[color:var(--color-border-secondary)] px-1.5 text-xs text-[color:var(--color-text-tertiary)] sm:block"
        >
          /
        </kbd>
      ) : null}
      <div
        id={listId}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- combobox listbox pattern; a native <datalist> cannot show hints or follow aria-activedescendant
        // eslint-disable-next-line react-doctor/prefer-tag-over-role -- combobox listbox pattern; a native <datalist> cannot show hints or follow aria-activedescendant
        role="listbox"
        aria-label="Suggestions"
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-surface)] py-1 shadow-xl"
      >
        {suggestions.map((suggestion, index) => (
          // The keyboard lives on the combobox input (aria-activedescendant),
          // as the ARIA combobox pattern prescribes; options take pointer input.
          // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled on the combobox input
          <div
            key={`${suggestion.hint}:${suggestion.query}`}
            id={optionId(index)}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- combobox option pattern; native <option> cannot host the hint markup
            // eslint-disable-next-line react-doctor/prefer-tag-over-role -- combobox option pattern; native <option> cannot host the hint markup
            role="option"
            // Options are reached through the input, never tabbed to.
            tabIndex={-1}
            aria-selected={index === activeIndex}
            // Keep focus in the box: the click picks, the blur would close first.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => pick(suggestion)}
            onMouseMove={() => setActive(index)}
            className={cn(
              'flex cursor-pointer items-center justify-between gap-3 px-4 py-2 text-sm text-[color:var(--color-text-primary)]',
              index === activeIndex &&
                'bg-[color:var(--color-hover-surface)] text-[color:var(--color-on-hover-surface)]'
            )}
          >
            <span className="min-w-0 truncate">{suggestion.label}</span>
            <span
              className={cn(
                'shrink-0 text-xs',
                index === activeIndex
                  ? 'text-[color:var(--color-on-hover-surface)]'
                  : 'text-[color:var(--color-text-tertiary)]'
              )}
            >
              {HINT_LABELS[suggestion.hint]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
