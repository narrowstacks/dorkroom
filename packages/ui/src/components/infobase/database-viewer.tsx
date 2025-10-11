import { useState, useMemo, useEffect } from 'react';
import { DatabaseList, DatabaseItem } from './database-list';
import { DatabaseDetail } from './database-detail';
import { SearchBar } from './search-bar';
import { cn } from '../../lib/cn';

interface DetailField {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}

interface DatabaseViewerProps<T extends DatabaseItem> {
  items: T[];
  getDetailFields: (item: T) => DetailField[];
  getItemSubtitle?: (item: T) => string;
  searchFilter: (item: T, query: string) => boolean;
  emptyMessage?: string;
  emptyDetailMessage?: string;
  className?: string;
  searchPlaceholder?: string;
  mobileSearchPrompt?: string;
}

export function DatabaseViewer<T extends DatabaseItem>({
  items,
  getDetailFields,
  getItemSubtitle,
  searchFilter,
  emptyMessage = 'No items found',
  emptyDetailMessage = 'Select an item to view details',
  className,
  searchPlaceholder = 'Search...',
  mobileSearchPrompt = 'Start typing to search the database',
}: DatabaseViewerProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for Safari
      mediaQuery.addListener(handleChange);
    }

    // Ensure state matches current viewport on mount
    setIsDesktop(mediaQuery.matches);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    return items.filter((item) => searchFilter(item, searchQuery));
  }, [items, searchQuery, searchFilter]);

  // Update selected item if it's not in filtered results
  // This useEffect synchronizes the selected item state with filtered results
  useEffect(() => {
    const selectedExists =
      selectedItem && filteredItems.some((item) => item.id === selectedItem.id);

    if (selectedItem && !selectedExists) {
      setSelectedItem(
        isDesktop && filteredItems.length > 0 ? filteredItems[0] : null
      );
      return;
    }

    if (isDesktop && !selectedItem && filteredItems.length > 0) {
      setSelectedItem(filteredItems[0]);
    }
  }, [filteredItems, selectedItem, isDesktop]);

  useEffect(() => {
    if (isDesktop && items.length > 0 && !selectedItem) {
      setSelectedItem(items[0]);
    }
  }, [isDesktop, items, selectedItem]);

  // Add subtitles to items for display
  const itemsWithSubtitles = useMemo(
    () =>
      filteredItems.map((item) => ({
        ...item,
        subtitle: getItemSubtitle?.(item),
      })),
    [filteredItems, getItemSubtitle]
  );

  if (!isDesktop) {
    return (
      <div className={className}>
        <div className="flex flex-col gap-4">
          <div>
            <SearchBar
              onSearch={setSearchQuery}
              placeholder={searchPlaceholder}
            />
            <div
              className="mt-3 rounded-lg border"
              style={{
                borderColor: 'var(--color-border-secondary)',
                backgroundColor: 'rgba(var(--color-background-rgb), 0.65)',
              }}
            >
              {searchQuery.trim().length === 0 ? (
                <div
                  className="px-3 py-6 text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {mobileSearchPrompt}
                </div>
              ) : itemsWithSubtitles.length === 0 ? (
                <div
                  className="px-3 py-6 text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {emptyMessage}
                </div>
              ) : (
                <ul className="max-h-64 overflow-y-auto py-1">
                  {itemsWithSubtitles.map((item) => {
                    const isSelected = selectedItem?.id === item.id;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className={cn(
                            'w-full rounded-lg px-3 py-2 text-left text-sm transition',
                            isSelected
                              ? 'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)]'
                              : 'hover:bg-[color:var(--color-surface)]'
                          )}
                        >
                          <span className="block font-medium">{item.name}</span>
                          {item.subtitle && (
                            <span
                              className="mt-0.5 block text-xs"
                              style={
                                isSelected
                                  ? {
                                      color: 'var(--color-background)',
                                      opacity: 0.85,
                                    }
                                  : { color: 'var(--color-text-secondary)' }
                              }
                            >
                              {item.subtitle}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ minHeight: '60vh' }}>
            {selectedItem ? (
              <div className="pb-12">
                <DatabaseDetail
                  title={selectedItem.name}
                  subtitle={getItemSubtitle?.(selectedItem)}
                  fields={getDetailFields(selectedItem)}
                />
              </div>
            ) : (
              <div
                className="flex h-full items-center justify-center px-6 text-center"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <p>{emptyDetailMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="h-[calc(100vh-12rem)] overflow-hidden">
          <DatabaseList
            items={itemsWithSubtitles}
            selectedId={selectedItem?.id ?? null}
            onSelect={setSelectedItem}
            onSearchChange={setSearchQuery}
            emptyMessage={emptyMessage}
            searchPlaceholder={searchPlaceholder}
          />
        </div>

        <div className="h-[calc(100vh-12rem)] overflow-y-auto">
          {selectedItem ? (
            <DatabaseDetail
              title={selectedItem.name}
              subtitle={getItemSubtitle?.(selectedItem)}
              fields={getDetailFields(selectedItem)}
            />
          ) : (
            <div
              className="flex h-full items-center justify-center text-center"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <p>{emptyDetailMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { DetailField };
