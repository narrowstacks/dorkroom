import { useMemo } from 'react';
import {
  CalculatorCard,
  CalculatorPageHeader,
  CalculatorStat,
  Select,
  TextInput,
  CalculatorNumberField,
  ResultRow,
} from '@dorkroom/ui';
import {
  useReciprocityCalculator,
  formatReciprocityTime,
  type ReciprocityCalculation,
  type SelectItem,
} from '@dorkroom/logic';

const HOW_TO_USE = [
  {
    title: 'Select your film type',
    description:
      'Pick from the built-in reciprocity profiles or switch to Custom to enter your own factor.',
  },
  {
    title: 'Enter the metered exposure',
    description:
      'Type the reading from your light meter. We accept times like 30s, 1m30s, or 2h.',
  },
  {
    title: 'Dial in the adjusted time',
    description:
      'Use the corrected exposure in the field. Larger increases mean you need more light during long exposures.',
  },
];

const RECIPROCITY_INSIGHTS = [
  {
    title: 'The reciprocity law',
    description:
      'Doubling the exposure time while halving the light should yield the same exposure — until extremely long or short exposures break the rule.',
  },
  {
    title: 'Why it fails',
    description:
      'Silver halide crystals respond less efficiently when photons arrive slowly. Long exposures need a boost to compensate for this drop-off.',
  },
  {
    title: 'Film specific behaviour',
    description:
      'Each emulsion curves differently. Slow films like Pan F stay linear longer, while high-speed stocks such as Delta 3200 drift sooner.',
  },
  {
    title: 'When it matters',
    description:
      'Night landscapes, astro work, interiors, and any exposure stretching past a second should consider reciprocity compensation.',
  },
];

interface TimeComparisonProps {
  calculation: ReciprocityCalculation;
}

function TimeComparison({ calculation }: TimeComparisonProps) {
  const maxWidth = Math.max(
    calculation.timeBarWidth,
    calculation.adjustedTimeBarWidth,
    1
  );

  const originalWidth = Math.max(
    (calculation.timeBarWidth / maxWidth) * 100,
    4
  );
  const adjustedWidth = Math.max(
    (calculation.adjustedTimeBarWidth / maxWidth) * 100,
    4
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
          Exposure comparison
        </p>
        <p className="text-sm text-white/70">
          Visualise the relative jump between your metered and corrected
          exposure times.
        </p>
      </div>
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>Metered</span>
            <span>{formatReciprocityTime(calculation.originalTime)}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white/60"
              style={{ width: `${originalWidth}%` }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>Adjusted</span>
            <span>{formatReciprocityTime(calculation.adjustedTime)}</span>
          </div>
          <div className="h-2 rounded-full bg-emerald-500/20">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${adjustedWidth}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReciprocityCalculatorPage() {
  const {
    filmType,
    setFilmType,
    meteredTime,
    setMeteredTime,
    setMeteredTimeDirectly,
    customFactor,
    setCustomFactor,
    formattedTime,
    timeFormatError,
    calculation,
    formatTime,
    filmTypes,
    exposurePresets,
  } = useReciprocityCalculator();

  const filmOptions = useMemo<SelectItem[]>(
    () => filmTypes.map(({ label, value }) => ({ label, value })),
    [filmTypes]
  );

  const parsedDisplay =
    formattedTime && formattedTime !== meteredTime
      ? `Parsed as: ${formattedTime}`
      : null;

  const addedExposure = calculation
    ? formatTime(
        Math.max(calculation.adjustedTime - calculation.originalTime, 0)
      )
    : '--';

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-12 sm:px-10">
      <CalculatorPageHeader
        eyebrow="Long Exposure Maths"
        title="Reciprocity Failure Calculator"
        description="Compensate for long exposure reciprocity the moment your meter starts to drift. Choose a film stock, enter the metered time, and we will do the power-curve maths for you."
      />

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-6">
          <CalculatorCard
            title="Reciprocity inputs"
            description="Select an emulsion, confirm or tweak its reciprocity factor, and log the reading from your meter."
          >
            <Select
              label="Film stock"
              selectedValue={filmType}
              onValueChange={setFilmType}
              items={filmOptions}
            />

            {filmType === 'custom' && (
              <CalculatorNumberField
                label="Reciprocity factor"
                value={customFactor}
                onChange={setCustomFactor}
                placeholder="1.3"
                step={0.1}
                helperText="Higher factors demand more compensation at longer exposures."
              />
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-white/90">
                <span className="font-medium">Metered exposure time</span>
              </div>
              <TextInput
                value={meteredTime}
                onValueChange={setMeteredTime}
                placeholder="Try 30s, 1m30s, or 2h"
              />
              <div className="flex flex-wrap gap-2">
                {exposurePresets.map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => setMeteredTimeDirectly(`${seconds}s`)}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white"
                  >
                    {formatReciprocityTime(seconds)}
                  </button>
                ))}
              </div>
              {timeFormatError && (
                <p className="text-xs font-medium text-rose-300">
                  {timeFormatError}
                </p>
              )}
              {!timeFormatError && parsedDisplay && (
                <p className="text-xs italic text-white/60">{parsedDisplay}</p>
              )}
            </div>
          </CalculatorCard>

          {calculation && (
            <CalculatorCard
              title="Reciprocity results"
              description="Apply this corrected exposure to balance reciprocity failure on your next frame."
              accent="emerald"
              padding="compact"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <CalculatorStat
                  label="Adjusted exposure"
                  value={formatTime(calculation.adjustedTime)}
                  helperText={`Recommended for ${calculation.filmName}`}
                  tone="emerald"
                />
                <CalculatorStat
                  label="Added exposure"
                  value={addedExposure}
                  helperText="% more time needed"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-sm text-white/80">
                {`${formatReciprocityTime(calculation.originalTime)} `}
                <span className="align-super text-xs font-semibold text-emerald-300">
                  {calculation.factor.toFixed(2)}
                </span>
                <span>{' = '}</span>
                <span className="font-semibold text-white">
                  {formatTime(calculation.adjustedTime)}
                </span>
              </div>

              <div className="space-y-2">
                <ResultRow
                  label="Film selection"
                  value={calculation.filmName || 'Custom profile'}
                />
                <ResultRow
                  label="Original time"
                  value={formatReciprocityTime(calculation.originalTime)}
                />
                <ResultRow
                  label="Adjustment factor"
                  value={calculation.factor.toFixed(2)}
                />
              </div>
            </CalculatorCard>
          )}
        </div>

        <div className="space-y-6">
          <CalculatorCard
            title="How to use this calculator"
            description="A quick tour of the steps so you can confirm you are feeding the right inputs before heading into the dark."
          >
            <ul className="space-y-3">
              {HOW_TO_USE.map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-sm font-semibold text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </CalculatorCard>

          <CalculatorCard
            title="Understanding reciprocity failure"
            description="Why your long exposure needs extra light and how the film responds once the reciprocity law breaks down."
          >
            <ul className="space-y-3">
              {RECIPROCITY_INSIGHTS.map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/60">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm text-white/75">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </CalculatorCard>
        </div>
      </div>
    </div>
  );
}
