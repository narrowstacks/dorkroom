import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '../lib/cn';
import type { SelectItem } from '@dorkroom/logic';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Find the selected item to display its label
  const selectedItem = items.find((item) => item.value === selectedValue);
  const displayValue = selectedItem?.label || '';

  // Filter items based on search term
  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    setIsOpen(true);
    setSearchTerm('');
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
        setIsOpen(true);
        setSearchTerm('');
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

  // Auto-focus selected item when dropdown opens
  useEffect(() => {
    if (isOpen && selectedValue) {
      const selectedIndex = filteredItems.findIndex(
        (item) => item.value === selectedValue
      );
      if (selectedIndex >= 0) {
        setFocusedIndex(selectedIndex);
      } else {
        // Selected item not in filtered results, reset focus
        setFocusedIndex(-1);
      }
    }
  }, [isOpen, filteredItems, selectedValue]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[
        focusedIndex
      ] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'start' });
      }
    }
  }, [focusedIndex]);

  return (
    <div className={cn('relative space-y-2', className)}>
      {label && (
        <label
          className="block text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={(e) => {
            setFocused(true);
            handleInputFocus();
          }}
          onBlur={(e) => {
            setFocused(false);
            handleInputBlur();
          }}
          onKeyDown={handleKeyDown}
          placeholder={selectedValue ? displayValue : placeholder}
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
              className="flex h-4 w-4 items-center justify-center transition"
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
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              isOpen && 'rotate-180'
            )}
            style={{ color: 'var(--color-text-muted)' }}
          />
        </div>

        {isOpen && (
          <ul
            ref={listRef}
            className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-lg border backdrop-blur-sm"
            style={{
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            {filteredItems.length === 0 ? (
              <li
                className="px-3 py-2 text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                No results found
              </li>
            ) : (
              filteredItems.map((item, index) => (
                <li
                  key={item.value}
                  onClick={() => handleSelectItem(item)}
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
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
