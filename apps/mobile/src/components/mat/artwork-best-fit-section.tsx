import {
  matBorderToInput,
  type MatCalculatorState,
  type UseMatCalculatorReturn,
} from '@dorkroom/logic';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { LabeledTextField } from '@/components/labeled-text-field';
import { ToggleRow } from '@/components/toggle-row';
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
        <Text className="text-xs text-ink-50">
          Proposed: {matBorderToInput(bestFitPreview.top)} T ·{' '}
          {matBorderToInput(bestFitPreview.bottom)} B ·{' '}
          {matBorderToInput(bestFitPreview.left)} L ·{' '}
          {matBorderToInput(bestFitPreview.right)} R
        </Text>
      ) : null}
      <Button
        label="Apply best fit"
        variant={bestFitPreview ? 'tinted' : 'secondary'}
        onPress={applyBestFit}
        disabled={!bestFitPreview}
        accessibilityLabel="Apply best fit borders"
      />
    </View>
  );
}
