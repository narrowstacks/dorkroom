import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ResultCard } from '@/components/result-card';
import {
  agitationStateAt,
  agitationSummary,
  agitationWindows,
} from '@/lib/timer/agitation';
import type { TimerStage, TimerStatus } from '@/lib/timer/types';
import { ACCENT, selectionTint } from '@/theme/accents';
import { readoutText } from '@/theme/tokens';
import { formatClock, formatTemp, stageDisplayName } from './format';

interface CountdownProps {
  stage: TimerStage | undefined;
  remainingSeconds: number;
  status: TimerStatus;
  /** 0..1 elapsed fraction of the current stage, for the progress bar. */
  progress: number;
}

const STATUS_HINT: Partial<Record<TimerStatus, string>> = {
  idle: 'Ready',
  paused: 'Paused',
  completed: 'Process complete',
};

/** The hero countdown card: stage name, big M:SS readout, and an animated bar. */
export function Countdown({
  stage,
  remainingSeconds,
  status,
  progress,
}: CountdownProps) {
  const fill = useSharedValue(progress);
  useEffect(() => {
    // Tween toward the new fraction so the bar glides between 250ms ticks.
    fill.value = withTiming(progress, { duration: 250 });
  }, [progress, fill]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, Math.max(0, fill.value * 100))}%`,
  }));

  const temp = stage ? formatTemp(stage.temperatureF) : null;
  const hint = STATUS_HINT[status];
  const completed = status === 'completed';

  const pattern = stage?.agitationPattern ?? null;
  const windows = useMemo(
    () =>
      stage && pattern ? agitationWindows(pattern, stage.durationSeconds) : [],
    [stage, pattern]
  );
  const elapsed = stage ? stage.durationSeconds - remainingSeconds : 0;
  const agitation = agitationStateAt(windows, elapsed);
  const agitatingNow =
    pattern !== null && agitation.agitating && status === 'running';
  const showNextAgitation =
    pattern !== null && !agitatingNow && agitation.nextWindowInSeconds != null;
  const tint = selectionTint('green');

  return (
    <ResultCard accent="green">
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-white">
            {completed ? 'Done' : stage ? stageDisplayName(stage) : 'No stages'}
          </Text>
          {hint ? (
            <Text className="text-xs uppercase tracking-wide text-white/40">
              {hint}
            </Text>
          ) : null}
        </View>

        <Text
          style={[styles.readout, { color: ACCENT.green }]}
          accessibilityLabel={`${formatClock(remainingSeconds)} remaining`}
        >
          {formatClock(remainingSeconds)}
        </Text>

        <View style={styles.track}>
          <Animated.View
            style={[styles.bar, { backgroundColor: ACCENT.green }, barStyle]}
          />
        </View>

        {agitatingNow ? (
          <View
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Agitate now, ${Math.ceil(agitation.windowRemainingSeconds)} seconds left`}
            className="flex-row items-center self-start rounded-full border px-3 py-1.5"
            style={{
              backgroundColor: tint.backgroundColor,
              borderColor: tint.borderColor,
            }}
          >
            <Text
              className="text-sm font-bold uppercase tracking-wide"
              style={{ color: tint.color }}
            >
              Agitate · {formatClock(agitation.windowRemainingSeconds)}
            </Text>
          </View>
        ) : showNextAgitation && agitation.nextWindowInSeconds != null ? (
          <Text className="text-sm text-white/60">
            Next agitation in {formatClock(agitation.nextWindowInSeconds)}
          </Text>
        ) : !pattern && stage?.agitation ? (
          <Text className="text-sm text-white/60">{stage.agitation}</Text>
        ) : null}

        {pattern ? (
          <Text className="text-xs text-white/40">
            {agitationSummary(pattern)}
          </Text>
        ) : null}

        {temp ? <Text className="text-sm text-white/50">{temp}</Text> : null}
      </View>
    </ResultCard>
  );
}

const styles = StyleSheet.create({
  readout: {
    alignSelf: 'center',
    fontSize: 72,
    lineHeight: 80,
    fontWeight: '700',
    ...readoutText,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  bar: {
    height: 6,
    borderRadius: 3,
  },
});
