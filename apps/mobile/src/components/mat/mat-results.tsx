import type { UseMatCalculatorReturn } from '@dorkroom/logic';
import { Text, View } from 'react-native';
import { buildMobileMatDimensionRows } from '@/components/mat/format';
import { ResultCard } from '@/components/result-card';
import { ResultStat } from '@/components/result-stat';
import { Surface } from '@/components/surface';
import { useAccentColor } from '@/theme/use-phase-accent';

interface MatResultsProps {
  fmt: UseMatCalculatorReturn['fmt'];
  windowW: number;
  windowH: number;
  guideBarCuts: UseMatCalculatorReturn['guideBarCuts'];
  dimensionRows: UseMatCalculatorReturn['dimensionRows'];
  overlapLeft: number;
  overlapTop: number;
}

interface CutterReadingProps {
  label: string;
  value: string;
}

function CutterReading({ label, value }: CutterReadingProps) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-sm text-ink-60">{label}</Text>
      <Text className="shrink text-right text-sm font-semibold text-white">
        {value}
      </Text>
    </View>
  );
}

/** Cutter-ready guide-bar settings and the complete dimensional summary. */
export function MatResults({
  fmt,
  windowW,
  windowH,
  guideBarCuts,
  dimensionRows,
  overlapLeft,
  overlapTop,
}: MatResultsProps) {
  const rose = useAccentColor('rose');
  const mobileDimensionRows = buildMobileMatDimensionRows(
    dimensionRows,
    fmt,
    overlapLeft,
    overlapTop
  );

  return (
    <View className="gap-4">
      <ResultCard accent="rose" className="gap-3">
        <ResultStat
          accent="rose"
          label="Window opening"
          value={`${fmt(windowW)} × ${fmt(windowH)}`}
          helper="Sight opening, short point to short point"
        />
      </ResultCard>

      <Surface className="gap-3">
        <Text className="text-base font-semibold" style={{ color: rose }}>
          Cutter guide-bar settings
        </Text>
        {guideBarCuts.map((cut) => (
          <View
            key={cut.title}
            className="gap-2 rounded-xl border-hw border-line bg-surface-dim p-4"
          >
            <Text className="text-sm font-semibold text-white">
              {cut.title}
            </Text>
            <CutterReading label="Offset" value={cut.offset} />
            <CutterReading label="Plunge" value={cut.plunge} />
            <CutterReading label="Stop" value={cut.stop} />
            <Text className="text-sm text-ink-50">{cut.setup}</Text>
          </View>
        ))}
      </Surface>

      <Surface className="gap-3">
        <Text className="text-base font-semibold" style={{ color: rose }}>
          All dimensions
        </Text>
        {mobileDimensionRows.map(([label, value, note]) => (
          <View key={`${label}-${value}`} className="gap-0.5 py-1">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-sm text-ink-60">{label}</Text>
              <Text className="shrink text-right text-sm font-semibold text-white">
                {value}
              </Text>
            </View>
            <Text className="text-sm text-ink-50">{note}</Text>
          </View>
        ))}
      </Surface>
    </View>
  );
}
