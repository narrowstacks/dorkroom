import {
  type MatCalculatorState,
  toFractionInput,
  type UseMatCalculatorReturn,
} from '@dorkroom/logic';
import { Pressable, Text, View } from 'react-native';
import { LabeledTextField } from '@/components/labeled-text-field';
import { ToggleRow } from '@/components/toggle-row';
import { ACCENT, selectionTint } from '@/theme/accents';
import { FlipButton } from './flip-button';

interface ArtworkBestFitSectionProps {
  values: MatCalculatorState;
  set: UseMatCalculatorReturn['set'];
  applyBestFit: UseMatCalculatorReturn['applyBestFit'];
  bestFitPreview: UseMatCalculatorReturn['bestFitPreview'];
}

export function ArtworkBestFitSection({
  values,
  set,
  applyBestFit,
  bestFitPreview,
}: ArtworkBestFitSectionProps) {
  const tint = selectionTint('cyan');

  return (
    <View className="gap-4">
      <View className="flex-row items-end gap-3">
        <View className="flex-1">
          <LabeledTextField
            label="Art width (in)"
            value={values.artW}
            onChangeText={(value) => set('artW', value)}
            keyboardType="default"
          />
        </View>
        <View className="flex-1">
          <LabeledTextField
            label="Art height (in)"
            value={values.artH}
            onChangeText={(value) => set('artH', value)}
            keyboardType="default"
          />
        </View>
        <FlipButton
          accessibilityLabel="Flip artwork orientation"
          onPress={() => {
            set('artW', values.artH);
            set('artH', values.artW);
          }}
        />
      </View>
      <LabeledTextField
        label="Reveal per side (in)"
        value={values.reveal}
        onChangeText={(value) => set('reveal', value)}
        keyboardType="default"
      />
      <ToggleRow
        label="Bottom-weight optical center"
        value={values.bottomWeight}
        onChange={(value) => set('bottomWeight', value)}
      />
      {bestFitPreview ? (
        <Text className="text-xs text-white/50">
          Proposed: {toFractionInput(bestFitPreview.top)} T ·{' '}
          {toFractionInput(bestFitPreview.bottom)} B ·{' '}
          {toFractionInput(bestFitPreview.left)} L ·{' '}
          {toFractionInput(bestFitPreview.right)} R
        </Text>
      ) : null}
      <Pressable
        onPress={applyBestFit}
        disabled={!bestFitPreview}
        accessibilityRole="button"
        accessibilityLabel="Apply best fit borders"
        accessibilityState={{ disabled: !bestFitPreview }}
        className="min-h-12 items-center justify-center rounded-xl bg-white/10 px-4 py-3"
        style={
          bestFitPreview
            ? {
                backgroundColor: tint.backgroundColor,
                borderColor: tint.borderColor,
                borderWidth: 1,
              }
            : undefined
        }
      >
        <Text
          className={bestFitPreview ? undefined : 'text-white/40'}
          style={
            bestFitPreview
              ? { color: ACCENT.cyan, fontWeight: '600' }
              : undefined
          }
        >
          Apply best fit
        </Text>
      </Pressable>
    </View>
  );
}
