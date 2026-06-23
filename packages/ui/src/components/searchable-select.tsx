import type { SelectItem } from '@dorkroom/logic';
import { ChevronDown, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../lib/cn';

interface SearchableSelectProps {
  label?: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: SelectItem[];
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Find the selected item to display its label
  const selectedItem = items.find((item) => item.value === selectedValue);
  const displayValue = selectedItem?.label || '';

  // Filter items based on search term
  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    setSearchTerm('');
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  // Handle clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange('');
    setSearchTerm('');
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  // Handle input focus
  const handleInputFocus = () => {
    openAndFocusSelected();
  };

  // Handle input blur
  const handleInputBlur = () => {
    // Delay closing to allow for item selection
    setTimeout(() => {
      setIsOpen(false);
      setSearchTerm('');
      setFocusedIndex(-1);
    }, 150);
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
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        inputRef.current?.blur();
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
      focusedElement.scrollIntoView({ block: 'start' });
    }
  }, [focusedIndex]);

  return (
    <div className={cn('relative space-y-2', className)}>
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
          value={isOpen ? searchTerm : displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={(_e) => {
            setFocused(true);
            handleInputFocus();
          }}
          onBlur={(_e) => {
            setFocused(false);
            handleInputBlur();
          }}
          onKeyDown={handleKeyDown}
          placeholder={selectedValue ? displayValue : placeholder}
          aria-label={label ?? placeholder}
          className="w-full rounded-lg border px-3 py-2 pr-16 focus:outline-none focus:ring-2"
          style={
            {
              borderColor: focused
                ? 'var(--color-border-primary)'
                : 'var(--color-border-secondary)',
              backgroundColor: 'var(--color-surface-muted)',
              color: 'var(--color-text-primary)',
              '--tw-ring-color': 'var(--color-border-primary)',
            } as React.CSSProperties
          }
        />

        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {selectedValue && allowClear && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear selection"
              className="flex size-4 items-center justify-center transition"
              style={{
                color: 'var(--color-text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
            >
              <X className="size-3" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'size-4 transition-transform',
              isOpen && 'rotate-180'
            )}
            style={{ color: 'var(--color-text-muted)' }}
          />
        </div>

        {isOpen && (
          <div
            ref={listRef}
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
            {filteredItems.length === 0 ? (
              <div
                className="px-3 py-2 text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                No results found
              </div>
            ) : (
              filteredItems.map((item, index) => (
                <div
                  key={item.value}
                  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- combobox option pattern; native <option> cannot host custom filtered markup
                  // eslint-disable-next-line react-doctor/prefer-tag-over-role -- combobox option pattern; native <option> cannot host custom filtered markup
                  role="option"
                  aria-selected={item.value === selectedValue}
                  onClick={() => handleSelectItem(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectItem(item);
                    }
                  }}
                  tabIndex={index === focusedIndex ? 0 : -1}
                  className="cursor-pointer px-3 py-2 text-sm transition-colors"
                  style={{
                    color:
                      item.value === selectedValue
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-secondary)',
                    backgroundColor:
                      index === focusedIndex || item.value === selectedValue
                        ? 'var(--color-border-muted)'
                        : 'transparent',
                    fontWeight: item.value === selectedValue ? '500' : 'normal',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'var(--color-border-muted)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      item.value === selectedValue
                        ? 'var(--color-border-muted)'
                        : 'transparent';
                  }}
                >
                  {item.label}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
