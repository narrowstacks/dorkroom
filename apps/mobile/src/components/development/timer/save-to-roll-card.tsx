import { useMemo, useState, useSyncExternalStore } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CommitButton } from '@/components/commit-button';
import { developedDateText } from '@/components/film-log/developed-date';
import { GlassCard } from '@/components/glass-card';
import { SectionLabel } from '@/components/section-label';
import { useRolls } from '@/hooks/use-film-log';
import { rollLabel } from '@/lib/film-log-options';
import { markRollDeveloped } from '@/lib/film-log-storage';
import {
  defaultRollToDevelop,
  rollsToDevelop,
  rollToDevelopLine,
  showsRollPicker,
} from '@/lib/roll-lifecycle';
import {
  developmentRecordFrom,
  developmentSession,
  developStage,
} from '@/lib/timer/development-session';
import { timerStore } from '@/lib/timer/timer-store';
import { selectableRowStyle, useSelectionTint } from '@/theme/use-phase-accent';

const selectTimer = () => timerStore.getSnapshot().timer;

/**
 * Under a completed run that developed film (it has a develop stage), while a
 * shot roll waits: offers to record the run on a roll. Starts on the roll the
 * run was started for, else the only shot roll, else asks. Nothing is saved
 * without the tap, a run is saved at most once, and the card (or its
 * confirmation) stays until Reset or a new run, also across leaving the timer
 * and coming back, because its state lives in the session store.
 */
export function SaveToRollCard() {
  const timer = useSyncExternalStore(timerStore.subscribe, selectTimer);
  const session = useSyncExternalStore(
    developmentSession.subscribe,
    developmentSession.getState
  );
  const rolls = useRolls();
  const candidates = useMemo(() => rollsToDevelop(rolls), [rolls]);
  const tint = useSelectionTint();
  // The user's pick, for the run it was made in.
  const [picked, setPicked] = useState<{ run: number; rollId: string } | null>(
    null
  );

  const { run } = session;
  // Only a run that actually ran to its end (not Next tapped from idle).
  if (timer.status !== 'completed' || run === 0 || !session.ranToEnd) {
    return null;
  }
  if (!developStage(timer.stages)) return null;

  if (session.saved?.run === run) {
    const savedRoll = rolls.find((roll) => roll.id === session.saved?.rollId);
    return (
      <Text
        className="text-center text-sm text-ink-70"
        accessibilityLiveRegion="polite"
      >
        Saved to {savedRoll ? rollLabel(savedRoll) : 'the roll'} as developed.
      </Text>
    );
  }
  if (session.dismissedRun === run || candidates.length === 0) return null;

  const preselected = defaultRollToDevelop(candidates, session.active?.rollId);
  // Decided on the preselection, so the list stays put once the user picks.
  const showPicker = showsRollPicker(candidates.length, preselected);
  const pickedId =
    picked?.run === run && candidates.some((roll) => roll.id === picked.rollId)
      ? picked.rollId
      : preselected;
  const target = candidates.find((roll) => roll.id === pickedId);
  // A roll set back to Shot keeps its record; saving replaces it, so say so.
  const replacedDate = target?.development
    ? developedDateText(target.development.developedAt)
    : undefined;

  const onSave = () => {
    if (!target || !developmentSession.canSave()) return;
    const record = developmentRecordFrom(
      developmentSession.getState().active?.recipe,
      timer.stages,
      new Date().toISOString()
    );
    if (!markRollDeveloped(target.id, record)) return;
    developmentSession.markSaved(target.id);
  };

  return (
    <GlassCard className="gap-3">
      <SectionLabel>Save to roll</SectionLabel>
      {showPicker ? (
        <View className="gap-2">
          {candidates.map((roll) => {
            const selected = roll.id === pickedId;
            const title = rollLabel(roll);
            const detail = rollToDevelopLine(roll);
            return (
              <Pressable
                key={roll.id}
                onPress={() => setPicked({ run, rollId: roll.id })}
                accessibilityRole="button"
                accessibilityLabel={`${title}, ${detail}`}
                accessibilityState={{ selected }}
                className="min-h-11 flex-row items-center justify-between gap-3 rounded-xl border px-4 py-3"
                style={selectableRowStyle(tint, selected)}
              >
                <View className="shrink gap-0.5">
                  <Text className="text-base text-white" numberOfLines={1}>
                    {title}
                  </Text>
                  <Text className="text-sm text-ink-60" numberOfLines={1}>
                    {detail}
                  </Text>
                </View>
                {selected ? (
                  <Text className="text-base text-white">✓</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text className="text-sm text-ink-70">
          Record this run on the roll waiting to be developed.
        </Text>
      )}
      {replacedDate ? (
        <Text className="text-sm text-ink-70">
          Replaces the saved development from {replacedDate}.
        </Text>
      ) : null}
      <CommitButton
        onPress={onSave}
        disabled={!target}
        label={target ? `Save to ${rollLabel(target)}` : 'Pick a roll'}
      />
      <Pressable
        onPress={developmentSession.dismiss}
        accessibilityRole="button"
        className="min-h-11 items-center justify-center active:opacity-60"
      >
        <Text className="text-sm text-ink-60">Not now</Text>
      </Pressable>
    </GlassCard>
  );
}
