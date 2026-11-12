import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  SlideInDown,
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SafelightOverlay,
  SafelightRoot,
} from '@/components/safelight/safelight-overlay';
import { useSafelight } from '@/components/safelight/safelight-provider';

interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Fires after the sheet has fully dismissed (iOS), e.g. to present
   * something else that must not be stacked on it. */
  onDismiss?: () => void;
  children: ReactNode;
  /**
   * Label for the header's dismiss action. Defaults to "Done". Sheets whose
   * body has its own commit button (e.g. a save/add form) should pass
   * "Cancel" here, since the header action only discards — it never saves.
   */
  dismissLabel?: string;
}

// Scrim fade and panel slide share this duration so they ramp up in lockstep —
// the scrim never darkens ahead of the panel arriving.
const ENTER_MS = 260;

/**
 * A bottom-anchored sheet on RN Modal. The Modal itself does no animation
 * (`animationType="none"`); the scrim fades and the panel slides via Reanimated
 * on one shared timeline. The scrim is a full-screen layer behind everything,
 * so it covers the page under the panel too. The panel tracks the keyboard via
 * `useAnimatedKeyboard`, so it glides up/down in sync with the native keyboard
 * animation to keep focused text fields visible.
 */
export function BottomSheet({
  visible,
  title,
  onClose,
  onDismiss,
  children,
  dismissLabel = 'Done',
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { on: safelight } = useSafelight();
  const keyboard = useAnimatedKeyboard();
  // Lift the panel by the keyboard's height; reading the shared value here means
  // the movement follows the keyboard's own animation curve (smooth + quick).
  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboard.height.value }],
  }));
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <SafelightRoot overlay={false}>
        <Animated.View
          entering={FadeIn.duration(ENTER_MS)}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0,0,0,0.6)' },
          ]}
        />
        <Pressable
          className="flex-1"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={`Dismiss ${title}`}
        />
        {/* Outer view tracks the keyboard; inner keeps the slide-in entrance. */}
        <Animated.View style={liftStyle}>
          <Animated.View
            entering={SlideInDown.duration(ENTER_MS)}
            className="rounded-t-3xl bg-[#161618] px-5 pt-4"
            style={[
              { paddingBottom: insets.bottom + 16 },
              safelight ? { overflow: 'hidden', isolation: 'isolate' } : null,
            ]}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-white">{title}</Text>
              <Pressable
                className="min-h-11 min-w-11 items-center justify-center"
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={dismissLabel}
              >
                <Text className="text-base font-semibold text-ink-70">
                  {dismissLabel}
                </Text>
              </Pressable>
            </View>
            {children}
            {/* The sheet window is transparent, so the overlay lives on the panel. */}
            <SafelightOverlay />
          </Animated.View>
        </Animated.View>
      </SafelightRoot>
    </Modal>
  );
}
