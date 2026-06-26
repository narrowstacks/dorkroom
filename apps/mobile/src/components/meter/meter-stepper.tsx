import { Pressable, StyleSheet, Text } from 'react-native';
import { readoutText as MONO } from '@/theme/tokens';
import { GlassPill } from './glass-pill';

const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

interface MeterStepperProps {
  /** The current value, already formatted (e.g. "ISO 400", "CAL +0.3"). */
  label: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
}

/** A compact −/＋ readout drawn on the feed, for ISO and calibration. */
export function MeterStepper({
  label,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
}: MeterStepperProps) {
  return (
    <GlassPill style={styles.container}>
      <Pressable
        onPress={onDecrement}
        accessibilityRole="button"
        accessibilityLabel={decrementLabel}
        hitSlop={12}
        style={styles.button}
      >
        <Text style={[MONO, SHADOW, styles.buttonText]}>−</Text>
      </Pressable>
      <Text
        style={[MONO, SHADOW, styles.label]}
        className="font-semibold tracking-wider text-white"
      >
        {label}
      </Text>
      <Pressable
        onPress={onIncrement}
        accessibilityRole="button"
        accessibilityLabel={incrementLabel}
        hitSlop={12}
        style={styles.button}
      >
        <Text style={[MONO, SHADOW, styles.buttonText]}>＋</Text>
      </Pressable>
    </GlassPill>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  button: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 21,
    lineHeight: 23,
    fontWeight: '700',
  },
  label: {
    minWidth: 76,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
});
