import { Pressable, Text, View } from 'react-native';
import { ACCENT } from '@/theme/accents';
import { usePhaseAccent } from '@/theme/use-phase-accent';

interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

/** On-track outside a phase: a soft white (opacity lives in the colour, so it
 * can't fade the thumb). */
const NEUTRAL_ON_TRACK = 'rgba(255,255,255,0.45)';
const OFF_TRACK = 'rgba(255,255,255,0.2)';
/** Every on-track is a light fill, so the thumb on it is dark to stay visible. */
const ON_THUMB = '#0b0b0c';
const OFF_THUMB = '#ffffff';

/** A labelled on/off switch row. */
export function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  const accent = usePhaseAccent();
  const onTrack = accent === null ? NEUTRAL_ON_TRACK : ACCENT[accent];
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      className="flex-row items-center justify-between rounded-xl bg-white/10 px-4 py-3"
    >
      <Text className="text-base text-white">{label}</Text>
      <View
        className="h-6 w-11 justify-center rounded-full"
        style={{ backgroundColor: value ? onTrack : OFF_TRACK }}
      >
        <View
          className={`mx-0.5 h-5 w-5 rounded-full ${value ? 'self-end' : 'self-start'}`}
          style={{ backgroundColor: value ? ON_THUMB : OFF_THUMB }}
        />
      </View>
    </Pressable>
  );
}
