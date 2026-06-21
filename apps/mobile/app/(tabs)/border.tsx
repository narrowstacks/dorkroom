import {
  ASPECT_RATIOS,
  PAPER_SIZES,
  useBorderCalculator,
} from '@dorkroom/logic';
import { Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { OptionRow } from '@/components/option-row';
import { ResultRow } from '@/components/result-row';
import { Screen } from '@/components/screen';

const MIN_BORDER_STEPS = [0.25, 0.5, 0.75, 1, 1.5];

export default function BorderScreen() {
  const {
    aspectRatio,
    setAspectRatio,
    paperSize,
    setPaperSize,
    minBorder,
    setMinBorderSlider,
    calculation,
  } = useBorderCalculator();

  const aspectOptions = ASPECT_RATIOS.map((r) => ({
    label: r.label,
    value: r.value,
  }));
  const paperOptions = PAPER_SIZES.map((p) => ({
    label: p.label,
    value: p.value,
  }));

  return (
    <Screen>
      <Text className="text-2xl font-bold text-white">Border</Text>

      <GlassCard className="gap-4">
        <OptionRow
          label="Aspect ratio"
          options={aspectOptions}
          value={aspectRatio}
          onChange={setAspectRatio}
        />
        <OptionRow
          label="Paper size"
          options={paperOptions}
          value={paperSize}
          onChange={setPaperSize}
        />
        <View className="gap-2">
          <Text className="text-sm text-white/60">
            Min border: {minBorder}"
          </Text>
          <View className="flex-row gap-2">
            {MIN_BORDER_STEPS.map((step) => (
              <Pressable
                key={step}
                onPress={() => setMinBorderSlider(step)}
                className={`rounded-full px-3 py-2 ${
                  minBorder === step ? 'bg-rose-600' : 'bg-white/10'
                }`}
              >
                <Text className="text-white/80">{step}"</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </GlassCard>

      <GlassCard>
        <ResultRow
          label="Print size"
          value={`${calculation.printWidth.toFixed(2)}" × ${calculation.printHeight.toFixed(2)}"`}
        />
        <ResultRow
          label="Left / Right border"
          value={`${calculation.leftBorder.toFixed(2)}" / ${calculation.rightBorder.toFixed(2)}"`}
        />
        <ResultRow
          label="Top / Bottom border"
          value={`${calculation.topBorder.toFixed(2)}" / ${calculation.bottomBorder.toFixed(2)}"`}
        />
      </GlassCard>
    </Screen>
  );
}
