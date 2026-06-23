import { useResizeCalculator } from '@dorkroom/logic';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { AspectPreview } from '@/components/resize/aspect-preview';
import { ResultCard } from '@/components/result-card';
import { ResultRow } from '@/components/result-row';
import { ResultStat } from '@/components/result-stat';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { SegmentedControl } from '@/components/segmented-control';
import { ShareButton } from '@/components/share-button';
import { buildResizeShare } from '@/lib/share-text';

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
    originalHeight,
    setOriginalHeight,
    newHeight,
    setNewHeight,
    originalTime,
    setOriginalTime,
    newTime,
    stopsDifference,
    isAspectRatioMatched,
  } = useResizeCalculator();

  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const num = (s: string) => Number.parseFloat(s) || 0;

  const stopsHelper = (() => {
    const diff = Number.parseFloat(stopsDifference);
    if (!Number.isFinite(diff) || diff === 0) return 'same size';
    return diff > 0 ? 'larger — add exposure' : 'smaller — remove exposure';
  })();

  return (
    <Screen>
      <GlassCard className="gap-4">
        <SegmentedControl
          options={[
            { label: 'Print size', value: false },
            { label: 'Enlarger height', value: true },
          ]}
          value={isEnlargerHeightMode}
          onChange={setIsEnlargerHeightMode}
        />

        {isEnlargerHeightMode ? (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <LabeledTextField
                label="Orig. height"
                value={originalHeight}
                onChangeText={setOriginalHeight}
                keyboardType="decimal-pad"
              />
            </View>
            <View className="flex-1">
              <LabeledTextField
                label="New height"
                value={newHeight}
                onChangeText={setNewHeight}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        ) : (
          <>
            <View className="gap-2">
              <SectionLabel>Units</SectionLabel>
              <SegmentedControl
                options={[
                  { label: 'Inches', value: 'in' },
                  { label: 'Centimeters', value: 'cm' },
                ]}
                value={unit}
                onChange={setUnit}
              />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <LabeledTextField
                  label={`Orig. width (${unit})`}
                  value={originalWidth}
                  onChangeText={setOriginalWidth}
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="flex-1">
                <LabeledTextField
                  label={`Orig. length (${unit})`}
                  value={originalLength}
                  onChangeText={setOriginalLength}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <LabeledTextField
                  label={`New width (${unit})`}
                  value={newWidth}
                  onChangeText={setNewWidth}
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="flex-1">
                <LabeledTextField
                  label={`New length (${unit})`}
                  value={newLength}
                  onChangeText={setNewLength}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <AspectPreview
              origW={num(originalWidth)}
              origL={num(originalLength)}
              newW={num(newWidth)}
              newL={num(newLength)}
            />
          </>
        )}

        <LabeledTextField
          label="Original time (s)"
          value={originalTime}
          onChangeText={setOriginalTime}
          keyboardType="decimal-pad"
        />
      </GlassCard>

      {newTime ? (
        <ResultCard accent="teal" className="gap-3">
          <ResultStat accent="teal" label="New time" value={`${newTime}s`} />
          <ResultRow label="Stops difference" value={stopsDifference} />
          <Text className="text-sm text-white/50">{stopsHelper}</Text>
          {!isAspectRatioMatched && !isEnlargerHeightMode ? (
            <Text className="text-amber-500">Aspect ratios do not match.</Text>
          ) : null}
          <ShareButton
            message={buildResizeShare({ newTime, stopsDifference })}
          />
        </ResultCard>
      ) : (
        <GlassCard>
          <Text className="text-white/60">Enter dimensions and a time.</Text>
        </GlassCard>
      )}
    </Screen>
  );
}
