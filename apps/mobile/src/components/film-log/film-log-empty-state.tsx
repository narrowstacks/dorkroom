import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { useDimInk, usePhaseHue } from '@/theme/use-phase-accent';

// The tab bar's own symbols, so the track reads as the tabs it points at.
const TRACK: { label: string; symbol: SymbolViewProps['name'] }[] = [
  { label: 'Shoot', symbol: 'camera' },
  { label: 'Develop', symbol: 'flask' },
  { label: 'Print', symbol: 'photo.on.rectangle' },
];

/** Shoot, Develop and Print in a row, Shoot (where the roll starts) in hue.
 * One VoiceOver element. Wraps at large text sizes. */
function LifecycleTrack() {
  const hue = usePhaseHue();
  const dim = useDimInk('rgba(255,255,255,0.5)');
  return (
    <View
      accessible
      accessibilityLabel="Shoot, then Develop, then Print"
      className="flex-row flex-wrap items-center justify-center gap-x-2 gap-y-1"
    >
      {TRACK.map((step, index) => {
        const ink = index === 0 ? hue : dim;
        return (
          <View key={step.label} className="flex-row items-center gap-2">
            {index > 0 ? (
              <SymbolView name="chevron.right" size={11} tintColor={dim} />
            ) : null}
            <SymbolView name={step.symbol} size={16} tintColor={ink} />
            <Text className="text-sm font-medium" style={{ color: ink }}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * The Film Log with no rolls: a glyph, "Load a roll", one sentence on how a
 * roll moves through the tabs, the lifecycle track, the screen's one
 * full-width commit, and a hint about cameras and lenses.
 */
interface FirstRollEmptyStateProps {
  /** From `firstRollHint`: what to do about cameras and lenses. */
  hint: string;
  onNewRoll: () => void;
}

export function FirstRollEmptyState({
  hint,
  onNewRoll,
}: FirstRollEmptyStateProps) {
  const hue = usePhaseHue();
  return (
    <View className="items-center gap-5 px-4 pt-10">
      <SymbolView
        name="film"
        size={44}
        tintColor={hue}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View className="items-center gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-xl font-semibold text-white"
        >
          Load a roll
        </Text>
        <Text className="text-center text-base text-ink-60">
          Log frames from the Meter or by hand. The roll follows you to Develop
          and Print.
        </Text>
      </View>
      <LifecycleTrack />
      <Button
        variant="commit"
        label="New roll"
        onPress={onNewRoll}
        className="self-stretch"
      />
      <Text className="text-center text-sm text-ink-40">{hint}</Text>
    </View>
  );
}

interface NoMatchEmptyStateProps {
  message: string;
  onShowAll: () => void;
}

/** A filter that hides every roll: one line naming it, and the way back. */
export function NoMatchEmptyState({
  message,
  onShowAll,
}: NoMatchEmptyStateProps) {
  return (
    <View className="items-center gap-1 px-4 pt-10">
      <Text className="text-center text-base text-ink-60">{message}</Text>
      <Button variant="plain" label="Show all rolls" onPress={onShowAll} />
    </View>
  );
}
