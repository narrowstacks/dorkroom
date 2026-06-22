import { useResizeCalculator } from '@dorkroom/logic';
import { Switch, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { ResultRow } from '@/components/result-row';
import { Screen } from '@/components/screen';

export default function ResizeScreen() {
  const {
    isEnlargerHeightMode,
    setIsEnlargerHeightMode,
    originalWidth,
    setOriginalWidth,
    originalLength,
    setOriginalLength,
    newWidth,
    setNewWidth,
    newLength,
    setNewLength,
    originalTime,
    setOriginalTime,
    newTime,
    stopsDifference,
    isAspectRatioMatched,
  } = useResizeCalculator();

  return (
    <Screen>
      <Text className="text-2xl font-bold text-white">Resize</Text>

      <GlassCard className="gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-white/80">Enlarger height mode</Text>
          <Switch
            value={isEnlargerHeightMode}
            onValueChange={setIsEnlargerHeightMode}
          />
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <LabeledTextField
              label="Orig. width"
              value={originalWidth}
              onChangeText={setOriginalWidth}
              keyboardType="decimal-pad"
            />
          </View>
          <View className="flex-1">
            <LabeledTextField
              label="Orig. length"
              value={originalLength}
              onChangeText={setOriginalLength}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <LabeledTextField
              label="New width"
              value={newWidth}
              onChangeText={setNewWidth}
              keyboardType="decimal-pad"
            />
          </View>
          <View className="flex-1">
            <LabeledTextField
              label="New length"
              value={newLength}
              onChangeText={setNewLength}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <LabeledTextField
          label="Original time (s)"
          value={originalTime}
          onChangeText={setOriginalTime}
          keyboardType="decimal-pad"
        />
      </GlassCard>

      <GlassCard>
        {newTime ? (
          <>
            <ResultRow label="New time" value={`${newTime}s`} />
            <ResultRow label="Stops difference" value={stopsDifference} />
            {!isAspectRatioMatched && !isEnlargerHeightMode ? (
              <Text className="mt-2 text-amber-500">
                Aspect ratios do not match.
              </Text>
            ) : null}
          </>
        ) : (
          <Text className="text-white/60">Enter dimensions and a time.</Text>
        )}
      </GlassCard>
    </Screen>
  );
}
