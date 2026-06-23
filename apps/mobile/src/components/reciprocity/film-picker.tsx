import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';

interface FilmPickerProps {
  films: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

interface FilmRowProps {
  film: { label: string; value: string };
  isSelected: boolean;
  onSelect: (value: string) => void;
}

const SELECTED_STATE = { selected: true } as const;
const UNSELECTED_STATE = { selected: false } as const;

function FilmRow({ film, isSelected, onSelect }: FilmRowProps) {
  const handlePress = useCallback(
    () => onSelect(film.value),
    [film.value, onSelect]
  );
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={isSelected ? SELECTED_STATE : UNSELECTED_STATE}
      className="flex-row items-center justify-between py-3"
    >
      <Text
        className={isSelected ? 'font-semibold text-rose-400' : 'text-white'}
      >
        {film.label}
      </Text>
      {isSelected ? <Text className="text-rose-400">✓</Text> : null}
    </Pressable>
  );
}

export function FilmPicker({ films, value, onChange }: FilmPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = films.find((f) => f.value === value);

  const handleSelect = useCallback(
    (filmValue: string) => {
      onChange(filmValue);
      setOpen(false);
    },
    [onChange]
  );

  const renderItem = useCallback(
    ({ item: film }: { item: { label: string; value: string } }) => (
      <FilmRow
        film={film}
        isSelected={film.value === value}
        onSelect={handleSelect}
      />
    ),
    [value, handleSelect]
  );

  return (
    <View className="gap-1">
      <Text className="text-sm text-white/60">Film</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        className="flex-row items-center justify-between rounded-xl bg-white/10 px-4 py-3"
      >
        <Text className="text-base text-white">
          {selected?.label ?? 'Select film'}
        </Text>
        <Text className="text-white/50">▾</Text>
      </Pressable>
      <BottomSheet
        visible={open}
        title="Select film"
        onClose={() => setOpen(false)}
      >
        <FlatList
          style={{ maxHeight: 360 }}
          data={films}
          keyExtractor={(film) => film.value}
          renderItem={renderItem}
        />
      </BottomSheet>
    </View>
  );
}
