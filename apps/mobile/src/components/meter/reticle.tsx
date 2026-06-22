import { View } from 'react-native';

/** Size of the reticle box; the parent positions it on the metered point. */
export const RETICLE_SIZE = 72;

/** The metering crosshair. Turns rose while exposure is locked. */
export function Reticle({ locked = false }: { locked?: boolean }) {
  const ring = locked ? 'border-rose-400' : 'border-white/80';
  const line = locked ? 'bg-rose-400' : 'bg-white/80';
  return (
    <View
      pointerEvents="none"
      style={{ width: RETICLE_SIZE, height: RETICLE_SIZE }}
      className="items-center justify-center"
    >
      <View className={`size-16 rounded-full border-2 ${ring}`} />
      <View className={`absolute h-px w-6 ${line}`} />
      <View className={`absolute h-6 w-px ${line}`} />
    </View>
  );
}
