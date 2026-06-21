import { useExposureCalculator } from '@dorkroom/logic';
import { Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { ResultRow } from '@/components/result-row';
import { Screen } from '@/components/screen';

export default function ExposureScreen() {
  const {
    originalTime,
    setOriginalTime,
    stops,
    setStops,
    adjustStops,
    calculation,
    formatTime,
  } = useExposureCalculator();

  return (
    <Screen>
      <Text className="text-2xl font-bold text-white">Exposure</Text>

      <GlassCard className="gap-4">
        <LabeledTextField
          label="Original time (s)"
          value={originalTime}
          onChangeText={setOriginalTime}
          keyboardType="decimal-pad"
        />
        <LabeledTextField
          label="Stops"
          value={stops}
          onChangeText={setStops}
          keyboardType="default"
        />
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => adjustStops(-1 / 3)}
            className="flex-1 items-center rounded-xl bg-white/10 py-3"
          >
            <Text className="text-white">- ⅓</Text>
          </Pressable>
          <Pressable
            onPress={() => adjustStops(1 / 3)}
            className="flex-1 items-center rounded-xl bg-white/10 py-3"
          >
            <Text className="text-white">+ ⅓</Text>
          </Pressable>
        </View>
      </GlassCard>

      <GlassCard>
        {calculation ? (
          <>
            <ResultRow
              label="New time"
              value={formatTime(calculation.newTimeValue)}
            />
            <ResultRow
              label="Added time"
              value={formatTime(Math.abs(calculation.addedTime))}
            />
            <ResultRow
              label="Change"
              value={`${calculation.percentageIncrease.toFixed(0)}%`}
            />
          </>
        ) : (
          <Text className="text-white/60">Enter a valid time and stops.</Text>
        )}
      </GlassCard>
    </Screen>
  );
}
