import {
  type MatCalculatorState,
  type UseMatCalculatorReturn,
} from '@dorkroom/logic';
import { Text, View } from 'react-native';
import { LabeledTextField } from '@/components/labeled-text-field';

interface BordersSectionProps {
  values: MatCalculatorState;
  set: UseMatCalculatorReturn['set'];
}

const fields = [
  ['Top', 'borderTop'],
  ['Bottom', 'borderBottom'],
  ['Left', 'borderLeft'],
  ['Right', 'borderRight'],
] as const;

export function BordersSection({ values, set }: BordersSectionProps) {
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-3">
        {fields.map(([label, key]) => (
          <View key={key} className="min-w-[45%] flex-1">
            <LabeledTextField
              label={`${label} (in)`}
              value={values[key]}
              onChangeText={(value) => set(key, value)}
              keyboardType="default"
            />
          </View>
        ))}
      </View>
      <Text className="text-xs text-white/50">
        Accepts decimals, fractions, and mixed fractions.
      </Text>
    </View>
  );
}
