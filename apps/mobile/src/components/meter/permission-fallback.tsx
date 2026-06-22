import { Linking, Pressable, Text, View } from 'react-native';

/** Shown when camera permission is missing; offers request + Settings deep-link. */
export function PermissionFallback({ onRequest }: { onRequest: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-[#0b0b0c] p-8">
      <Text className="text-center text-base text-white/80">
        Dorkroom needs camera access to meter your scene.
      </Text>
      <Pressable
        onPress={onRequest}
        accessibilityRole="button"
        className="rounded-xl bg-rose-600 px-5 py-3"
      >
        <Text className="font-semibold text-white">Allow camera</Text>
      </Pressable>
      <Pressable
        onPress={() => void Linking.openSettings()}
        accessibilityRole="button"
      >
        <Text className="text-white/60">Open Settings</Text>
      </Pressable>
    </View>
  );
}
