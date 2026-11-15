import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { confirmMarkShot } from '@/components/film-log/confirm-roll-status';
import { GlassCard } from '@/components/glass-card';
import { SectionLabel } from '@/components/section-label';
import { useMeterRoll } from '@/hooks/use-meter-roll';
import { rollLabel, rollSubtitle } from '@/lib/film-log-options';
import { toHref } from '@/lib/href';
import { usePhaseHue } from '@/theme/use-phase-accent';

/** One quiet line when no roll is in a camera, to the same form Film Log's
 * "+ New roll" opens. */
function StartRollPrompt() {
  const hue = usePhaseHue();
  return (
    <Pressable
      onPress={() => router.push(toHref('/shoot/film-log/roll-form'))}
      accessibilityRole="button"
      accessibilityLabel="No roll in the camera. Start a roll"
      className="active:opacity-60"
    >
      <GlassCard compact className="flex-row items-center justify-between">
        <Text className="text-sm text-ink-60">No roll in the camera</Text>
        <Text className="text-sm font-medium" style={{ color: hue }}>
          Start a roll
        </Text>
      </GlassCard>
    </Pressable>
  );
}

/**
 * The roll in the camera, at the top of Shoot: the one the Meter logs to
 * (`useMeterRoll`), so both agree. A prompt to start one when none is in a
 * camera. The body (opens the roll) and "Mark as shot" are sibling buttons,
 * never nested, so each has its own target and spoken label.
 */
export function ActiveRollCard() {
  const { roll } = useMeterRoll();
  const hue = usePhaseHue();
  if (!roll) return <StartRollPrompt />;
  const title = rollLabel(roll);
  const subtitle = rollSubtitle(roll);
  return (
    <GlassCard className="gap-1">
      <Pressable
        onPress={() => router.push(toHref(`/shoot/film-log/roll/${roll.id}`))}
        accessibilityRole="button"
        accessibilityLabel={`In camera, ${title}, ${subtitle}. Open roll`}
        className="flex-row items-center justify-between gap-3 active:opacity-60"
      >
        <View className="shrink gap-1">
          <SectionLabel>In camera</SectionLabel>
          <Text className="text-lg font-semibold text-white">{title}</Text>
          <Text className="text-sm text-ink-60">{subtitle}</Text>
        </View>
        <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
      </Pressable>
      <View className="h-px bg-edge" />
      <Pressable
        onPress={() => confirmMarkShot(roll)}
        accessibilityRole="button"
        accessibilityLabel={`Mark ${title} as shot`}
        accessibilityHint="Moves the roll to To develop. Asks first."
        className="min-h-11 justify-center active:opacity-60"
      >
        <Text className="text-sm font-medium" style={{ color: hue }}>
          Mark as shot
        </Text>
      </Pressable>
    </GlassCard>
  );
}
