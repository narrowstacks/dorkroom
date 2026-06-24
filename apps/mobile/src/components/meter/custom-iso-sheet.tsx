import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { LabeledTextField } from '@/components/labeled-text-field';

interface CustomIsoSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (iso: number) => void;
}

/** Numeric input for an off-list ISO/EI (e.g. 8), reached from the wheel's "Custom". */
export function CustomIsoSheet({
  visible,
  onClose,
  onSubmit,
}: CustomIsoSheetProps) {
  const [text, setText] = useState('');
  const submit = () => {
    const value = Number(text);
    if (!Number.isFinite(value) || value <= 0) return;
    onSubmit(value);
    onClose();
  };
  return (
    <BottomSheet visible={visible} title="Custom ISO" onClose={onClose}>
      <View className="gap-4">
        <LabeledTextField
          label="ISO / EI"
          value={text}
          onChangeText={setText}
          keyboardType="numeric"
          placeholder="e.g. 8"
        />
        <Pressable
          onPress={submit}
          accessibilityRole="button"
          className="items-center rounded-xl bg-rose-600 px-4 py-3"
        >
          <Text className="text-base font-semibold text-white">Set ISO</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
