import {
  EXPOSURE_TIME_MAX_SECONDS,
  EXPOSURE_TIME_MIN_SECONDS,
  exposureCalculatorLink,
  inSeparatorOf,
  parseDecimalInput,
  parseExposureTime,
  STOPS_MAX,
  STOPS_MIN,
  useExposureCalculator,
} from '@dorkroom/logic';
import { useState } from 'react';
import { Text } from 'react-native';
import { StopLadder } from '@/components/exposure/stop-ladder';
import {
  formatStopsFact,
  LADDER_INCREMENTS,
  type LadderIncrementValue,
  spokenStops,
  storedStopsText,
} from '@/components/exposure/stop-ladder-logic';
import { FormulaRow } from '@/components/formula-row';
import { InsetGroup, InsetRow } from '@/components/inset-group';
import { Readout } from '@/components/readout';
import { Screen } from '@/components/screen';
import { ScrubRow } from '@/components/scrub/scrub-row';
import { adaptiveTimeStep } from '@/components/scrub/scrub-value';
import { ShareButton } from '@/components/share-button';
import { useLinkOverrides } from '@/hooks/use-link-overrides';
import { buildExposureShare } from '@/lib/share-text';
import { formatSignedTime } from '@/lib/signed-time';
import { spokenDuration, spokenSeconds } from '@/lib/spoken-time';

const DEFAULT_LADDER_STEP = LADDER_INCREMENTS[0].stops;

/** The stops text in words for VoiceOver ("plus one third stop"). */
const speakStops = (text: string): string => {
  const stops = parseDecimalInput(text);
  return Number.isFinite(stops) ? spokenStops(stops) : text;
};

interface ExposureScreenBodyProps {
  /** Values the screen was opened with (a Home answer or a deep link). */
  overrides?: ReturnType<typeof exposureCalculatorLink.read>;
}

function ExposureScreenBody({ overrides }: ExposureScreenBodyProps) {
  const {
    originalTime,
    setOriginalTime,
    stops,
    setStops,
    calculation,
    formatTime,
  } = useExposureCalculator({ overrides });
  const [increment, setIncrement] = useState<LadderIncrementValue>('third');
  const incrementStops =
    LADDER_INCREMENTS.find((i) => i.value === increment)?.stops ??
    DEFAULT_LADDER_STEP;

  // From the times, not 2^stopsValue, so a third reads ×1.260, not ×1.257.
  const multiplier = calculation
    ? calculation.newTimeValue / calculation.originalTimeValue
    : 1;
  // The ladder centres on what the text says, not on the last good result, so
  // it stays put when the base time is too short for a result.
  const parsedStops = parseDecimalInput(stops);
  const ladderStops = Number.isFinite(parsedStops) ? parsedStops : null;
  // The ladder needs a usable base time even while the stops text is mid-edit.
  const ladderBase = parseExposureTime(originalTime);

  const readout = calculation ? (
    <Readout
      accent="blue"
      label="New time"
      value={formatTime(calculation.newTimeValue)}
      accessibilityValueText={[
        spokenDuration(formatTime(calculation.newTimeValue)),
        calculation.stopsValue === 0
          ? 'no change in stops'
          : spokenStops(calculation.stopsValue),
        `times ${Number(multiplier.toFixed(2))}`,
      ].join(', ')}
      facts={[
        formatStopsFact(calculation.stopsValue),
        `×${multiplier.toFixed(3)}`,
        formatSignedTime(calculation.addedTime, formatTime),
      ]}
    />
  ) : (
    <Readout
      accent="blue"
      label="New time"
      value={null}
      note={
        <Text className="text-white/60">Enter a valid time and stops.</Text>
      }
    />
  );

  return (
    <Screen header={readout}>
      <InsetGroup>
        <ScrubRow
          label="Base time"
          unit="s"
          accent="blue"
          value={originalTime}
          onChangeText={setOriginalTime}
          step={adaptiveTimeStep}
          speakValue={spokenSeconds}
          min={EXPOSURE_TIME_MIN_SECONDS}
          max={EXPOSURE_TIME_MAX_SECONDS}
        />
      </InsetGroup>

      <InsetGroup>
        <ScrubRow
          label="Stops"
          accent="blue"
          value={stops}
          onChangeText={setStops}
          step={incrementStops}
          min={STOPS_MIN}
          max={STOPS_MAX}
          format={storedStopsText}
          speakValue={speakStops}
          keyboardType="default"
        />
        {ladderBase === null ? null : (
          <StopLadder
            accent="blue"
            baseSeconds={ladderBase}
            stops={ladderStops}
            formatTime={formatTime}
            increment={increment}
            onIncrementChange={setIncrement}
            onSelect={(next) =>
              setStops(inSeparatorOf(stops, storedStopsText(next)))
            }
          />
        )}
      </InsetGroup>

      {calculation ? (
        <>
          <InsetGroup>
            <InsetRow
              label={
                calculation.addedTime >= 0
                  ? 'Added exposure'
                  : 'Removed exposure'
              }
              value={formatTime(Math.abs(calculation.addedTime))}
            />
            <InsetRow
              label="Change"
              value={`${calculation.percentageIncrease.toFixed(0)}%`}
            />
            <InsetRow
              label="Original time"
              value={formatTime(calculation.originalTimeValue)}
            />
          </InsetGroup>
          <FormulaRow
            formula={`${originalTime} × 2^${calculation.stopsValue.toFixed(2)} = ${formatTime(
              calculation.newTimeValue
            )}`}
          />
          <ShareButton
            message={buildExposureShare({
              originalTime,
              newTime: formatTime(calculation.newTimeValue),
              stops: calculation.stopsValue,
              multiplier,
              addedTime: formatTime(Math.abs(calculation.addedTime)),
              addedLabel: calculation.addedTime >= 0 ? 'Added' : 'Removed',
              percentageIncrease: calculation.percentageIncrease,
            })}
          />
        </>
      ) : null}
    </Screen>
  );
}

export function ExposureScreen() {
  const { overrides, prefillId } = useLinkOverrides(exposureCalculatorLink);
  // Re-mounts on a new link: the shared hooks apply overrides on mount only.
  return <ExposureScreenBody key={prefillId} overrides={overrides} />;
}
