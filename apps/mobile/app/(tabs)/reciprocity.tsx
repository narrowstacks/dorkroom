import { useReciprocityCalculator } from '@dorkroom/logic';
import { Text } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { OptionRow } from '@/components/option-row';
import { ResultRow } from '@/components/result-row';
import { Screen } from '@/components/screen';

export default function ReciprocityScreen() {
  const {
    filmType,
    setFilmType,
    meteredTime,
    setMeteredTime,
    timeFormatError,
    calculation,
    formatTime,
    filmTypes,
  } = useReciprocityCalculator();

  const filmOptions = filmTypes.map((film) => ({
    label: film.label,
    value: film.value,
  }));

  return (
    <Screen>
      <Text className="text-2xl font-bold text-white">Reciprocity</Text>

      <GlassCard className="gap-4">
        <OptionRow
          label="Film"
          options={filmOptions}
          value={filmType}
          onChange={setFilmType}
        />
        <LabeledTextField
          label="Metered time"
          value={meteredTime}
          onChangeText={setMeteredTime}
          placeholder="e.g. 30s, 1m30s"
        />
        {timeFormatError ? (
          <Text className="text-amber-500">{timeFormatError}</Text>
        ) : null}
      </GlassCard>

      <GlassCard>
        {calculation ? (
          <>
            <ResultRow
              label="Corrected time"
              value={formatTime(calculation.adjustedTime)}
            />
            <ResultRow
              label="Metered time"
              value={formatTime(calculation.originalTime)}
            />
            <ResultRow label="Factor" value={calculation.factor.toFixed(2)} />
            <ResultRow
              label="Increase"
              value={`${calculation.percentageIncrease.toFixed(0)}%`}
            />
          </>
        ) : (
          <Text className="text-white/60">Enter a valid metered time.</Text>
        )}
      </GlassCard>
    </Screen>
  );
}
