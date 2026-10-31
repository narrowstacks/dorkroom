import { Search, X } from 'lucide-react';
import { type KeyboardEvent, type RefObject, useEffect, useId } from 'react';

/** True when a key press lands in something the user is typing into. */
function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

interface SearchComboboxProps {
  /** The text box, so the page can return focus to it. */
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
  /** First interest in searching (focus, pointer, key), to start loading data. */
  onIntent: () => void;
  /** The id of the results listbox the box controls. */
  listId: string;
  /** The element ids of the options, in arrow-key order; empty for none. */
  options: readonly string[];
  /** The option Enter opens. */
  activeId: string | null;
  onActiveChange: (id: string) => void;
  /** The box gained or lost focus. */
  onFocusedChange: (focused: boolean) => void;
  placeholder: string;
}

/**
 * The home search box: a WAI-ARIA 1.2 combobox whose popup is the results
 * on the page itself (the answer's link, suggestions, matches), never a list
 * over them. Arrow keys move the active option (focus stays in the box),
 * Enter opens it (a suggestion fills the box), Escape clears the box. "/"
 * anywhere on the page focuses it.
 */
export function SearchCombobox({
  inputRef,
  value,
  onChange,
  onIntent,
  listId,
  options,
  activeId,
  onActiveChange,
  onFocusedChange,
  placeholder,
}: SearchComboboxProps) {
  const inputId = useId();

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        event.key !== '/' ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTypingTarget(event.target)
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [inputRef]);

  // `activeId` is always one of `options` while there are any.
  const move = (step: 1 | -1) => {
    onIntent();
    if (options.length === 0) return;
    const index = options.indexOf(activeId ?? '');
    onActiveChange(options[(index + step + options.length) % options.length]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // A key that confirms an IME composition is the input method's, not ours.
    if (event.nativeEvent.isComposing) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        move(-1);
        break;
      case 'Enter':
        if (activeId) {
          event.preventDefault();
          // Each option acts on a click: a link navigates, a suggestion fills.
          document.getElementById(activeId)?.click();
        }
        break;
      case 'Escape':
        if (value) {
          event.preventDefault();
          onChange('');
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative">
      <label htmlFor={inputId} className="sr-only">
        Search recipes, films and calculators
      </label>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[color:var(--color-text-tertiary)]"
      />
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId ?? undefined}
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
        }}
        onFocus={() => {
          onIntent();
          onFocusedChange(true);
        }}
        onBlur={() => onFocusedChange(false)}
        onPointerEnter={onIntent}
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
      ) : (
        <kbd
          aria-hidden
          className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-lg border border-[color:var(--color-border-secondary)] px-1.5 text-xs text-[color:var(--color-text-tertiary)] sm:block"
        >
          /
        </kbd>
      )}
    </div>
  );
}
