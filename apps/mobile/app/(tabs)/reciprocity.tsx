import { useReciprocityCalculator } from '@dorkroom/logic';
import { Text, View } from 'react-native';
import { FormulaRow } from '@/components/formula-row';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { PresetChipRow } from '@/components/preset-chip-row';
import { FilmPicker } from '@/components/reciprocity/film-picker';
import { ReciprocityChart } from '@/components/reciprocity/reciprocity-chart';
import { ResultCard } from '@/components/result-card';
import { ResultRow } from '@/components/result-row';
import { ResultStat } from '@/components/result-stat';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { ShareButton } from '@/components/share-button';
import { buildReciprocityShare } from '@/lib/share-text';

export default function ReciprocityScreen() {
  const {
    filmType,
    setFilmType,
    meteredTime,
    setMeteredTime,
    customFactor,
    setCustomFactor,
    timeFormatError,
    calculation,
    formatTime,
    exposurePresets,
    filmTypes,
  } = useReciprocityCalculator();

  const films = filmTypes.map((f) => ({ label: f.label, value: f.value }));

  return (
    <Screen>
      <GlassCard className="gap-4">
        <FilmPicker films={films} value={filmType} onChange={setFilmType} />

        {filmType === 'custom' ? (
          <LabeledTextField
            label="Reciprocity factor"
            value={customFactor}
            onChangeText={setCustomFactor}
            keyboardType="decimal-pad"
            placeholder="1.3"
          />
        ) : null}

        <LabeledTextField
          label="Metered time"
          value={meteredTime}
          onChangeText={setMeteredTime}
          placeholder="Try 30s, 1m30s, or 2h"
        />
        {timeFormatError ? (
          <Text className="text-amber-500">{timeFormatError}</Text>
        ) : null}

        <View className="gap-2">
          <SectionLabel>Common times</SectionLabel>
          <PresetChipRow
            options={exposurePresets.map((n) => ({ label: `${n}s`, value: n }))}
            onSelect={(n) => setMeteredTime(`${n}s`)}
          />
        </View>
      </GlassCard>

      {calculation ? (
        <>
          <ResultCard accent="amber" className="gap-3">
            <ResultStat
              accent="amber"
              label="Adjusted exposure"
              value={formatTime(calculation.adjustedTime)}
              helper={calculation.filmName}
            />
            <FormulaRow
              formula={`${formatTime(calculation.originalTime)} ^ ${calculation.factor.toFixed(
                2
              )} = ${formatTime(calculation.adjustedTime)}`}
            />
            <View>
              <ResultRow
                label="Added exposure"
                value={`${formatTime(
                  calculation.adjustedTime - calculation.originalTime
                )} (${calculation.percentageIncrease.toFixed(0)}%)`}
              />
              <ResultRow
                label="Metered time"
                value={formatTime(calculation.originalTime)}
              />
              <ResultRow label="Factor" value={calculation.factor.toFixed(2)} />
            </View>
            <ShareButton
              message={buildReciprocityShare({
                filmName: calculation.filmName,
                meteredTime: formatTime(calculation.originalTime),
                adjustedTime: formatTime(calculation.adjustedTime),
                factor: calculation.factor,
              })}
            />
          </ResultCard>
          <GlassCard>
            <ReciprocityChart
              originalTime={calculation.originalTime}
              adjustedTime={calculation.adjustedTime}
              factor={calculation.factor}
              filmName={calculation.filmName}
              formatTime={formatTime}
            />
          </GlassCard>
        </>
      ) : (
        <GlassCard>
          <Text className="text-white/60">Enter a valid metered time.</Text>
        </GlassCard>
      )}
    </Screen>
  );
}
