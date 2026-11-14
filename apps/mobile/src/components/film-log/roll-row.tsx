import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { groupRowClassName } from '@/components/surface-style';
import { type RollRowText, stacksRollRow } from '@/lib/film-log-list';
import { useSelectionTint } from '@/theme/use-phase-accent';

interface RollRowProps {
  text: RollRowText;
  dateLabel: string;
  /** "In camera": the pill takes the phase tint; Shot and Developed stay neutral. */
  inCamera: boolean;
  /** Position in the group, for the rounded ends and the separator. */
  index: number;
  count: number;
  onPress: () => void;
}

/** The status pill: tinted for In camera, neutral otherwise. Shared with the hubs. */
export function StatusPill({
  label,
  tinted,
}: {
  label: string;
  tinted: boolean;
}) {
  const tint = useSelectionTint();
  if (tinted) {
    return (
      <View
        className="rounded-full px-2.5 py-0.5"
        style={{
          backgroundColor: tint.backgroundColor,
          borderColor: tint.borderColor,
          borderWidth: 1,
        }}
      >
        <Text className="text-xs font-semibold" style={{ color: tint.color }}>
          {label}
        </Text>
      </View>
    );
  }
  return (
    <View className="rounded-full border-hw border-line bg-surface-strong px-2.5 py-0.5">
      <Text className="text-xs font-semibold text-ink-70">{label}</Text>
    </View>
  );
}

/**
 * One roll in the Film Log's grouped list: the roll's label, a detail line,
 * and a status pill with the start date trailing. At the accessibility text
 * sizes the pill and date move under the text so nothing is squeezed. Read
 * by VoiceOver as one button with one label.
 */
export function RollRow({
  text,
  dateLabel,
  inCamera,
  index,
  count,
  onPress,
}: RollRowProps) {
  const { fontScale } = useWindowDimensions();
  const stacked = stacksRollRow(fontScale);
  const trailing = (
    <View
      className={
        stacked ? 'flex-row items-center gap-2' : 'shrink-0 items-end gap-1'
      }
    >
      <StatusPill label={text.status} tinted={inCamera} />
      {dateLabel ? (
        <Text className="text-sm tabular-nums text-ink-60">{dateLabel}</Text>
      ) : null}
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={text.accessibilityLabel}
      className={`${groupRowClassName(index, count)} active:opacity-70`}
    >
      <View
        className={
          stacked
            ? 'min-h-11 gap-2 px-4 py-3'
            : 'min-h-11 flex-row items-center gap-3 px-4 py-3'
        }
      >
        <View className={stacked ? 'gap-0.5' : 'flex-1 gap-0.5'}>
          <Text className="text-base font-semibold text-white">
            {text.title}
          </Text>
          <Text className="text-sm text-ink-60">{text.detail}</Text>
        </View>
        {trailing}
      </View>
    </Pressable>
  );
}
