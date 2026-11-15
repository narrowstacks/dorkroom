import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';
import { GlassPill } from '@/components/meter/glass-pill';

/** The Meter's other small pills (gear, roll) are 44 or more. */
const NEXT_STEP_MIN_HEIGHT = 44;

interface MeterNextStepProps {
  /** Visible text; the trusted part first, so truncation cuts the generic word. */
  label: string;
  /** The full spoken sentence. */
  accessibilityLabel: string;
  onPress: () => void;
  /** Keeps the pill clear of the right-hand control stack. */
  maxWidth: number;
}

/**
 * The Meter's next-step link ("Ilford HP5+ reciprocity") as a glass pill, since
 * a card row reads wrong over a live viewfinder. It lives in the top-left stack
 * under the settings gear, away from the shutter button and the toggle. Render
 * it only when there is a link: not rendering it is what hides it from VoiceOver.
 */
export function MeterNextStep({
  label,
  accessibilityLabel,
  onPress,
  maxWidth,
}: MeterNextStepProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens Reciprocity with this shutter time"
      style={{ maxWidth }}
      hitSlop={4}
    >
      <GlassPill style={styles.pill}>
        <SymbolView name="hourglass" size={16} tintColor="#ffffff" />
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.label}>
          {label}
        </Text>
      </GlassPill>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    gap: 8,
    minHeight: NEXT_STEP_MIN_HEIGHT,
    paddingVertical: 0,
    paddingHorizontal: 14,
  },
  label: { flexShrink: 1, color: '#ffffff', fontSize: 15, fontWeight: '600' },
});
