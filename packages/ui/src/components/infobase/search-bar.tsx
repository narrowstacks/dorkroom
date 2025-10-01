import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/cn';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  onSearch,
  placeholder = 'Search...',
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleChange = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
        style={{ color: 'var(--color-text-tertiary)' }}
      />
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-lg py-2 pl-10 pr-10 text-sm transition',
          'focus:outline-none focus:ring-2',
          'placeholder:text-[color:var(--color-text-tertiary)]'
        )}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderWidth: 1,
          borderColor: 'var(--color-border-secondary)',
          color: 'var(--color-text-primary)',
        }}
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition hover:bg-[color:var(--color-surface)]"
          style={{ color: 'var(--color-text-secondary)' }}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
