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

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[
        focusedIndex
      ] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  return (
    <div className={cn('relative space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-white/90">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={selectedValue ? displayValue : placeholder}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 pr-16 text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
        />

        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {selectedValue && allowClear && (
            <button
              type="button"
              onClick={handleClear}
              className="flex h-4 w-4 items-center justify-center text-white/50 hover:text-white/80"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-white/50 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>

        {isOpen && (
          <ul
            ref={listRef}
            className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-white/20 bg-black/90 backdrop-blur-sm"
          >
            {filteredItems.length === 0 ? (
              <li className="px-3 py-2 text-sm text-white/50">
                No results found
              </li>
            ) : (
              filteredItems.map((item, index) => (
                <li
                  key={item.value}
                  onClick={() => handleSelectItem(item)}
                  className={cn(
                    'cursor-pointer px-3 py-2 text-sm text-white transition-colors hover:bg-white/10',
                    index === focusedIndex && 'bg-white/10',
                    item.value === selectedValue &&
                      'bg-white/20 text-white font-medium'
                  )}
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
