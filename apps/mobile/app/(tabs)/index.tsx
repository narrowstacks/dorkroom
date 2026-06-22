import { useBorderCalculator } from '@dorkroom/logic';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BorderPreview } from '@/components/border/border-preview';
import {
  formatInches,
  formatPosition,
  formatPreviewCaption,
} from '@/components/border/format';
import { NavRow } from '@/components/border/nav-row';
import { BorderSizeSection } from '@/components/border/sections/border-size-section';
import { PaperImageSection } from '@/components/border/sections/paper-image-section';
import { PositionSection } from '@/components/border/sections/position-section';
import { WarningsCard } from '@/components/border/warnings-card';
import { BottomSheet } from '@/components/bottom-sheet';
import { GlassCard } from '@/components/glass-card';
import { Screen } from '@/components/screen';

type SheetId = 'paperImage' | 'borderSize' | 'position' | null;

function ToggleButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`flex-1 items-center rounded-xl py-3 ${active ? 'bg-rose-600' : 'bg-white/10'}`}
    >
      <Text className={active ? 'font-semibold text-white' : 'text-white/70'}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function BorderScreen() {
  const calc = useBorderCalculator();
  const { calculation } = calc;
  const [sheet, setSheet] = useState<SheetId>(null);
  const closeSheet = () => setSheet(null);

  const paperLabel = `${calculation.paperWidth}×${calculation.paperHeight}`;
  const warnings = [
    calc.bladeWarning,
    calc.minBorderWarning,
    calc.paperSizeWarning,
    calc.offsetWarning,
  ].filter((w): w is string => Boolean(w));

  return (
    <Screen>
      <GlassCard className="gap-4">
        <BorderPreview
          calculation={calculation}
          showBlades={calc.showBlades}
          showBladeReadings={calc.showBladeReadings}
        />
        <Text className="text-center text-sm text-white/60">
          {formatPreviewCaption(calculation, paperLabel)}
        </Text>
      </GlassCard>

      <WarningsCard warnings={warnings} />

      <GlassCard className="gap-3">
        <NavRow
          label="Paper & image size"
          value={`${calc.aspectRatio} on ${paperLabel}`}
          onPress={() => setSheet('paperImage')}
        />
        <NavRow
          label="Border size"
          value={formatInches(calc.minBorder)}
          onPress={() => setSheet('borderSize')}
        />
        <NavRow
          label="Position & offsets"
          value={formatPosition(
            calc.enableOffset,
            calc.horizontalOffset,
            calc.verticalOffset
          )}
          onPress={() => setSheet('position')}
        />
        <View className="flex-row gap-3">
          <ToggleButton
            label={calc.showBlades ? 'Hide blades' : 'Show blades'}
            active={calc.showBlades}
            onPress={() => calc.setShowBlades(!calc.showBlades)}
          />
          <ToggleButton
            label={calc.showBladeReadings ? 'Hide readings' : 'Show readings'}
            active={calc.showBladeReadings}
            onPress={() => calc.setShowBladeReadings(!calc.showBladeReadings)}
          />
        </View>
      </GlassCard>

      <Pressable
        onPress={calc.resetToDefaults}
        accessibilityRole="button"
        className="items-center rounded-full border border-white/15 py-3"
      >
        <Text className="font-semibold text-rose-400">Reset to defaults</Text>
      </Pressable>

      <BottomSheet
        visible={sheet === 'paperImage'}
        title="Paper & image size"
        onClose={closeSheet}
      >
        <PaperImageSection
          aspectRatio={calc.aspectRatio}
          paperSize={calc.paperSize}
          isLandscape={calc.isLandscape}
          isRatioFlipped={calc.isRatioFlipped}
          onAspectChange={calc.setAspectRatio}
          onPaperChange={calc.setPaperSize}
          onToggleLandscape={calc.setIsLandscape}
          onToggleFlip={calc.setIsRatioFlipped}
        />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'borderSize'}
        title="Border size"
        onClose={closeSheet}
      >
        <BorderSizeSection
          minBorder={calc.minBorder}
          onChange={calc.setMinBorderSlider}
        />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'position'}
        title="Position & offsets"
        onClose={closeSheet}
      >
        <PositionSection
          enableOffset={calc.enableOffset}
          horizontalOffset={calc.horizontalOffset}
          verticalOffset={calc.verticalOffset}
          ignoreMinBorder={calc.ignoreMinBorder}
          onToggleOffset={calc.setEnableOffset}
          onHorizontalChange={calc.setHorizontalOffsetSlider}
          onVerticalChange={calc.setVerticalOffsetSlider}
          onToggleIgnoreMinBorder={calc.setIgnoreMinBorder}
        />
      </BottomSheet>
    </Screen>
  );
}
