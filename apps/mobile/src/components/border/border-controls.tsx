import type {
  MeasurementUnit,
  useStandaloneBorderCalculator,
} from '@dorkroom/logic';
import { Pressable, Text, View } from 'react-native';
import { WarningsCard } from '@/components/warnings-card';
import { formatBladeReadings } from './format';
import { PreviewToggles } from './preview-toggles';
import { BorderSizeSection } from './sections/border-size-section';
import {
  OrientationToggles,
  PaperImagePickers,
} from './sections/paper-image-section';
import { PositionSection } from './sections/position-section';

type BorderCalc = ReturnType<typeof useStandaloneBorderCalculator>;

interface BorderControlsProps {
  calc: BorderCalc;
  unit: MeasurementUnit;
}

/** The panel's main controls: the image's ratio, the paper, and the border. */
export function BorderCollapsedControls({ calc, unit }: BorderControlsProps) {
  const { calculation } = calc;
  return (
    <View className="gap-3">
      <PaperImagePickers
        aspectRatio={calc.aspectRatio}
        paperSize={calc.paperSize}
        onAspectChange={calc.setAspectRatio}
        onPaperChange={calc.setPaperSize}
      />
      <BorderSizeSection
        minBorder={calc.minBorder}
        unit={unit}
        paperWidth={calculation.paperWidth}
        paperHeight={calculation.paperHeight}
        onChange={calc.setMinBorderSlider}
      />
    </View>
  );
}

interface BorderExpandedProps extends BorderControlsProps {
  warnings: string[];
}

/** Everything else: the preview toggles, the blade readings as text, orientation, offsets, reset. */
export function BorderExpandedControls({
  calc,
  unit,
  warnings,
}: BorderExpandedProps) {
  return (
    <View className="gap-4">
      <PreviewToggles
        showBlades={calc.showBlades}
        showBladeReadings={calc.showBladeReadings}
        onBlades={calc.setShowBlades}
        onReadings={calc.setShowBladeReadings}
      />
      <WarningsCard warnings={warnings} />
      <Text className="text-sm text-ink-60">
        {formatBladeReadings(calc.calculation, unit)}
      </Text>
      <OrientationToggles
        isLandscape={calc.isLandscape}
        isRatioFlipped={calc.isRatioFlipped}
        onToggleLandscape={calc.setIsLandscape}
        onToggleFlip={calc.setIsRatioFlipped}
      />
      <PositionSection
        enableOffset={calc.enableOffset}
        horizontalOffset={calc.horizontalOffset}
        verticalOffset={calc.verticalOffset}
        unit={unit}
        ignoreMinBorder={calc.ignoreMinBorder}
        onToggleOffset={calc.setEnableOffset}
        onHorizontalChange={calc.setHorizontalOffsetSlider}
        onVerticalChange={calc.setVerticalOffsetSlider}
        onToggleIgnoreMinBorder={calc.setIgnoreMinBorder}
      />
      <Pressable
        onPress={calc.resetToDefaults}
        accessibilityRole="button"
        className="items-center rounded-full border border-edge-15 py-3 active:opacity-60"
      >
        <Text className="font-semibold text-ink-80">Reset to defaults</Text>
      </Pressable>
    </View>
  );
}
