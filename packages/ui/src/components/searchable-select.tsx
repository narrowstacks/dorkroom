import type { SelectItem } from '@dorkroom/logic';
import { Check, ChevronDown, X } from 'lucide-react';
import { type RefObject, useEffect, useId, useRef, useState } from 'react';
import { useSwallowOutsideClick } from '../hooks/use-swallow-outside-click';
import { cn } from '../lib/cn';
import { cssVars } from '../lib/dom';

/**
 * Set on <html> while any list is open. The app's floating phone buttons key
 * off it (mobile-fab.ts hardcodes the same string) to step aside, because the list is not portalled and its lowest rows
 * can otherwise only be scrolled to the spot under those buttons (#629).
 */
const LISTBOX_OPEN_ATTRIBUTE = 'data-listbox-open';

let openListCount = 0;

interface SearchableSelectProps {
  label?: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: SelectItem[];
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
}

interface SearchableSelectOptionProps {
  id: string;
  item: SelectItem;
  isFocused: boolean;
  isSelected: boolean;
  /** Called with the pointer type of the press that led to the click ('' if none). */
  onSelect: (pointerType: string) => void;
  lastPointerType: React.RefObject<string>;
}

function SearchableSelectOption({
  id,
  item,
  isFocused,
  isSelected,
  onSelect,
  lastPointerType,
}: SearchableSelectOptionProps) {
  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- keyboard selection happens on the combobox input (Enter)
    <div
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- combobox option pattern; native <option> cannot host custom filtered markup
      // eslint-disable-next-line react-doctor/prefer-tag-over-role -- combobox option pattern; native <option> cannot host custom filtered markup
      role="option"
      id={id}
      aria-selected={isSelected}
      onClick={() => {
        const pointerType = lastPointerType.current;
        lastPointerType.current = '';
        onSelect(pointerType);
      }}
      // Options are driven by the input via aria-activedescendant, never
      // focused, so there is no key handler to add.
      tabIndex={-1}
      className={cn(
        'flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm transition-colors',
        // Hover, focus and selection share one surface pair. The monochrome
        // themes collapse the border and text tokens to one value (darkroom:
        // surface and hover-surface are both black), so colour alone can't
        // mark a row. Focus is an inset ring and selection is a check icon,
        // both drawn from theme tokens (guarded by hover-contrast.test.ts).
        isFocused || isSelected
          ? 'bg-hover-surface text-on-hover-surface'
          : 'text-secondary hover:bg-hover-surface hover:text-on-hover-surface',
        isFocused && 'shadow-[inset_0_0_0_2px_var(--color-on-hover-surface)]',
        isSelected ? 'font-medium' : 'font-normal'
      )}
    >
      <span>{item.label}</span>
      {isSelected && <Check className="size-4 shrink-0" aria-hidden="true" />}
    </div>
  );
}

/**
 * Closes the list when the input loses focus. Moving focus to any element
 * other than the listbox (Tab, Shift+Tab, including the Clear button) closes at
 * once, so the list does not linger and stack over the next field's (#635). A
 * blur with no destination (touch, Safari and assistive tech pressing an
 * option; a mouse press never blurs, the listbox cancels mousedown) or one
 * inside the listbox closes after 150 ms, so the option click registers first.
 * Refocusing cancels a pending close.
 */
function useBlurClose(
  listRef: RefObject<HTMLElement | null>,
  close: () => void
) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const cancelPendingClose = () => clearTimeout(timer.current);
  const handleInputBlur = (e: React.FocusEvent) => {
    clearTimeout(timer.current);
    const next = e.relatedTarget;
    if (next instanceof Node && !listRef.current?.contains(next)) {
      close();
      return;
    }
    timer.current = setTimeout(close, 150);
  };
  return { cancelPendingClose, handleInputBlur };
}

/**
 * Clearing unmounts the Clear button, which would drop focus to <body> (#639).
 * `refocusInput` hands it back to the input without opening the list (focus
 * normally opens it; `suppressOpenOnFocus` is the one-shot opt-out). Touch and
 * pen skip it: focusing a text input from a tap raises the on-screen keyboard,
 * which a tap on an X should not do.
 */
function useClearRefocus(inputRef: RefObject<HTMLInputElement | null>) {
  const suppressOpenOnFocus = useRef(false);
  const refocusInput = (pointerType: string) => {
    if (pointerType === 'touch' || pointerType === 'pen') return;
    suppressOpenOnFocus.current = true;
    inputRef.current?.focus();
    // focus() dispatches synchronously; if the input was already focused it
    // dispatches nothing, so never leave the flag armed.
    suppressOpenOnFocus.current = false;
  };
  return { refocusInput, suppressOpenOnFocus };
}

/**
 * The X that empties the field. Reports the type of the press that led to the
 * click ('' for keyboard activation, which has no press).
 */
function ClearButton({ onClear }: { onClear: (pointerType: string) => void }) {
  const pointerType = useRef('');
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        pointerType.current = e.pointerType;
      }}
      onClick={(e) => {
        e.stopPropagation();
        const type = pointerType.current;
        pointerType.current = '';
        onClear(type);
      }}
      aria-label="Clear selection"
      className="flex size-4 items-center justify-center text-muted transition hover:text-secondary"
    >
      <X className="size-3" />
    </button>
  );
}

export function SearchableSelect({
  label,
  selectedValue,
  onValueChange,
  items,
  placeholder = 'Search...',
  className,
  allowClear = true,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const id = useId();
  const listboxId = `${id}-listbox`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastPointerType = useRef('');
  const rootRef = useRef<HTMLDivElement>(null);

  // Find the selected item to display its label
  const selectedItem = items.find((item) => item.value === selectedValue);
  const displayValue = selectedItem?.label || '';

  // Filter items based on search term
  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isListShown = isOpen && filteredItems.length > 0;
  useEffect(() => {
    if (!isListShown) return;
    const root = document.documentElement;
    openListCount += 1;
    root.setAttribute(LISTBOX_OPEN_ATTRIBUTE, '');
    return () => {
      openListCount -= 1;
      if (openListCount === 0) root.removeAttribute(LISTBOX_OPEN_ATTRIBUTE);
    };
  }, [isListShown]);

  const closeList = () => {
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const { refocusInput, suppressOpenOnFocus } = useClearRefocus(inputRef);

  const { cancelPendingClose, handleInputBlur } = useBlurClose(
    listRef,
    closeList
  );

  // Close on a touch or pen press outside without waiting for the platform to
  // blur the input (iOS Safari sometimes doesn't); blurring also dismisses the
  // keyboard. Pressing another field still focuses it afterwards.
  useSwallowOutsideClick(rootRef, isOpen, () => {
    inputRef.current?.blur();
    closeList();
  });

  // Open the dropdown with a cleared search term and focus the selected item.
  // Opening always clears the search term, so the relevant list is the full
  // `items` array — compute the focus index against it directly.
  const openAndFocusSelected = () => {
    setIsOpen(true);
    setSearchTerm('');
    const selectedIndex = selectedValue
      ? items.findIndex((item) => item.value === selectedValue)
      : -1;
    setFocusedIndex(selectedIndex);
  };

  // Handle input change
  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    setIsOpen(true);
    setFocusedIndex(-1);
  };

  // Handle item selection
  const handleSelectItem = (item: SelectItem) => {
    onValueChange(item.value);
    closeList();
  };

  // Handle clear selection
  const handleClear = (pointerType: string) => {
    onValueChange('');
    closeList();
    refocusInput(pointerType);
  };

  // Handle input focus
  const handleInputFocus = () => {
    // A close scheduled by an earlier blur must not shut the list just reopened.
    cancelPendingClose();
    if (suppressOpenOnFocus.current) return;
    openAndFocusSelected();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        openAndFocusSelected();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && filteredItems[focusedIndex]) {
          handleSelectItem(filteredItems[focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeList();
        break;
    }
  };

  // Scroll focused item into view. This must stay in an effect rather than the
  // `focusedIndex` is also set by `openAndFocusSelected` in the same render
  // that mounts the listbox (it only renders when `isOpen`), so the target
  // child does not exist in the DOM until after that render commits — the
  // scroll-into-view must run in an effect, not the keydown handler.
  useEffect(() => {
    const focusedElement = listRef.current?.children[focusedIndex];
    // eslint-disable-next-line react-doctor/no-event-handler -- the focused option element only exists after the listbox mounts (post-commit), so scrollIntoView can't run in the keydown handler that sets focusedIndex
    if (focusedIndex >= 0 && focusedElement instanceof HTMLElement) {
      focusedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  return (
    <div ref={rootRef} className={cn('relative space-y-2', className)}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="text"
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- WAI-ARIA combobox pattern: a filterable text input that owns a listbox; <datalist> cannot style or announce options
          // eslint-disable-next-line react-doctor/prefer-tag-over-role -- WAI-ARIA combobox pattern: a filterable text input that owns a listbox; <datalist> cannot style or announce options
          role="combobox"
          aria-expanded={isOpen && filteredItems.length > 0}
          aria-controls={
            isOpen && filteredItems.length > 0 ? listboxId : undefined
          }
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen && focusedIndex >= 0 && focusedIndex < filteredItems.length
              ? optionId(focusedIndex)
              : undefined
          }
          value={isOpen ? searchTerm : displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={(_e) => {
            setFocused(true);
            handleInputFocus();
          }}
          onBlur={(e) => {
            setFocused(false);
            handleInputBlur(e);
          }}
          onKeyDown={handleKeyDown}
          // The input keeps focus after a selection, so a click on it has to
          // reopen the list; focus alone no longer does.
          onClick={() => {
            if (!isOpen) openAndFocusSelected();
          }}
          placeholder={selectedValue ? displayValue : placeholder}
          aria-label={label ?? placeholder}
          className="w-full rounded-lg border px-3 py-2 pr-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
          style={cssVars({
            borderColor: focused
              ? 'var(--color-border-primary)'
              : 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-surface-muted)',
            color: 'var(--color-text-primary)',
          })}
        />

        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {selectedValue && allowClear && <ClearButton onClear={handleClear} />}
          <ChevronDown
            className={cn(
              'size-4 transition-transform',
              isOpen && 'rotate-180'
            )}
            style={{ color: 'var(--color-text-muted)' }}
          />
        </div>

        {/* Always mounted so the text change is announced; a live region
            inserted together with its content is often skipped. */}
        <output aria-live="polite" aria-atomic="true" className="sr-only">
          {isOpen && filteredItems.length === 0 ? 'No results found' : ''}
        </output>

        {isOpen && filteredItems.length === 0 && (
          <div
            aria-hidden="true"
            className="absolute left-0 top-full z-[100] mt-1 block w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm"
            style={{
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-muted)',
            }}
          >
            No results found
          </div>
        )}

        {isOpen && filteredItems.length > 0 && (
          <div
            ref={listRef}
            id={listboxId}
            // Not a tab stop; oxlint requires a focusable listbox role.
            tabIndex={-1}
            // Keep DOM focus on the input while the pointer is on the list
            // (scrollbar drags, option clicks); the options are never focused.
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              lastPointerType.current = e.pointerType;
            }}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- combobox listbox pattern; a native <select>/<datalist> cannot provide the type-to-filter UX
            // eslint-disable-next-line react-doctor/prefer-tag-over-role -- combobox listbox pattern; <datalist> cannot provide the type-to-filter UX or custom option markup
            role="listbox"
            aria-label={label ?? placeholder}
            className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-lg border backdrop-blur-sm"
            style={{
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            {filteredItems.map((item, index) => (
              <SearchableSelectOption
                key={item.value}
                id={optionId(index)}
                item={item}
                isFocused={index === focusedIndex}
                isSelected={item.value === selectedValue}
                onSelect={(pointerType) => {
                  handleSelectItem(item);
                  // Touch and pen users get the keyboard dismissed after a
                  // pick; mouse and keyboard keep focus on the input (APG).
                  if (pointerType !== '' && pointerType !== 'mouse') {
                    inputRef.current?.blur();
                  }
                }}
                lastPointerType={lastPointerType}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
