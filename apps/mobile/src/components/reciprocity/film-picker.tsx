import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';

interface FilmPickerProps {
  films: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function FilmPicker({ films, value, onChange }: FilmPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = films.find((f) => f.value === value);
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
        <ScrollView style={{ maxHeight: 360 }}>
          {films.map((film) => {
            const isSelected = film.value === value;
            return (
              <Pressable
                key={film.value}
                onPress={() => {
                  onChange(film.value);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                className="flex-row items-center justify-between py-3"
              >
                <Text
                  className={
                    isSelected ? 'font-semibold text-rose-400' : 'text-white'
                  }
                >
                  {film.label}
                </Text>
                {isSelected ? <Text className="text-rose-400">✓</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}
