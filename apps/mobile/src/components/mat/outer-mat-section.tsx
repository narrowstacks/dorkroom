import {
  MAT_PRESETS,
  type MatCalculatorState,
  parseMatInput,
  type UseMatCalculatorReturn,
} from '@dorkroom/logic';
import { View } from 'react-native';
import { LabeledTextField } from '@/components/labeled-text-field';
import { PresetChipRow } from '@/components/preset-chip-row';
import { SectionLabel } from '@/components/section-label';
import { FlipButton } from './flip-button';

interface OuterMatSectionProps {
  values: MatCalculatorState;
  set: UseMatCalculatorReturn['set'];
}

export function OuterMatSection({ values, set }: OuterMatSectionProps) {
  const activePreset = MAT_PRESETS.find(
    (preset) =>
      parseMatInput(values.outerW) === preset.w &&
      parseMatInput(values.outerH) === preset.h
  );

  return (
    <View className="gap-4">
      <View className="flex-row items-end gap-3">
        <View className="flex-1">
          <LabeledTextField
            label="Width (in)"
            value={values.outerW}
            onChangeText={(value) => set('outerW', value)}
            keyboardType="default"
          />
        </View>
        <View className="flex-1">
          <LabeledTextField
            label="Height (in)"
            value={values.outerH}
            onChangeText={(value) => set('outerH', value)}
            keyboardType="default"
          />
        </View>
        <FlipButton
          accessibilityLabel="Flip outer mat orientation"
          onPress={() => {
            set('outerW', values.outerH);
            set('outerH', values.outerW);
          }}
        />
      </View>
      <SectionLabel>Common sizes</SectionLabel>
      <PresetChipRow
        accent="cyan"
        options={MAT_PRESETS.map((preset) => ({
          label: preset.label,
          value: `${preset.w}x${preset.h}`,
        }))}
        value={activePreset ? `${activePreset.w}x${activePreset.h}` : undefined}
        onSelect={(key) => {
          const preset = MAT_PRESETS.find(
            (candidate) => `${candidate.w}x${candidate.h}` === key
          );
          if (!preset) return;
          set('outerW', String(preset.w));
          set('outerH', String(preset.h));
        }}
      />
    </View>
  );
}
