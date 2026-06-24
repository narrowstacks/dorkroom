import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';

export interface SelectOption<T extends string | number> {
  label: string;
  value: T;
  /** Optional secondary line shown under the label (e.g. ISO / format). */
  detail?: string;
}

interface SelectFieldProps<T extends string | number> {
  label: string;
  value: T | undefined;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
}

/** A labelled row that opens a bottom-sheet list to pick one option. */
export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className="gap-1">
      <Text className="text-sm text-white/60">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        className="flex-row items-center justify-between rounded-xl bg-white/10 px-4 py-3"
      >
        <Text
          className={
            selected ? 'text-base text-white' : 'text-base text-white/40'
          }
        >
          {selected?.label ?? placeholder}
        </Text>
        <Text className="text-white/40">▾</Text>
      </Pressable>

      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
        <ScrollView style={{ maxHeight: 360 }}>
          <View className="gap-1">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <Pressable
                  key={String(option.value)}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  className={`rounded-xl px-4 py-3 ${isSelected ? 'bg-rose-600' : 'bg-white/5'}`}
                >
                  <Text className="text-base text-white">{option.label}</Text>
                  {option.detail ? (
                    <Text className="text-sm text-white/50">
                      {option.detail}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
            {options.length === 0 ? (
              <Text className="px-1 py-3 text-white/50">
                Nothing to choose yet.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}
