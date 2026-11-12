import {
  MAT_CALCULATOR_DEFAULTS,
  type UseMatCalculatorReturn,
} from '@dorkroom/logic';
import { Pressable, Text, View } from 'react-native';
import { SectionLabel } from '@/components/section-label';
import { WarningsCard } from '@/components/warnings-card';
import { ArtworkBestFitSection } from './artwork-best-fit-section';
import { BordersSection } from './borders-section';
import { MatResults } from './mat-results';
import { CommonMatSizes, OuterMatFields } from './outer-mat-section';

interface MatControlsProps {
  calc: UseMatCalculatorReturn;
}

/** The panel's main controls: the outer mat's width and height, and a flip. */
export function MatCollapsedControls({ calc }: MatControlsProps) {
  return <OuterMatFields values={calc.values} set={calc.set} />;
}

interface MatExpandedProps extends MatControlsProps {
  warnings: string[];
}

/** Everything else: common sizes, the borders as fields, artwork, results, reset. */
export function MatExpandedControls({ calc, warnings }: MatExpandedProps) {
  const resetToDefaults = () => {
    calc.set('outerW', MAT_CALCULATOR_DEFAULTS.outerW);
    calc.set('outerH', MAT_CALCULATOR_DEFAULTS.outerH);
    calc.set('borderTop', MAT_CALCULATOR_DEFAULTS.borderTop);
    calc.set('borderBottom', MAT_CALCULATOR_DEFAULTS.borderBottom);
    calc.set('borderLeft', MAT_CALCULATOR_DEFAULTS.borderLeft);
    calc.set('borderRight', MAT_CALCULATOR_DEFAULTS.borderRight);
    calc.set('artW', MAT_CALCULATOR_DEFAULTS.artW);
    calc.set('artH', MAT_CALCULATOR_DEFAULTS.artH);
    calc.set('reveal', MAT_CALCULATOR_DEFAULTS.reveal);
    calc.set('bottomWeight', MAT_CALCULATOR_DEFAULTS.bottomWeight);
  };
  return (
    <View className="gap-5">
      <WarningsCard warnings={warnings} />
      <CommonMatSizes values={calc.values} set={calc.set} />
      <View className="gap-2">
        <SectionLabel>Borders</SectionLabel>
        <BordersSection values={calc.values} set={calc.set} />
      </View>
      <View className="gap-2">
        <SectionLabel>Artwork and best fit</SectionLabel>
        <ArtworkBestFitSection
          values={calc.values}
          set={calc.set}
          applyBestFit={calc.applyBestFit}
          bestFitPreview={calc.bestFitPreview}
        />
      </View>
      <MatResults
        fmt={calc.fmt}
        windowW={calc.windowW}
        windowH={calc.windowH}
        guideBarCuts={calc.guideBarCuts}
        dimensionRows={calc.dimensionRows}
        overlapLeft={calc.overlapLeft}
        overlapTop={calc.overlapTop}
      />
      <Pressable
        onPress={resetToDefaults}
        accessibilityRole="button"
        accessibilityLabel="Reset mat calculator to defaults"
        className="items-center rounded-full border border-edge-15 py-3 active:opacity-60"
      >
        <Text className="font-semibold text-ink-80">Reset to defaults</Text>
      </Pressable>
    </View>
  );
}
