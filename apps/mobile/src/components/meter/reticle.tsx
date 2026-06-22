import { View } from 'react-native';

/** A center metering crosshair drawn over the camera preview. */
export function Reticle() {
  return (
    <View
      className="absolute inset-0 items-center justify-center"
      pointerEvents="none"
    >
      <View className="size-16 rounded-full border-2 border-white/80" />
      <View className="absolute h-px w-6 bg-white/80" />
      <View className="absolute h-6 w-px bg-white/80" />
    </View>
  );
}
