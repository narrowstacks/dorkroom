import * as Haptics from 'expo-haptics';
import { Pressable, Share, Text } from 'react-native';

export function ShareButton({ message }: { message: string }) {
  const onPress = async () => {
    Haptics.selectionAsync();
    // Share.share rejects when the user dismisses the sheet — that is a normal
    // cancel, not an error, so it is intentionally ignored.
    await Share.share({ message }).catch(() => undefined);
  };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="mt-1 flex-row items-center justify-center rounded-xl bg-white/10 py-3"
    >
      <Text className="font-semibold text-white">Share result</Text>
    </Pressable>
  );
}
