import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Countdown } from '@/components/development/timer/countdown';
import { PresetEditor } from '@/components/development/timer/preset-editor';
import { SaveToRollCard } from '@/components/development/timer/save-to-roll-card';
import { StageList } from '@/components/development/timer/stage-list';
import { TimerControls } from '@/components/development/timer/timer-controls';
import { useTimer } from '@/components/development/timer/use-timer';
import { PresetChipRow } from '@/components/preset-chip-row';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { LINK_OPENED_PARAM, linkSearchFromParams } from '@/lib/link-prefill';
import {
  TIMER_EXPOSURE_PARAM,
  TIMER_LABEL_PARAM,
  TIMER_START_PARAM,
} from '@/lib/next-step';
import { totalRemainingSeconds } from '@/lib/timer/engine';
import {
  exposureSecondsFromParam,
  exposureStages,
  isNewTimerOpening,
  lastHandledExposureKey,
  lastHandledExposureOpened,
  markExposureLinkHandled,
  shouldApplyExposureLink,
  timerOpeningKey,
} from '@/lib/timer/exposure-link';
import {
  getLastRun,
  isStartLast,
  restoredPresetId,
  startLastDecision,
} from '@/lib/timer/last-run';
import { consumeTimerPrefill } from '@/lib/timer/prefill';
import { stagesFromCombination } from '@/lib/timer/presets';
import { addPreset, listPresets } from '@/lib/timer/presets-storage';
import { isRunActive, timerStore } from '@/lib/timer/timer-store';
import type { TimerStage } from '@/lib/timer/types';

/**
 * Standalone multi-stage film-processing timer. The run itself lives in the
 * module-level timer store (lib/timer/timer-store.ts), so leaving this screen
 * and coming back shows the same run, and `TimerRunEffects` (mounted at the
 * root) keeps the clock, cues, alerts and keep-awake going meanwhile. Presets
 * persist via MMKV.
 */
export function TimerScreen() {
  const [presets, setPresets] = useState(() => listPresets());
  const [editing, setEditing] = useState(false);

  const timer = useTimer();
  const {
    load: applyStages,
    setSelectedPresetId,
    selectedPresetId,
    stages,
    start: startRun,
  } = timer;
  const idle = timer.status === 'idle';

  // One-shot recipe prefill: if the user arrived via a recipe's "Start Process
  // Timer", seed the stages from that recipe (dev time/temp/agitation + the
  // standard stop/fix/wash tail) and clear the preset selection. Runs once on
  // mount; the standalone entry (nothing queued) keeps whatever the store
  // holds. A queued recipe never replaces a run in progress: it is dropped.
  const prefillApplied = useRef(false);
  // A queued recipe wins over an exposure link that arrived with it.
  const recipeQueued = useRef(false);
  useEffect(() => {
    if (prefillApplied.current) return;
    prefillApplied.current = true;
    const prefill = consumeTimerPrefill();
    recipeQueued.current = prefill !== null;
    const runActive = isRunActive(timerStore.getSnapshot().timer);
    if (prefill && !runActive) {
      // eslint-disable-next-line react-doctor/no-chain-state-updates -- one-shot mount effect consuming an external module-level queue (consumeTimerPrefill destructively reads-and-clears it), not a state reacting to another state
      setSelectedPresetId('');
      // eslint-disable-next-line react-doctor/no-derived-state -- same one-shot external-system sync; stagesFromCombination(prefill) reads a destructive module singleton, not props/state already available during render, so it can't be computed inline or via useMemo
      applyStages(stagesFromCombination(prefill));
    }
  }, [applyStages, setSelectedPresetId]);

  const search = linkSearchFromParams(useLocalSearchParams());
  const exposureParam = search[TIMER_EXPOSURE_PARAM];
  const labelParam = search[TIMER_LABEL_PARAM];
  const startParam = search[TIMER_START_PARAM];
  const openedAt = search[LINK_OPENED_PARAM];
  // One-shot timer links, once per opening (its `at`, else its value), never
  // over a run in progress:
  // - `?exposure=<seconds>&label=&at=` (Reciprocity's "Start a ... exposure"):
  //   load a single stage. It does not start: the user presses Start.
  // - `?start=last&at=` (the Control Center "Start last timer"): load the last
  //   started run's stages and START it, through the Start button's own path
  //   (notification permission, Live Activity). With a run going it just shows
  //   it; with no last run the timer stays as it is.
  // The screen may already be mounted when a new link arrives, so this follows
  // the params rather than mounting once.
  useEffect(() => {
    const seconds = exposureSecondsFromParam(exposureParam);
    // A run that ended while the app was suspended must not count as active.
    timerStore.sync();
    const key = timerOpeningKey(openedAt, exposureParam, startParam);
    const now = Date.now();
    const opening = {
      key,
      lastAppliedKey: lastHandledExposureKey(),
      lastOpened: lastHandledExposureOpened(),
      now,
    };
    const runActive = isRunActive(timerStore.getSnapshot().timer);
    const isNewOpening = isNewTimerOpening(opening);
    const apply = shouldApplyExposureLink({ ...opening, runActive, seconds });
    // Handled either way, so a link dropped for a run (or a recipe) does not
    // load later, and a re-mount with the same params never re-applies it.
    markExposureLinkHandled(key, now);
    if (recipeQueued.current) {
      recipeQueued.current = false;
      return;
    }
    if (apply) {
      setSelectedPresetId('');
      applyStages(exposureStages(seconds, labelParam));
      return;
    }
    if (exposureParam !== undefined || !isStartLast(startParam)) return;
    const lastRun = getLastRun();
    const decision = startLastDecision({
      isNewOpening,
      runActive,
      hasLastRun: lastRun !== null,
    });
    if (decision !== 'start' || lastRun === null) return;
    setSelectedPresetId(restoredPresetId(lastRun, listPresets()));
    applyStages(lastRun.stages);
    startRun();
  }, [
    exposureParam,
    labelParam,
    startParam,
    openedAt,
    applyStages,
    setSelectedPresetId,
    startRun,
  ]);

  const handleSelectPreset = useCallback(
    (id: string) => {
      const preset = presets.find((p) => p.id === id);
      if (!preset) return;
      setSelectedPresetId(id);
      setEditing(false);
      applyStages(preset.stages);
    },
    [presets, applyStages, setSelectedPresetId]
  );

  const handleChangeStages = useCallback(
    (next: TimerStage[]) => {
      // Editing diverges from the selected preset until it's saved again.
      setSelectedPresetId('');
      applyStages(next);
    },
    [applyStages, setSelectedPresetId]
  );

  const handleSavePreset = useCallback(
    (name: string) => {
      const created = addPreset(name, stages);
      setPresets(listPresets());
      setSelectedPresetId(created.id);
    },
    [stages, setSelectedPresetId]
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
  const totalLeft = totalRemainingSeconds({
    stages: timer.stages,
    currentStageIndex: timer.currentStageIndex,
    remainingSeconds: timer.remainingSeconds,
    status: timer.status,
  });
  const nextStage = timer.stages[timer.currentStageIndex + 1];

  return (
    <Screen>
      <View className="gap-2">
        <SectionLabel>Preset</SectionLabel>
        <PresetChipRow
          accent="teal"
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
        totalRemainingSeconds={totalLeft}
        nextStage={nextStage}
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

      <SaveToRollCard />

      {timer.alertsDenied && !idle ? (
        <Text className="text-center text-xs text-ink-50">
          Notifications are off, so there are no alerts while Dorkroom is in the
          background. Turn them on in the iOS Settings app.
        </Text>
      ) : null}

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
          className="flex-row items-center justify-center gap-2 rounded-xl border-hw border-line bg-surface py-3"
        >
          <Pencil size={16} color="#ffffff" />
          <Text className="text-base font-semibold text-white">
            {editing ? 'Done editing' : 'Edit stages'}
          </Text>
        </Pressable>
      ) : (
        <Text className="text-center text-xs text-ink-40">
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
