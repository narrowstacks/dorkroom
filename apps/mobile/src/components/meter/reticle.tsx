import { View } from 'react-native';

/** Size of the reticle box; the parent positions it on the metered point. */
export const RETICLE_SIZE = 72;

/**
 * The spot-metering indicator: a rounded yellow box like the stock Camera
 * tap-to-focus square. Only shown in spot mode; the parent positions it.
 */
export function Reticle() {
  return (
    <View
      pointerEvents="none"
      style={{
        width: RETICLE_SIZE,
        height: RETICLE_SIZE,
        boxShadow: '0px 1px 3px rgba(0,0,0,0.5)',
      }}
      className="rounded-lg border-2 border-yellow-400"
    />
  );
}
