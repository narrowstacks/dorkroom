import { useMemo, useState } from 'react';
import {
  Pressable,
  SectionList,
  type SectionListRenderItem,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/bottom-sheet';
import { SearchBar } from '@/components/development/search-bar';
import type { FilmStock } from '@/types/film-log';
import { buildFilmSections, type FilmSection } from './film-stock-picker-logic';

interface FilmStockPickerProps {
  label: string;
  value: string | undefined;
  films: readonly FilmStock[];
  /** Whole stock so the caller can seed process/EI from it. */
  onSelect: (stock: FilmStock) => void;
  placeholder?: string;
}

/**
 * The Film field: same chrome as `SelectField`, but opens a searchable,
 * brand-grouped `SectionList` instead of a flat `ScrollView` — needed once
 * the catalog went from ~30 stubbed stocks to the full live film database.
 */
export function FilmStockPicker({
  label,
  value,
  films,
  onSelect,
  placeholder = 'Select',
}: FilmStockPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const selected = films.find((f) => f.id === value);

  const sections = useMemo(
    () => buildFilmSections(films, query),
    [films, query]
  );

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const renderItem: SectionListRenderItem<FilmStock, FilmSection> = ({
    item,
  }) => {
    const isSelected = item.id === value;
    return (
      <Pressable
        onPress={() => {
          onSelect(item);
          close();
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        className={`rounded-xl px-4 py-3 ${isSelected ? 'bg-rose-600' : 'bg-white/5'}`}
      >
        <Text className="text-base text-white">
          {item.brand} {item.name}
        </Text>
        <Text className="text-sm text-white/50">ISO {item.iso}</Text>
      </Pressable>
    );
  };

  return (
    <View className="gap-1">
      <Text className="text-sm text-white/60">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected ? `${selected.brand} ${selected.name}` : placeholder}`}
        className="flex-row items-center justify-between rounded-xl bg-white/10 px-4 py-3"
      >
        <Text
          className={
            selected ? 'text-base text-white' : 'text-base text-white/40'
          }
        >
          {selected ? `${selected.brand} ${selected.name}` : placeholder}
        </Text>
        <Text className="text-white/70">▾</Text>
      </Pressable>

      <BottomSheet visible={open} title={label} onClose={close}>
        <View className="mb-3">
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search brand or film"
          />
        </View>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 560 }}
          contentContainerStyle={{ gap: 4 }}
          contentInset={{ bottom: insets.bottom }}
          keyboardShouldPersistTaps="handled"
          renderSectionHeader={({ section }) => (
            <Text className="bg-[#161618] px-1 pb-1 pt-3 text-xs uppercase tracking-wide text-white/40">
              {section.title}
            </Text>
          )}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text className="px-1 py-3 text-white/50">
              No films match your search.
            </Text>
          }
        />
      </BottomSheet>
    </View>
  );
}
