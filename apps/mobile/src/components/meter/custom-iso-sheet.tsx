import { parseDecimalInput } from '@dorkroom/logic';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { CommitButton } from '@/components/commit-button';
import { LabeledTextField } from '@/components/labeled-text-field';
import {
  SafelightOverlay,
  SafelightRoot,
} from '@/components/safelight/safelight-overlay';
import { useSafelight } from '@/components/safelight/safelight-provider';

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
  const { on: safelight } = useSafelight();
  const submit = () => {
    const value = parseDecimalInput(text);
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
      <SafelightRoot overlay={false}>
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
              // The overlay needs the card clipped and isolated; normal mode is as before.
              style={
                safelight
                  ? { isolation: 'isolate', overflow: 'hidden' }
                  : undefined
              }
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
                  className="flex-1 items-center rounded-xl border-hw border-line bg-surface px-4 py-3"
                >
                  <Text className="text-base font-semibold text-ink-80">
                    Cancel
                  </Text>
                </Pressable>
                <CommitButton
                  onPress={submit}
                  label="Set ISO"
                  className="flex-1"
                />
              </View>
              {/* The dialog window is transparent, so the overlay lives on the card. */}
              <SafelightOverlay />
            </Animated.View>
          </View>
        </Pressable>
      </SafelightRoot>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(0,0,0,0.6)' },
});
