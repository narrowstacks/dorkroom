import { Check } from 'lucide-react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  type ListRenderItem,
  Pressable,
  Text,
  View,
} from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { SearchBar } from './search-bar';

export interface PickerOption<T extends string | number> {
  label: string;
  value: T;
  sublabel?: string;
}

interface OptionPickerSheetProps<T extends string | number> {
  visible: boolean;
  title: string;
  options: PickerOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  onClose: () => void;
  /** Show a search field above the list (for long film/developer lists). */
  searchable?: boolean;
  searchPlaceholder?: string;
}

interface PickerRowProps<T extends string | number> {
  option: PickerOption<T>;
  selected: boolean;
  onSelect: (value: T) => void;
}

// Hoisted constants so no new objects are created per row render.
const SELECTED_STATE = {
  on: { selected: true },
  off: { selected: false },
} as const;

// Memoized so each row only re-renders when its own props change, and its
// onPress is stable per row (avoids per-row closures in the list callback).
const PickerRowInner = <T extends string | number>({
  option,
  selected,
  onSelect,
}: PickerRowProps<T>) => {
  const onPress = useCallback(
    () => onSelect(option.value),
    [onSelect, option.value]
  );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={SELECTED_STATE[selected ? 'on' : 'off']}
      className="flex-row items-center justify-between gap-3 py-3 active:opacity-60"
    >
      <View className="flex-1">
        <Text className="text-base text-white" numberOfLines={1}>
          {option.label}
        </Text>
        {option.sublabel ? (
          <Text className="text-sm text-white/50" numberOfLines={1}>
            {option.sublabel}
          </Text>
        ) : null}
      </View>
      {selected ? <Check size={18} color="#f43f5e" /> : null}
    </Pressable>
  );
};
const PickerRow = memo(PickerRowInner) as typeof PickerRowInner;

/**
 * A single-select list presented in a BottomSheet, optionally searchable.
 * The web equivalent is SearchableSelect — used for the film / developer pickers.
 */
export function OptionPickerSheet<T extends string | number>({
  visible,
  title,
  options,
  value,
  onChange,
  onClose,
  searchable = false,
  searchPlaceholder = 'Search',
}: OptionPickerSheetProps<T>) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchable || query.trim() === '') return options;
    const q = query.trim().toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.sublabel?.toLowerCase().includes(q)
    );
  }, [options, query, searchable]);

  const keyExtractor = useCallback(
    (item: PickerOption<T>) => String(item.value),
    []
  );

  const renderItem = useCallback<ListRenderItem<PickerOption<T>>>(
    ({ item }) => (
      <PickerRow
        option={item}
        selected={item.value === value}
        onSelect={onChange}
      />
    ),
    [value, onChange]
  );

  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      {searchable ? (
        <View className="mb-3">
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
          />
        </View>
      ) : null}
      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        style={LIST_STYLE}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={EmptyState}
        renderItem={renderItem}
      />
    </BottomSheet>
  );
}

const LIST_STYLE = { maxHeight: 360 } as const;

function ItemSeparator() {
  return <View className="h-px bg-white/10" />;
}

function EmptyState() {
  return <Text className="py-6 text-center text-white/50">No matches</Text>;
}
