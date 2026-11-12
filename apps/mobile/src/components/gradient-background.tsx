import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ACCENT, PHASE_ACCENT } from '@/theme/accents';
import { usePhase } from '@/theme/phase-context';

/** The glow on Home and Settings, which belong to no phase. */
const NEUTRAL_GLOW = '#ffffff';
const GLOW_OPACITY = 0.12;

/**
 * Near-black backdrop with one radial glow at the top of the screen, in the
 * hue of the phase the screen lives in (neutral on Home and Settings).
 * Absolute-fill and non-interactive, so it sits behind scroll content and
 * stays fixed.
 */
export function GradientBackground() {
  const phase = usePhase();
  const glow = phase === null ? NEUTRAL_GLOW : ACCENT[PHASE_ACCENT[phase]];
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: '#070708' }]}
    >
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="-10%" r="75%">
            <Stop offset="0" stopColor={glow} stopOpacity={GLOW_OPACITY} />
            <Stop offset="0.55" stopColor={glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow)" />
      </Svg>
    </View>
  );
}
