import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { LabeledTextField } from '@/components/labeled-text-field';

interface CustomIsoSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (iso: number) => void;
}

/**
 * Centered alert-style pop-up for an off-list ISO/EI (e.g. 8), reached from the
 * wheel's "Custom". The input auto-focuses so the keyboard rises immediately;
 * tapping the scrim or Cancel dismisses, return/Set ISO commits.
 */
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
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(160)}
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.scrim]}
      />
      <Pressable
        className="flex-1 items-center justify-center px-6"
        onPress={onClose}
        accessibilityRole="button"
      >
        {/* Claim the responder so taps inside the card don't dismiss it. */}
        <View
          onStartShouldSetResponder={() => true}
          className="w-full max-w-[340px]"
        >
          <Animated.View
            entering={ZoomIn.duration(160)}
            className="gap-4 rounded-2xl bg-[#161618] p-5"
          >
            <Text className="text-center text-lg font-semibold text-white">
              Custom ISO
            </Text>
            <LabeledTextField
              label="ISO / EI"
              value={text}
              onChangeText={setText}
              keyboardType="numeric"
              placeholder="e.g. 8"
              // eslint-disable-next-line jsx-a11y/no-autofocus -- intentional: this pop-up exists only to capture an ISO value, so the keyboard should rise immediately
              autoFocus
              onSubmitEditing={submit}
            />
            <View className="flex-row gap-3">
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                className="flex-1 items-center rounded-xl bg-white/10 px-4 py-3"
              >
                <Text className="text-base font-semibold text-white/80">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={submit}
                accessibilityRole="button"
                className="flex-1 items-center rounded-xl bg-rose-600 px-4 py-3"
              >
                <Text className="text-base font-semibold text-white">
                  Set ISO
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(0,0,0,0.6)' },
});
