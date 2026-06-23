import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /**
   * When true (default), a flat dark scrim covers the whole screen behind the
   * sheet. Pass false to keep the page fully visible — e.g. the border
   * calculator, where the print preview should stay unobscured while editing.
   */
  showScrim?: boolean;
}

// Scrim fade and panel slide share this duration so they ramp up in lockstep —
// the scrim never darkens ahead of the panel arriving.
const ENTER_MS = 260;

/**
 * A bottom-anchored sheet on RN Modal. The Modal itself does no animation
 * (`animationType="none"`); the scrim fades and the panel slides via Reanimated
 * on one shared timeline. The scrim is a full-screen layer behind everything,
 * so it covers the page under the panel too.
 */
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  showScrim = true,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {showScrim ? (
        <Animated.View
          entering={FadeIn.duration(ENTER_MS)}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0,0,0,0.6)' },
          ]}
        />
      ) : null}
      <Pressable
        className="flex-1"
        onPress={onClose}
        accessibilityRole="button"
      />
      <Animated.View
        entering={SlideInDown.duration(ENTER_MS)}
        className="rounded-t-3xl bg-[#161618] px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-white">{title}</Text>
          <Pressable onPress={onClose} accessibilityRole="button">
            <Text className="text-base font-semibold text-rose-500">Done</Text>
          </Pressable>
        </View>
        {children}
      </Animated.View>
    </Modal>
  );
}
