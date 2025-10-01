import { useState, useMemo, useEffect } from 'react';
import { DatabaseList, DatabaseItem } from './database-list';
import { DatabaseDetail } from './database-detail';

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
}

export function DatabaseViewer<T extends DatabaseItem>({
  items,
  getDetailFields,
  getItemSubtitle,
  searchFilter,
  emptyMessage = 'No items found',
  emptyDetailMessage = 'Select an item to view details',
  className,
}: DatabaseViewerProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<T | null>(
    items.length > 0 ? items[0] : null
  );

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    return items.filter((item) => searchFilter(item, searchQuery));
  }, [items, searchQuery, searchFilter]);

  // Update selected item if it's not in filtered results
  // This useEffect synchronizes the selected item state with filtered results
  useEffect(() => {
    if (
      selectedItem &&
      !filteredItems.find((item) => item.id === selectedItem.id)
    ) {
      setSelectedItem(filteredItems.length > 0 ? filteredItems[0] : null);
    } else if (!selectedItem && filteredItems.length > 0) {
      setSelectedItem(filteredItems[0]);
    }
  }, [filteredItems, selectedItem]);

  // Add subtitles to items for display
  const itemsWithSubtitles = useMemo(
    () =>
      filteredItems.map((item) => ({
        ...item,
        subtitle: getItemSubtitle?.(item),
      })),
    [filteredItems, getItemSubtitle]
  );

  return (
    <div className={className}>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left Pane - List */}
        <div className="h-[calc(100vh-12rem)] overflow-hidden">
          <DatabaseList
            items={itemsWithSubtitles}
            selectedId={selectedItem?.id ?? null}
            onSelect={setSelectedItem}
            onSearchChange={setSearchQuery}
            emptyMessage={emptyMessage}
          />
        </div>

        {/* Right Pane - Detail */}
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
