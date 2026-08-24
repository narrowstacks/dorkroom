import type { UseMatCalculatorReturn } from '@dorkroom/logic';
import { Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { ResultCard } from '@/components/result-card';
import { ResultStat } from '@/components/result-stat';
import { ACCENT } from '@/theme/accents';

interface MatResultsProps {
  fmt: UseMatCalculatorReturn['fmt'];
  windowW: number;
  windowH: number;
  guideBarCuts: UseMatCalculatorReturn['guideBarCuts'];
  dimensionRows: UseMatCalculatorReturn['dimensionRows'];
}

interface CutterReadingProps {
  label: string;
  value: string;
}

function CutterReading({ label, value }: CutterReadingProps) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-sm text-white/60">{label}</Text>
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
}: MatResultsProps) {
  return (
    <View className="gap-4">
      <ResultCard accent="cyan" className="gap-3">
        <ResultStat
          accent="cyan"
          label="Window opening"
          value={`${fmt(windowW)} × ${fmt(windowH)}`}
          helper="Sight opening, short point to short point"
        />
      </ResultCard>

      <GlassCard className="gap-3">
        <Text
          className="text-base font-semibold"
          style={{ color: ACCENT.cyan }}
        >
          Cutter guide-bar settings
        </Text>
        {guideBarCuts.map((cut) => (
          <View key={cut.title} className="gap-2 rounded-xl bg-white/5 p-4">
            <Text className="text-sm font-semibold text-white">
              {cut.title}
            </Text>
            <CutterReading label="Offset" value={cut.offset} />
            <CutterReading label="Plunge" value={cut.plunge} />
            <CutterReading label="Stop" value={cut.stop} />
            <Text className="text-sm text-white/50">{cut.setup}</Text>
          </View>
        ))}
      </GlassCard>

      <GlassCard className="gap-3">
        <Text
          className="text-base font-semibold"
          style={{ color: ACCENT.cyan }}
        >
          All dimensions
        </Text>
        {dimensionRows.map(([label, value, note]) => (
          <View key={`${label}-${value}`} className="gap-0.5 py-1">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-sm text-white/60">{label}</Text>
              <Text className="shrink text-right text-sm font-semibold text-white">
                {value}
              </Text>
            </View>
            <Text className="text-sm text-white/50">{note}</Text>
          </View>
        ))}
      </GlassCard>
    </View>
  );
}
