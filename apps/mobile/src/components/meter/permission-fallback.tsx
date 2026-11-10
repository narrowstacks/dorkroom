import { Linking, Pressable, Text, View } from 'react-native';
import { NeutralButton } from '@/components/neutral-button';

/** Shown when camera permission is missing; offers request + Settings deep-link. */
export function PermissionFallback({ onRequest }: { onRequest: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-[#0b0b0c] p-8">
      <Text className="text-center text-base text-ink-80">
        Dorkroom needs camera access to meter your scene.
      </Text>
      <NeutralButton onPress={onRequest} label="Allow camera" />
      <Pressable
        onPress={() => void Linking.openSettings()}
        accessibilityRole="button"
      >
        <Text className="text-ink-60">Open Settings</Text>
      </Pressable>
    </View>
  );
}
