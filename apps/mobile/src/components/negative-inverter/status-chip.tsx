import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { type ChipTone, CHROME_TEXT_SCALE } from './editor-layout';

export interface StatusChipViewProps {
  text: string;
  tone: ChipTone;
  /** What VoiceOver reads; the text when omitted. */
  accessibilityLabel?: string;
  /** Makes the chip a button. */
  onPress?: () => void;
  /** Leads with a spinner, for work in progress. */
  busy?: boolean;
  className?: string;
}

const TONES = {
  neutral: { fill: 'border border-white/15 bg-black/70', ink: 'text-white/90' },
  info: { fill: 'border border-white/15 bg-black/70', ink: 'text-amber-300' },
  alert: { fill: 'bg-rose-600', ink: 'text-white' },
  ok: { fill: 'border border-white/15 bg-black/70', ink: 'text-emerald-300' },
} satisfies Record<ChipTone, { fill: string; ink: string }>;

/**
 * A short status pill drawn over the stage: the film base, clipping, export
 * progress. Dark and opaque enough to read over any photo, and one line, so
 * a status never pushes the layout around.
 */
export function StatusChip({
  text,
  tone,
  accessibilityLabel,
  onPress,
  busy = false,
  className = '',
}: StatusChipViewProps) {
  const { fill, ink } = TONES[tone];
  const body = (
    <>
      {busy ? <ActivityIndicator color="#ffffff" size="small" /> : null}
      <Text
        // An alert can carry an error the user has to act on: give it room.
        numberOfLines={tone === 'alert' ? 2 : 1}
        maxFontSizeMultiplier={CHROME_TEXT_SCALE}
        className={`shrink text-xs font-semibold ${ink}`}
      >
        {text}
      </Text>
    </>
  );
  const pill = `flex-row items-center gap-1.5 px-3 py-1 ${
    tone === 'alert' ? 'rounded-2xl' : 'rounded-full'
  } ${fill} ${className}`;
  if (onPress) {
    // A 32 pt pill with slop to reach a 44 pt target without crowding the photo.
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? text}
        hitSlop={6}
        className={`min-h-8 ${pill}`}
      >
        {body}
      </Pressable>
    );
  }
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? text}
      className={`min-h-7 ${pill}`}
    >
      {body}
    </View>
  );
}
