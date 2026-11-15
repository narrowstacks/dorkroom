import { Pressable, Text, View } from 'react-native';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { ACCENT } from '@/theme/accents';
import { SAFELIGHT } from '@/theme/safelight';
import { usePhaseAccent } from '@/theme/use-phase-accent';

interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  /** A row of an `InsetGroup`: no fill or outline of its own, the group draws
   * them. */
  grouped?: boolean;
}

/** On-track outside a phase: a soft white (opacity lives in the colour, so it
 * can't fade the thumb). */
const NEUTRAL_ON_TRACK = 'rgba(255,255,255,0.45)';
const OFF_TRACK = 'rgba(255,255,255,0.2)';
/** Every on-track is a light fill, so the thumb on it is dark to stay visible. */
const ON_THUMB = '#0b0b0c';
const OFF_THUMB = '#ffffff';

/** A labelled on/off switch row. */
export function ToggleRow({
  label,
  value,
  onChange,
  grouped = false,
}: ToggleRowProps) {
  const accent = usePhaseAccent();
  const { on: safelight } = useSafelight();
  const onTrack = safelight
    ? SAFELIGHT.outlineSelected
    : accent === null
      ? NEUTRAL_ON_TRACK
      : ACCENT[accent];
  const offTrack = safelight ? SAFELIGHT.wash : OFF_TRACK;
  const offThumb = safelight ? SAFELIGHT.textTertiary : OFF_THUMB;
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      className={
        grouped
          ? 'min-h-11 flex-row items-center justify-between gap-3 px-4 py-3'
          : 'flex-row items-center justify-between rounded-xl border-hw border-line bg-surface px-4 py-3'
      }
    >
      <Text
        className={
          grouped ? 'flex-1 text-base text-white' : 'text-base text-white'
        }
      >
        {label}
      </Text>
      <View
        className="h-6 w-11 justify-center rounded-full"
        style={{ backgroundColor: value ? onTrack : offTrack }}
      >
        <View
          className={`mx-0.5 h-5 w-5 rounded-full ${value ? 'self-end' : 'self-start'}`}
          style={{ backgroundColor: value ? ON_THUMB : offThumb }}
        />
      </View>
    </Pressable>
  );
}
