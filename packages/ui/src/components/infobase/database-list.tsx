import { cn } from '../../lib/cn';
import { SearchBar } from './search-bar';

export interface DatabaseItem {
  id: number | string;
  name: string;
  subtitle?: string;
}

interface DatabaseListProps<T extends DatabaseItem> {
  items: T[];
  selectedId: number | string | null;
  onSelect: (item: T) => void;
  onSearchChange: (query: string) => void;
  renderItem?: (item: T) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export function DatabaseList<T extends DatabaseItem>({
  items,
  selectedId,
  onSelect,
  onSearchChange,
  renderItem,
  emptyMessage = 'No items found',
  className,
}: DatabaseListProps<T>) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="mb-4">
        <SearchBar onSearch={onSearchChange} placeholder="Search..." />
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {items.length === 0 ? (
          <div
            className="py-8 text-center text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {emptyMessage}
          </div>
        ) : (
          items.map((item) => {
            const isSelected = item.id === selectedId;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                  'w-full rounded-lg px-3 py-2.5 text-left text-sm transition',
                  isSelected
                    ? 'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)]'
                    : 'hover:bg-[color:var(--color-surface)]'
                )}
                style={{
                  color: isSelected
                    ? 'var(--color-background)'
                    : 'var(--color-text-primary)',
                  backgroundColor: isSelected
                    ? 'var(--color-text-primary)'
                    : undefined,
                }}
              >
                {renderItem ? (
                  renderItem(item)
                ) : (
                  <div>
                    <div className="font-medium">{item.name}</div>
                    {item.subtitle && (
                      <div
                        className="mt-0.5 text-xs"
                        style={
                          isSelected
                            ? {
                                color: 'var(--color-background)',
                                opacity: 0.8,
                              }
                            : { color: 'var(--color-text-secondary)' }
                        }
                      >
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
