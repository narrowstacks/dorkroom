import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { SectionLabel } from '@/components/section-label';
import { useMeterRoll } from '@/hooks/use-meter-roll';
import { rollLabel, rollSubtitle } from '@/lib/film-log-options';
import { toHref } from '@/lib/href';
import { usePhaseHue } from '@/theme/use-phase-accent';

/** One quiet line when no roll is active, to the same form Film Log's "+ New
 * roll" opens. */
function StartRollPrompt() {
  const hue = usePhaseHue();
  return (
    <Pressable
      onPress={() => router.push(toHref('/shoot/film-log/roll-form'))}
      accessibilityRole="button"
      accessibilityLabel="No active roll. Start a roll"
      className="active:opacity-60"
    >
      <GlassCard compact className="flex-row items-center justify-between">
        <Text className="text-sm text-white/60">No active roll</Text>
        <Text className="text-sm font-medium" style={{ color: hue }}>
          Start a roll
        </Text>
      </GlassCard>
    </Pressable>
  );
}

/**
 * The roll in the camera, at the top of Shoot: the one the Meter logs to
 * (`useMeterRoll`), so both agree. A prompt to start one when none is active.
 */
export function ActiveRollCard() {
  const { roll } = useMeterRoll();
  if (!roll) return <StartRollPrompt />;
  const title = rollLabel(roll);
  const subtitle = rollSubtitle(roll);
  return (
    <Pressable
      onPress={() => router.push(toHref(`/shoot/film-log/roll/${roll.id}`))}
      accessibilityRole="button"
      accessibilityLabel={`Active roll, ${title}, ${subtitle}. Open roll`}
      className="active:opacity-60"
    >
      <GlassCard className="flex-row items-center justify-between gap-3">
        <View className="shrink gap-1">
          <SectionLabel>Active roll</SectionLabel>
          <Text className="text-lg font-semibold text-white">{title}</Text>
          <Text className="text-sm text-white/60">{subtitle}</Text>
        </View>
        <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
      </GlassCard>
    </Pressable>
  );
}
