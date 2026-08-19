import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
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
import {
  formatClock,
  formatFinishAt,
  formatTemp,
  stageDisplayName,
} from './format';

interface CountdownProps {
  stage: TimerStage | undefined;
  remainingSeconds: number;
  status: TimerStatus;
  /** 0..1 elapsed fraction of the current stage, for the progress bar. */
  progress: number;
  /** Seconds left across the current stage and every stage after it. */
  totalRemainingSeconds: number;
  /** The stage after the current one, if any — shown as a "what's next" hint. */
  nextStage: TimerStage | undefined;
}

const STATUS_HINT = new Map<TimerStatus, string>([
  ['idle', 'Ready'],
  ['paused', 'Paused'],
  ['completed', 'Process complete'],
]);

/** The hero countdown card: stage name, big M:SS readout, and an animated bar. */
export function Countdown({
  stage,
  remainingSeconds,
  status,
  progress,
  totalRemainingSeconds,
  nextStage,
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
  const hint = STATUS_HINT.get(status);
  const completed = status === 'completed';
  const showTotals = status === 'running' || status === 'paused';

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

  // Pulse the AGITATE pill while a window is active so it can't be missed on a
  // counter in a dim room. Honors Reduce Motion — skip the loop, keep the pill
  // static (the accessibilityLiveRegion below still carries the a11y signal).
  const pulse = useSharedValue(1);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (agitatingNow && !reducedMotion) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 450 }),
          withTiming(1, { duration: 450 })
        ),
        -1
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 150 });
    }
  }, [agitatingNow, reducedMotion, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

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

        {showTotals ? (
          <View className="flex-row justify-between gap-2">
            <Text
              className="text-xs text-white/40"
              numberOfLines={1}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              Total left {formatClock(totalRemainingSeconds)} · finishes{' '}
              {
                // eslint-disable-next-line react-doctor/rendering-hydration-mismatch-time -- React Native has no server/client hydration step (Metro bundles JS for the device only); this re-renders every 250ms tick from the timer's wall-clock interval, so a fresh `new Date()` per render is intentional, not a mismatch risk.
                formatFinishAt(new Date(), totalRemainingSeconds)
              }
            </Text>
            <Text className="text-xs text-white/40" numberOfLines={1}>
              {nextStage
                ? `Next: ${stageDisplayName(nextStage)}`
                : 'Last stage'}
            </Text>
          </View>
        ) : null}

        {agitatingNow ? (
          <Animated.View
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Agitate now, ${Math.ceil(agitation.windowRemainingSeconds)} seconds left`}
            className="flex-row items-center self-start rounded-full border px-3 py-1.5"
            style={[
              {
                backgroundColor: tint.backgroundColor,
                borderColor: tint.borderColor,
              },
              pulseStyle,
            ]}
          >
            <Text
              className="text-sm font-bold uppercase tracking-wide"
              style={{ color: tint.color }}
            >
              Agitate · {formatClock(agitation.windowRemainingSeconds)}
            </Text>
          </Animated.View>
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
