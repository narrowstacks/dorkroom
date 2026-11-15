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
import { InsetGroup, InsetRow } from '@/components/inset-group';
import { NextStepRow } from '@/components/next-step-row';
import { PresetChipRow } from '@/components/preset-chip-row';
import { Readout } from '@/components/readout';
import { FilmPicker } from '@/components/reciprocity/film-picker';
import { ReciprocityChart } from '@/components/reciprocity/reciprocity-chart';
import { Screen } from '@/components/screen';
import { ScrubRow } from '@/components/scrub/scrub-row';
import { adaptiveTimeStep } from '@/components/scrub/scrub-value';
import { SectionLabel } from '@/components/section-label';
import { ShareButton } from '@/components/share-button';
import { Surface } from '@/components/surface';
import { useLinkOverrides } from '@/hooks/use-link-overrides';
import { useTimerRunActive } from '@/hooks/use-timer-run-active';
import { readingFromValues } from '@/lib/log-frame';
import { exposureTimerStep } from '@/lib/next-step';
import { openToolPath } from '@/lib/open-tool-path';
import { buildReciprocityShare } from '@/lib/share-text';
import { formatSignedTime } from '@/lib/signed-time';
import { spokenDuration, spokenSeconds } from '@/lib/spoken-time';

/** Metered times are written back as seconds the duration parser reads. */
const formatSeconds = (n: number) => `${n}s`;

interface StartTimerActionProps {
  seconds: number;
}

/**
 * "Start a 3m 8s exposure": loads the Process Timer with this time. While a run
 * is active it reads "Timer running" and just opens the timer, since a link
 * never replaces a run.
 */
function StartTimerAction({ seconds }: StartTimerActionProps) {
  const runActive = useTimerRunActive();
  // Rendering needs the label (`opened` is irrelevant to it); each press builds
  // the path with a fresh marker, so each opening is a new one.
  const shown = exposureTimerStep({ seconds, opened: 0, runActive });
  if (shown === null) return null;
  return (
    <NextStepRow
      symbol="timer"
      label={shown.label}
      detail={shown.detail}
      accessibilityHint={
        runActive
          ? 'A timer is running. Opens the Process Timer'
          : 'Opens the Process Timer with this time loaded'
      }
      onPress={() => {
        const step = exposureTimerStep({
          seconds,
          opened: Date.now(),
          runActive,
        });
        if (step) openToolPath(step.path);
      }}
    />
  );
}

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
          <>
            <SaveToRollAction
              reading={readingFromValues({
                shutterSpeed: calculation.adjustedTime,
              })}
              defaultNotes={`Reciprocity: metered ${formatTime(calculation.originalTime)} on ${calculation.filmName}`}
            />
            <StartTimerAction seconds={calculation.adjustedTime} />
          </>
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
          <Surface>
            <ReciprocityChart
              originalTime={calculation.originalTime}
              adjustedTime={calculation.adjustedTime}
              factor={calculation.factor}
              filmName={calculation.filmName}
              formatTime={formatTime}
            />
          </Surface>
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
