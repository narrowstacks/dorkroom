import * as Haptics from 'expo-haptics';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { PresetChipRow } from '@/components/preset-chip-row';
import { SectionLabel } from '@/components/section-label';
import { Stepper } from '@/components/stepper';
import type { StageKind, TimerStage } from '@/lib/timer/types';
import { stageKindLabel } from './format';
import {
  appendStage,
  durationFromParts,
  durationToParts,
  moveStage,
  removeStageAt,
  updateStageAt,
} from './stage-edits';

const KIND_OPTIONS: { label: string; value: StageKind }[] = (
  ['dev', 'stop', 'fix', 'wash', 'custom'] as const
).map((kind) => ({ label: stageKindLabel(kind), value: kind }));

interface PresetEditorProps {
  stages: TimerStage[];
  onChangeStages: (stages: TimerStage[]) => void;
  /** Persist the current stages as a named user preset. */
  onSavePreset: (name: string) => void;
}

/** Add/remove/reorder stages and edit each stage's fields, plus save as a preset. */
export function PresetEditor({
  stages,
  onChangeStages,
  onSavePreset,
}: PresetEditorProps) {
  const [presetName, setPresetName] = useState('');

  const patch = (index: number, fields: Partial<TimerStage>) =>
    onChangeStages(updateStageAt(stages, index, fields));

  const handleSave = () => {
    const name = presetName.trim();
    if (!name || stages.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSavePreset(name);
    setPresetName('');
  };

  return (
    <View className="gap-3">
      <SectionLabel>Edit stages</SectionLabel>

      {stages.map((stage, index) => {
        const { minutes, seconds } = durationToParts(stage.durationSeconds);
        return (
          <GlassCard key={stage.id} className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-white/80">
                Stage {index + 1}
              </Text>
              <View className="flex-row gap-1">
                <IconButton
                  icon={ChevronUp}
                  label="Move up"
                  disabled={index === 0}
                  onPress={() => onChangeStages(moveStage(stages, index, -1))}
                />
                <IconButton
                  icon={ChevronDown}
                  label="Move down"
                  disabled={index === stages.length - 1}
                  onPress={() => onChangeStages(moveStage(stages, index, 1))}
                />
                <IconButton
                  icon={Trash2}
                  label="Remove stage"
                  onPress={() => onChangeStages(removeStageAt(stages, index))}
                />
              </View>
            </View>

            <LabeledTextField
              label="Name"
              value={stage.name}
              onChangeText={(name) => patch(index, { name })}
              placeholder={stageKindLabel(stage.kind)}
            />

            <PresetChipRow
              accent="green"
              options={KIND_OPTIONS}
              value={stage.kind}
              onSelect={(kind) => patch(index, { kind })}
            />

            <View className="flex-row gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-sm text-white/60">Minutes</Text>
                <Stepper
                  value={String(minutes)}
                  onDecrement={() =>
                    patch(index, {
                      durationSeconds: durationFromParts(minutes - 1, seconds),
                    })
                  }
                  onIncrement={() =>
                    patch(index, {
                      durationSeconds: durationFromParts(minutes + 1, seconds),
                    })
                  }
                />
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-sm text-white/60">Seconds</Text>
                <Stepper
                  value={String(seconds)}
                  onDecrement={() =>
                    patch(index, {
                      durationSeconds: durationFromParts(minutes, seconds - 5),
                    })
                  }
                  onIncrement={() =>
                    patch(index, {
                      durationSeconds: durationFromParts(minutes, seconds + 5),
                    })
                  }
                />
              </View>
            </View>

            <LabeledTextField
              label="Temperature °F (optional)"
              value={
                stage.temperatureF == null ? '' : String(stage.temperatureF)
              }
              keyboardType="numeric"
              onChangeText={(text) => {
                const trimmed = text.trim();
                const parsed = Number.parseFloat(trimmed);
                patch(index, {
                  temperatureF:
                    trimmed === '' || Number.isNaN(parsed) ? null : parsed,
                });
              }}
              placeholder="—"
            />

            <LabeledTextField
              label="Agitation (optional)"
              value={stage.agitation ?? ''}
              onChangeText={(text) =>
                patch(index, { agitation: text.trim() === '' ? null : text })
              }
              placeholder="e.g. 10s every minute"
            />
          </GlassCard>
        );
      })}

      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          onChangeStages(appendStage(stages));
        }}
        accessibilityRole="button"
        accessibilityLabel="Add stage"
        className="flex-row items-center justify-center gap-2 rounded-xl bg-white/10 py-3"
      >
        <Plus size={18} color="#ffffff" />
        <Text className="text-base font-semibold text-white">Add stage</Text>
      </Pressable>

      <GlassCard className="gap-3">
        <LabeledTextField
          label="Save as preset"
          value={presetName}
          onChangeText={setPresetName}
          placeholder="Preset name"
          onSubmitEditing={handleSave}
        />
        <Pressable
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Save preset"
          accessibilityState={{
            disabled: presetName.trim() === '' || stages.length === 0,
          }}
          className={`items-center rounded-xl bg-rose-600 py-3 ${
            presetName.trim() === '' || stages.length === 0 ? 'opacity-30' : ''
          }`}
        >
          <Text className="text-base font-semibold text-white">
            Save preset
          </Text>
        </Pressable>
      </GlassCard>
    </View>
  );
}

function IconButton({
  icon: Icon,
  label,
  onPress,
  disabled,
}: {
  icon: typeof ChevronUp;
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
      className={`h-9 w-9 items-center justify-center rounded-lg bg-white/10 ${disabled ? 'opacity-30' : ''}`}
    >
      <Icon size={18} color="#ffffff" />
    </Pressable>
  );
}
