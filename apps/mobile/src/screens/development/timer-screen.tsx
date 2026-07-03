import * as Haptics from 'expo-haptics';
import { Pencil } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Countdown } from '@/components/development/timer/countdown';
import { PresetEditor } from '@/components/development/timer/preset-editor';
import { StageList } from '@/components/development/timer/stage-list';
import { TimerControls } from '@/components/development/timer/timer-controls';
import { useTimer } from '@/components/development/timer/use-timer';
import { PresetChipRow } from '@/components/preset-chip-row';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { consumeTimerPrefill } from '@/lib/timer/prefill';
import { DEFAULT_BW_PRESET, stagesFromCombination } from '@/lib/timer/presets';
import { addPreset, listPresets } from '@/lib/timer/presets-storage';
import type { TimerStage } from '@/lib/timer/types';

/**
 * Standalone multi-stage film-processing timer. Drives the pure engine
 * (lib/timer/) from a wall-clock interval; presets persist via MMKV. Native
 * alerts / keep-awake / audio are a later, EAS-gated card (mob-timer-engine) —
 * this screen is JS-only and runs in the current Metro session.
 */
export function TimerScreen() {
  const [presets, setPresets] = useState(() => listPresets());
  const [stages, setStages] = useState<TimerStage[]>(
    () => DEFAULT_BW_PRESET.stages
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    DEFAULT_BW_PRESET.id
  );
  const [editing, setEditing] = useState(false);

  const timer = useTimer(stages);
  const { load: loadTimer } = timer;
  const idle = timer.status === 'idle';

  const applyStages = useCallback(
    (next: TimerStage[]) => {
      setStages(next);
      loadTimer(next);
    },
    [loadTimer]
  );

  // One-shot recipe prefill: if the user arrived via a recipe's "Start Process
  // Timer", seed the stages from that recipe (dev time/temp/agitation + the
  // standard stop/fix/wash tail) and clear the preset selection. Runs once on
  // mount; the standalone entry (nothing queued) keeps DEFAULT_BW.
  const prefillApplied = useRef(false);
  useEffect(() => {
    if (prefillApplied.current) return;
    prefillApplied.current = true;
    const prefill = consumeTimerPrefill();
    if (prefill) {
      // eslint-disable-next-line react-doctor/no-chain-state-updates -- one-shot mount effect consuming an external module-level queue (consumeTimerPrefill destructively reads-and-clears it), not a state reacting to another state
      setSelectedPresetId('');
      // eslint-disable-next-line react-doctor/no-derived-state -- same one-shot external-system sync; stagesFromCombination(prefill) reads a destructive module singleton, not props/state already available during render, so it can't be computed inline or via useMemo
      applyStages(stagesFromCombination(prefill));
    }
  }, [applyStages]);

  const handleSelectPreset = useCallback(
    (id: string) => {
      const preset = presets.find((p) => p.id === id);
      if (!preset) return;
      setSelectedPresetId(id);
      setEditing(false);
      applyStages(preset.stages);
    },
    [presets, applyStages]
  );

  const handleChangeStages = useCallback(
    (next: TimerStage[]) => {
      // Editing diverges from the selected preset until it's saved again.
      setSelectedPresetId('');
      applyStages(next);
    },
    [applyStages]
  );

  const handleSavePreset = useCallback(
    (name: string) => {
      const created = addPreset(name, stages);
      setPresets(listPresets());
      setSelectedPresetId(created.id);
    },
    [stages]
  );

  const presetOptions = presets.map((p) => ({ label: p.name, value: p.id }));
  const currentStage = timer.stages[timer.currentStageIndex];
  const duration = currentStage?.durationSeconds ?? 0;
  const progress =
    timer.status === 'completed'
      ? 1
      : duration > 0
        ? Math.min(
            1,
            Math.max(0, (duration - timer.remainingSeconds) / duration)
          )
        : 0;

  return (
    <Screen>
      <View className="gap-2">
        <SectionLabel>Preset</SectionLabel>
        <PresetChipRow
          accent="green"
          options={presetOptions}
          value={selectedPresetId}
          onSelect={handleSelectPreset}
        />
      </View>

      <Countdown
        stage={currentStage}
        remainingSeconds={timer.remainingSeconds}
        status={timer.status}
        progress={progress}
      />

      <TimerControls
        status={timer.status}
        hasStages={timer.stages.length > 0}
        isFirstStage={timer.currentStageIndex <= 0}
        isLastStage={timer.currentStageIndex >= timer.stages.length - 1}
        onStart={timer.start}
        onPause={timer.pause}
        onResume={timer.resume}
        onReset={timer.reset}
        onSkip={timer.skip}
        onPrev={timer.prev}
      />

      <StageList
        stages={timer.stages}
        currentStageIndex={timer.currentStageIndex}
        completed={timer.status === 'completed'}
      />

      {idle ? (
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setEditing((open) => !open);
          }}
          accessibilityRole="button"
          accessibilityLabel="Edit stages"
          accessibilityState={{ expanded: editing }}
          className="flex-row items-center justify-center gap-2 rounded-xl bg-white/10 py-3"
        >
          <Pencil size={16} color="#ffffff" />
          <Text className="text-base font-semibold text-white">
            {editing ? 'Done editing' : 'Edit stages'}
          </Text>
        </Pressable>
      ) : (
        <Text className="text-center text-xs text-white/40">
          Reset to edit stages
        </Text>
      )}

      {idle && editing ? (
        <PresetEditor
          stages={stages}
          onChangeStages={handleChangeStages}
          onSavePreset={handleSavePreset}
        />
      ) : null}
    </Screen>
  );
}
