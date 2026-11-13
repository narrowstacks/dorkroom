import {
  EXPOSURE_TIME_MIN_SECONDS,
  parseReciprocityTime,
  RECIPROCITY_FACTOR_MAX,
  RECIPROCITY_FACTOR_MIN,
  reciprocityCalculatorLink,
  useReciprocityCalculator,
} from '@dorkroom/logic';
import { Text, View } from 'react-native';
import { SaveToRollAction } from '@/components/film-log/save-to-roll-action';
import { FormulaRow } from '@/components/formula-row';
import { GlassCard } from '@/components/glass-card';
import { InsetGroup, InsetRow } from '@/components/inset-group';
import { PresetChipRow } from '@/components/preset-chip-row';
import { Readout } from '@/components/readout';
import { FilmPicker } from '@/components/reciprocity/film-picker';
import { ReciprocityChart } from '@/components/reciprocity/reciprocity-chart';
import { Screen } from '@/components/screen';
import { ScrubRow } from '@/components/scrub/scrub-row';
import { adaptiveTimeStep } from '@/components/scrub/scrub-value';
import { SectionLabel } from '@/components/section-label';
import { ShareButton } from '@/components/share-button';
import { useLinkOverrides } from '@/hooks/use-link-overrides';
import { readingFromValues } from '@/lib/log-frame';
import { buildReciprocityShare } from '@/lib/share-text';
import { formatSignedTime } from '@/lib/signed-time';
import { spokenDuration, spokenSeconds } from '@/lib/spoken-time';

/** Metered times are written back as seconds the duration parser reads. */
const formatSeconds = (n: number) => `${n}s`;

interface ReciprocityScreenBodyProps {
  /** Values the screen was opened with (a Home answer or a deep link). */
  overrides?: ReturnType<typeof reciprocityCalculatorLink.read>;
}

function ReciprocityScreenBody({ overrides }: ReciprocityScreenBodyProps) {
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
  } = useReciprocityCalculator({ overrides });

  const films = filmTypes.map((f) => ({ label: f.label, value: f.value }));

  // Valid only when the text reads as a time now: the hook keeps the last
  // good calculation beside an empty or unreadable one.
  const addedTime = calculation
    ? calculation.adjustedTime - calculation.originalTime
    : 0;
  const parsedTime = parseReciprocityTime(meteredTime);
  // Zero parses but cannot be calculated, so it is not a result either.
  const valid = parsedTime !== null && parsedTime > 0 && calculation !== null;
  const readout =
    valid && calculation ? (
      <Readout
        accent="yellow"
        label="Adjusted exposure"
        value={formatTime(calculation.adjustedTime)}
        accessibilityValueText={[
          spokenDuration(formatTime(calculation.adjustedTime)),
          calculation.filmName,
          `factor ${calculation.factor.toFixed(2)}`,
          `${addedTime < 0 ? 'minus' : 'plus'} ${spokenDuration(
            formatTime(Math.abs(addedTime))
          )}, ${calculation.percentageIncrease.toFixed(0)} percent`,
        ].join(', ')}
        actions={
          <SaveToRollAction
            reading={readingFromValues({
              shutterSpeed: calculation.adjustedTime,
            })}
            defaultNotes={`Reciprocity: metered ${formatTime(calculation.originalTime)} on ${calculation.filmName}`}
          />
        }
        facts={[
          calculation.filmName,
          `factor ${calculation.factor.toFixed(2)}`,
          `${formatSignedTime(addedTime, formatTime)} (${calculation.percentageIncrease.toFixed(0)}%)`,
        ]}
      />
    ) : (
      <Readout
        accent="yellow"
        label="Adjusted exposure"
        value={null}
        note={
          timeFormatError ? (
            <Text className="text-amber-500">⚠ {timeFormatError}</Text>
          ) : (
            <Text className="text-ink-60">Enter a metered time.</Text>
          )
        }
      />
    );

  return (
    <Screen header={readout}>
      <InsetGroup>
        <View className="p-4">
          <FilmPicker films={films} value={filmType} onChange={setFilmType} />
        </View>
        {filmType === 'custom' ? (
          <ScrubRow
            label="Reciprocity factor"
            accent="yellow"
            value={customFactor}
            onChangeText={setCustomFactor}
            step={0.01}
            min={RECIPROCITY_FACTOR_MIN}
            max={RECIPROCITY_FACTOR_MAX}
            placeholder="1.3"
          />
        ) : null}
        <ScrubRow
          label="Metered time"
          accent="yellow"
          value={meteredTime}
          onChangeText={setMeteredTime}
          parse={parseReciprocityTime}
          format={formatSeconds}
          speakValue={spokenSeconds}
          step={adaptiveTimeStep}
          min={EXPOSURE_TIME_MIN_SECONDS}
          keyboardType="default"
          placeholder="Try 30s, 1m30s, or 2h"
        />
      </InsetGroup>
      <View className="gap-2">
        <SectionLabel>Common times</SectionLabel>
        <PresetChipRow
          accent="yellow"
          options={exposurePresets.map((n) => ({ label: `${n}s`, value: n }))}
          onSelect={(n) => setMeteredTime(`${n}s`)}
        />
      </View>

      {valid && calculation ? (
        <>
          <InsetGroup>
            <InsetRow
              label="Added exposure"
              value={`${formatTime(addedTime)} (${calculation.percentageIncrease.toFixed(0)}%)`}
            />
            <InsetRow
              label="Metered time"
              value={formatTime(calculation.originalTime)}
            />
            <InsetRow label="Factor" value={calculation.factor.toFixed(2)} />
          </InsetGroup>
          <FormulaRow
            formula={`${formatTime(calculation.originalTime)} ^ ${calculation.factor.toFixed(
              2
            )} = ${formatTime(calculation.adjustedTime)}`}
          />
          <ShareButton
            message={buildReciprocityShare({
              filmName: calculation.filmName,
              meteredTime: formatTime(calculation.originalTime),
              adjustedTime: formatTime(calculation.adjustedTime),
              addedTime: formatTime(addedTime),
              percentageIncrease: calculation.percentageIncrease,
              factor: calculation.factor,
            })}
          />
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
      ) : null}
    </Screen>
  );
}

export function ReciprocityScreen() {
  const { overrides, prefillId } = useLinkOverrides(reciprocityCalculatorLink);
  // Re-mounts on a new link: the shared hooks apply overrides on mount only.
  return <ReciprocityScreenBody key={prefillId} overrides={overrides} />;
}
