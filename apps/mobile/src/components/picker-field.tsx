import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  OptionPickerSheet,
  type PickerOption,
} from '@/components/development/option-picker-sheet';

interface PickerFieldProps<T extends string | number> {
  /** Field name, shown above the trigger and used as the sheet title. */
  label: string;
  options: PickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Show a search field in the sheet (for long lists). */
  searchable?: boolean;
  className?: string;
}

/**
 * A labelled trigger that opens an `OptionPickerSheet` to pick one option.
 * The sheet closes on selection; the trigger shows the selected label and
 * its sublabel, and VoiceOver reads "<label>: <selected>".
 */
export function PickerField<T extends string | number>({
  label,
  options,
  value,
  onChange,
  searchable = false,
  className,
}: PickerFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const close = useCallback(() => setOpen(false), []);
  const handleChange = useCallback(
    (next: T) => {
      onChange(next);
      setOpen(false);
    },
    [onChange]
  );

  return (
    <View className={`gap-1 ${className ?? ''}`}>
      <Text className="text-sm text-white/60">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? 'Select'}`}
        accessibilityHint="Opens a list to choose from"
        className="min-h-11 flex-row items-center justify-between gap-3 rounded-xl bg-white/10 px-4 py-3"
      >
        <View className="flex-1">
          <Text className="text-base text-white" numberOfLines={1}>
            {selected?.label ?? 'Select'}
          </Text>
          {selected?.sublabel ? (
            <Text className="text-sm text-white/50" numberOfLines={1}>
              {selected.sublabel}
            </Text>
          ) : null}
        </View>
        <Text className="text-white/70">▾</Text>
      </Pressable>
      <OptionPickerSheet
        visible={open}
        title={label}
        options={options}
        value={value}
        onChange={handleChange}
        onClose={close}
        searchable={searchable}
      />
    </View>
  );
}
