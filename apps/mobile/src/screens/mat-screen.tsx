import { MAT_CALCULATOR_DEFAULTS, useMatCalculator } from '@dorkroom/logic';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { GlassCard } from '@/components/glass-card';
import { ArtworkBestFitSection } from '@/components/mat/artwork-best-fit-section';
import { BordersSection } from '@/components/mat/borders-section';
import {
  buildMatWarnings,
  formatArtworkSummary,
  formatBorderSummary,
  formatMatPair,
} from '@/components/mat/format';
import { MatPreview } from '@/components/mat/mat-preview';
import { MatResults } from '@/components/mat/mat-results';
import { OuterMatSection } from '@/components/mat/outer-mat-section';
import { NavRow } from '@/components/nav-row';
import { Screen } from '@/components/screen';
import { WarningsCard } from '@/components/warnings-card';

type SheetId = 'outer' | 'borders' | 'artwork' | null;

export function MatScreen() {
  const calc = useMatCalculator();
  const [sheet, setSheet] = useState<SheetId>(null);
  const closeSheet = () => setSheet(null);
  const warnings = buildMatWarnings(calc);

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
    <Screen>
      <GlassCard className="gap-4">
        <MatPreview
          valid={calc.valid}
          revealMode={calc.revealMode}
          ow={calc.ow}
          oh={calc.oh}
          bt={calc.bt}
          bb={calc.bb}
          bl={calc.bl}
          br={calc.br}
          aw={calc.aw}
          ah={calc.ah}
          windowW={calc.windowW}
          windowH={calc.windowH}
          fmt={calc.fmt}
        />
        <Text className="text-center text-sm text-white/60">
          Window {calc.fmt(calc.windowW)} × {calc.fmt(calc.windowH)}
        </Text>
      </GlassCard>

      <WarningsCard warnings={warnings} />

      <GlassCard className="gap-3">
        <NavRow
          label="Outer mat"
          value={formatMatPair(calc.values.outerW, calc.values.outerH)}
          onPress={() => setSheet('outer')}
        />
        <NavRow
          label="Borders"
          value={formatBorderSummary(calc.values)}
          onPress={() => setSheet('borders')}
        />
        <NavRow
          label="Artwork & best fit"
          value={formatArtworkSummary(calc.values)}
          onPress={() => setSheet('artwork')}
        />
      </GlassCard>

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
        className="items-center rounded-full border border-white/15 py-3"
      >
        <Text className="font-semibold text-rose-400">Reset to defaults</Text>
      </Pressable>

      <BottomSheet
        visible={sheet === 'outer'}
        title="Outer mat"
        onClose={closeSheet}
        showScrim={false}
      >
        <OuterMatSection values={calc.values} set={calc.set} />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'borders'}
        title="Borders"
        onClose={closeSheet}
        showScrim={false}
      >
        <BordersSection values={calc.values} set={calc.set} />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'artwork'}
        title="Artwork & best fit"
        onClose={closeSheet}
        showScrim={false}
      >
        <ArtworkBestFitSection
          values={calc.values}
          set={calc.set}
          applyBestFit={calc.applyBestFit}
          bestFitPreview={calc.bestFitPreview}
        />
      </BottomSheet>
    </Screen>
  );
}
