// eslint-disable-next-line react-doctor/rn-prefer-expo-image -- expo-image is not installed; this grain tile uses resizeMode="repeat" which expo-image does not support
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import grainTile from '@/assets/grain.png';

/**
 * The web dark-theme backdrop ported to native: three radial glows over
 * near-black, plus a tiling grain overlay. Absolute-fill and non-interactive,
 * so it sits behind scroll content and stays fixed.
 */
export function GradientBackground() {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: '#070708' }]}
    >
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="peach" cx="50%" cy="-10%" r="75%">
            <Stop offset="0" stopColor="#f99f96" stopOpacity={0.1} />
            <Stop offset="0.55" stopColor="#f99f96" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="red" cx="12%" cy="90%" r="60%">
            <Stop offset="0" stopColor="#f34646" stopOpacity={0.14} />
            <Stop offset="0.5" stopColor="#f34646" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="orange" cx="88%" cy="95%" r="55%">
            <Stop offset="0" stopColor="#e57a3c" stopOpacity={0.1} />
            <Stop offset="0.45" stopColor="#e57a3c" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#peach)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#red)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#orange)" />
      </Svg>
      <Image
        source={grainTile}
        resizeMode="repeat"
        style={[StyleSheet.absoluteFill, { opacity: 0.07 }]}
      />
    </View>
  );
}
