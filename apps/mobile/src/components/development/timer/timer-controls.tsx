import * as Haptics from 'expo-haptics';
import {
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { TimerStatus } from '@/lib/timer/types';

interface TimerControlsProps {
  status: TimerStatus;
  /** True when the current stage is the last one (skip would complete). */
  isLastStage: boolean;
  isFirstStage: boolean;
  hasStages: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSkip: () => void;
  onPrev: () => void;
}

interface IconProps {
  size?: number;
  color?: string;
}

function SecondaryButton({
  icon: Icon,
  label,
  onPress,
  disabled,
}: {
  icon: ComponentType<IconProps>;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      className={`flex-1 items-center gap-1 rounded-xl bg-white/10 py-3 ${disabled ? 'opacity-30' : ''}`}
    >
      <Icon size={20} color="#ffffff" />
      <Text className="text-xs text-white/70">{label}</Text>
    </Pressable>
  );
}

/** Start/pause/resume/skip/reset control cluster for the timer. */
export function TimerControls({
  status,
  isLastStage,
  isFirstStage,
  hasStages,
  onStart,
  onPause,
  onResume,
  onReset,
  onSkip,
  onPrev,
}: TimerControlsProps) {
  const running = status === 'running';
  const completed = status === 'completed';

  const primary = completed
    ? { label: 'Restart', icon: RotateCcw, onPress: onReset }
    : running
      ? { label: 'Pause', icon: Pause, onPress: onPause }
      : status === 'paused'
        ? { label: 'Resume', icon: Play, onPress: onResume }
        : { label: 'Start', icon: Play, onPress: onStart };
  const PrimaryIcon = primary.icon;
  const primaryDisabled = !hasStages;

  return (
    <View className="gap-3">
      <Pressable
        onPress={() => {
          if (primaryDisabled) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          primary.onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={primary.label}
        accessibilityState={{ disabled: primaryDisabled }}
        className={`flex-row items-center justify-center gap-2 rounded-2xl bg-rose-600 py-4 ${primaryDisabled ? 'opacity-30' : ''}`}
      >
        <PrimaryIcon size={22} color="#ffffff" />
        <Text className="text-lg font-semibold text-white">
          {primary.label}
        </Text>
      </Pressable>

      <View className="flex-row gap-3">
        <SecondaryButton
          icon={SkipBack}
          label="Prev stage"
          onPress={onPrev}
          disabled={!hasStages || completed || isFirstStage}
        />
        <SecondaryButton
          icon={SkipForward}
          label={isLastStage ? 'Finish' : 'Skip stage'}
          onPress={onSkip}
          disabled={!hasStages || completed}
        />
        <SecondaryButton
          icon={RotateCcw}
          label="Reset"
          onPress={onReset}
          disabled={!hasStages || status === 'idle'}
        />
      </View>
    </View>
  );
}
