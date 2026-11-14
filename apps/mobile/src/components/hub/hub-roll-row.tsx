import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { StatusPill } from '@/components/film-log/roll-row';
import { stacksRollRow } from '@/lib/film-log-list';
import { useDimInk } from '@/theme/use-phase-accent';

interface HubRollRowProps {
  title: string;
  detail: string;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** The Film Log list's status pill, for a row whose status is not implied
   * by its card (the roll in the camera). `tinted` takes the phase tint. */
  status?: { label: string; tinted: boolean };
}

/**
 * One roll in a hub's grouped list: its label, a detail line, an optional
 * status pill and a chevron. A row of an `InsetGroup`, so it draws no fill or
 * separator of its own. At the accessibility text sizes the pill moves under
 * the text so the title keeps the width.
 */
export function HubRollRow({
  title,
  detail,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  status,
}: HubRollRowProps) {
  const chevronInk = useDimInk('rgba(255,255,255,0.4)');
  const { fontScale } = useWindowDimensions();
  const stacked = stacksRollRow(fontScale);
  const pill = status ? (
    <StatusPill label={status.label} tinted={status.tinted} />
  ) : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      className="min-h-11 flex-row items-center justify-between gap-3 px-4 py-3 active:opacity-60"
    >
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-semibold text-white">{title}</Text>
        <Text className="text-sm text-ink-60">{detail}</Text>
        {stacked && pill ? (
          <View className="items-start pt-1">{pill}</View>
        ) : null}
      </View>
      {stacked ? null : pill}
      <ChevronRight size={18} color={chevronInk} />
    </Pressable>
  );
}
