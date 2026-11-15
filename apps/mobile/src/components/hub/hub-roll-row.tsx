import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useDimInk } from '@/theme/use-phase-accent';

interface HubRollRowProps {
  title: string;
  detail: string;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

/** One roll in a hub card: its label, a detail line and a chevron. */
export function HubRollRow({
  title,
  detail,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: HubRollRowProps) {
  const chevronInk = useDimInk('rgba(255,255,255,0.4)');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      className="min-h-11 flex-row items-center justify-between gap-3 py-2 active:opacity-60"
    >
      <View className="shrink gap-0.5">
        <Text className="text-base font-semibold text-white" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-sm text-ink-60" numberOfLines={2}>
          {detail}
        </Text>
      </View>
      <ChevronRight size={18} color={chevronInk} />
    </Pressable>
  );
}
