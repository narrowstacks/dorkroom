import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** A bottom-anchored sheet built on RN Modal (no native sheet library). */
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/60"
        onPress={onClose}
        accessibilityRole="button"
      />
      <View
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
      </View>
    </Modal>
  );
}
