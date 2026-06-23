import {
  type ApertureKey,
  apertureToKey,
  type CameraExposureFormState,
  type EquivalentExposure,
  EV_PRESETS,
  type ExposureComparison,
  type ExposureValueResult,
  formatAperture,
  formatShutterSpeed,
  type ISOKey,
  isoToKey,
  keyToAperture,
  keyToISO,
  keyToShutterSpeed,
  type ShutterSpeedKey,
  type SolveFor,
  STANDARD_APERTURES,
  STANDARD_ISOS,
  STANDARD_SHUTTER_SPEEDS,
  shutterSpeedToKey,
  useCameraExposureCalculator,
} from '@dorkroom/logic';
import { getRouteIcon, ResultRow, Select } from '@dorkroom/ui';
import {
  CalculatorCard,
  CalculatorLayout,
  CalculatorStat,
} from '@dorkroom/ui/calculator';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { type FC, useMemo, useState } from 'react';

const apertureOptions = STANDARD_APERTURES.map((a) => ({
  value: a.label,
  label: a.label,
}));

const shutterSpeedOptions = STANDARD_SHUTTER_SPEEDS.map((s) => ({
  value: s.label,
  label: s.label,
}));

const isoOptions = STANDARD_ISOS.map((i) => ({
  value: `ISO ${i.value}`,
  label: i.label,
}));

const solveForOptions = [
  { value: 'shutterSpeed', label: 'Shutter Speed' },
  { value: 'aperture', label: 'Aperture' },
  { value: 'iso', label: 'ISO' },
];

const HOW_TO_USE = [
  'Select your aperture, shutter speed, and ISO to see the current EV.',
  'Use the EV presets to set a scene brightness. Pick which value to solve for.',
  'Browse the equivalent exposures table for alternative settings at the same EV.',
  'Use the comparison section to see the stops difference between two exposures.',
];

const TIPS = [
  'EV (Exposure Value) describes scene brightness at ISO 100. Higher EV = brighter scene.',
  'The Sunny 16 rule: on a bright sunny day (EV 15), use f/16 at 1/ISO seconds.',
  'Each full stop doubles or halves the light — in aperture, shutter speed, or ISO.',
  'Equivalent exposures maintain the same amount of light hitting the film or sensor.',
];

interface EVPresetButtonProps {
  ev: number;
  label: string;
  description: string;
  onClick: (ev: number) => void;
}

const EVPresetButton: FC<EVPresetButtonProps> = ({
  ev,
  label,
  description,
  onClick,
}) => {
  const descId = `ev-preset-desc-${ev}`;
  return (
    <button
      type="button"
      onClick={() => onClick(ev)}
      className="rounded-lg px-3 py-2 text-left transition-colors border themed-button"
      title={description}
      aria-describedby={descId}
    >
      <span className="block text-sm font-medium">{label}</span>
      <span
        id={descId}
        className="block text-xs"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        EV {ev}
      </span>
    </button>
  );
};

function EVResultCard({
  exposureValue,
  values,
}: {
  exposureValue: ExposureValueResult;
  values: CameraExposureFormState;
}) {
  return (
    <CalculatorCard
      title="Exposure value"
      description="Scene brightness at ISO 100"
      accent="teal"
      padding="compact"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <CalculatorStat
          label="EV"
          value={exposureValue.isValid ? `${exposureValue.ev}` : '—'}
          helperText={exposureValue.description || 'Enter valid settings'}
          tone="teal"
        />
        <CalculatorStat
          label="Settings"
          value={exposureValue.isValid ? formatAperture(values.aperture) : '—'}
          helperText={
            exposureValue.isValid
              ? `${formatShutterSpeed(values.shutterSpeed)} · ISO ${values.iso}`
              : ''
          }
        />
      </div>

      <div className="rounded-2xl p-4 font-mono text-sm border border-secondary bg-background/20 text-primary text-center">
        EV = log
        <sub>2</sub>(N<sup>2</sup> &times; 100 / t &times; S) ={' '}
        <span className="font-semibold">
          {exposureValue.isValid ? exposureValue.ev : '—'}
        </span>
      </div>
    </CalculatorCard>
  );
}

function CameraExposureSidebar() {
  return (
    <CalculatorCard
      title="How this calculator works"
      padding="normal"
      className="bg-surface-muted/80"
    >
      <div className="space-y-6">
        <p
          className="text-[15px] leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          The exposure triangle links aperture, shutter speed, and ISO. Changing
          one requires adjusting another to maintain the same exposure. This
          calculator helps you find those relationships and compare different
          settings.
        </p>

        <div className="space-y-3">
          <h4
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            How to use
          </h4>
          <ol className="ml-5 space-y-2 list-decimal">
            {HOW_TO_USE.map((item) => (
              <li
                key={item}
                className="pl-2 text-[15px] leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {item}
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-3">
          <h4
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Tips
          </h4>
          <ul className="ml-5 space-y-2 list-disc">
            {TIPS.map((tip) => (
              <li
                key={tip}
                className="pl-2 text-[15px] leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </CalculatorCard>
  );
}

function EquivalentExposuresCard({
  equivalentExposures,
  exposureValue,
  iso,
}: {
  equivalentExposures: EquivalentExposure[];
  exposureValue: ExposureValueResult;
  iso: number;
}) {
  if (!exposureValue.isValid || equivalentExposures.length === 0) return null;
  return (
    <CalculatorCard
      title="Equivalent exposures"
      description={`Same EV ${exposureValue.ev} at ISO ${iso}`}
      accent="sky"
      padding="compact"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="border-b"
              style={{
                borderColor: 'var(--color-border-secondary)',
              }}
            >
              <th
                className="py-2 px-3 text-left font-medium"
                style={{ color: 'var(--color-on-accent-muted)' }}
              >
                Aperture
              </th>
              <th
                className="py-2 px-3 text-left font-medium"
                style={{ color: 'var(--color-on-accent-muted)' }}
              >
                Shutter Speed
              </th>
            </tr>
          </thead>
          <tbody>
            {equivalentExposures.map((eq) => (
              <tr
                key={eq.apertureLabel}
                className={`border-b ${eq.isCurrentSetting ? 'font-semibold' : ''}`}
                style={{
                  borderColor: 'var(--color-border-muted)',
                  backgroundColor: eq.isCurrentSetting
                    ? 'var(--color-surface-elevated)'
                    : undefined,
                  color: 'var(--color-on-accent)',
                }}
              >
                <td className="py-2 px-3">{eq.apertureLabel}</td>
                <td className="py-2 px-3">
                  {eq.shutterSpeedLabel}
                  {eq.isCurrentSetting && (
                    <span
                      className="ml-2 text-xs font-semibold"
                      style={{
                        color: 'var(--color-on-accent)',
                      }}
                    >
                      current
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p
        className="text-xs mt-2"
        style={{ color: 'var(--color-on-accent-muted)' }}
      >
        Shutter speeds rounded to the nearest dial setting
      </p>
    </CalculatorCard>
  );
}

function ExposureSettingsCard({
  values,
  set,
}: {
  values: CameraExposureFormState;
  set: UseCameraExposureCalculator['set'];
}) {
  return (
    <CalculatorCard
      title="Exposure settings"
      description="Set aperture, shutter speed, and ISO."
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            label="Aperture"
            selectedValue={apertureToKey(values.aperture)}
            onValueChange={(v) =>
              set('aperture', keyToAperture(v as ApertureKey))
            }
            items={apertureOptions}
            ariaLabel="Aperture"
          />
          <Select
            label="Shutter speed"
            selectedValue={shutterSpeedToKey(values.shutterSpeed)}
            onValueChange={(v) =>
              set('shutterSpeed', keyToShutterSpeed(v as ShutterSpeedKey))
            }
            items={shutterSpeedOptions}
            ariaLabel="Shutter speed"
          />
          <Select
            label="ISO"
            selectedValue={isoToKey(values.iso)}
            onValueChange={(v) => set('iso', keyToISO(v as ISOKey))}
            items={isoOptions}
            ariaLabel="ISO"
          />
        </div>
      </div>
    </CalculatorCard>
  );
}

function ExposureComparisonCard({
  values,
  set,
  comparison,
}: {
  values: CameraExposureFormState;
  set: UseCameraExposureCalculator['set'];
  comparison: ExposureComparison;
}) {
  return (
    <CalculatorCard
      title="Exposure comparison"
      description="Stops difference between exposure A (above) and exposure B"
      accent="violet"
      padding="compact"
    >
      {/* Comparison Inputs */}
      <div className="space-y-3">
        <h4
          className="text-xs font-semibold uppercase tracking-[0.25em]"
          style={{ color: 'var(--color-on-accent-soft)' }}
        >
          Exposure B
        </h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            label="Aperture"
            selectedValue={apertureToKey(values.compareAperture)}
            onValueChange={(v) =>
              set('compareAperture', keyToAperture(v as ApertureKey))
            }
            items={apertureOptions}
            ariaLabel="Compare aperture"
          />
          <Select
            label="Shutter"
            selectedValue={shutterSpeedToKey(values.compareShutterSpeed)}
            onValueChange={(v) =>
              set(
                'compareShutterSpeed',
                keyToShutterSpeed(v as ShutterSpeedKey)
              )
            }
            items={shutterSpeedOptions}
            ariaLabel="Compare shutter speed"
          />
          <Select
            label="ISO"
            selectedValue={isoToKey(values.compareIso)}
            onValueChange={(v) => set('compareIso', keyToISO(v as ISOKey))}
            items={isoOptions}
            ariaLabel="Compare ISO"
          />
        </div>
      </div>

      {comparison.isValid && (
        <div className="space-y-3 mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <CalculatorStat
              label="Stops difference"
              value={`${comparison.stopsDifference > 0 ? '+' : ''}${comparison.stopsDifference}`}
              helperText={
                comparison.stopsDifference > 0
                  ? 'A is darker than B'
                  : comparison.stopsDifference < 0
                    ? 'B is darker than A'
                    : 'Same exposure'
              }
              tone="default"
            />
            <div className="space-y-2">
              <ResultRow label="Exposure A" value={`EV ${comparison.evA}`} />
              <ResultRow label="Exposure B" value={`EV ${comparison.evB}`} />
            </div>
          </div>
        </div>
      )}
    </CalculatorCard>
  );
}

function EVPresetsCard({
  values,
  set,
  presetsOpen,
  onToggle,
  onPresetClick,
}: {
  values: CameraExposureFormState;
  set: UseCameraExposureCalculator['set'];
  presetsOpen: boolean;
  onToggle: () => void;
  onPresetClick: (ev: number) => void;
}) {
  return (
    <CalculatorCard
      title="EV presets"
      description="Select a lighting condition. The calculator adjusts the selected value to match."
      actions={
        <button
          type="button"
          onClick={onToggle}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          aria-expanded={presetsOpen}
          aria-label={presetsOpen ? 'Collapse presets' : 'Expand presets'}
        >
          {presetsOpen ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
      }
    >
      {presetsOpen && (
        <div className="space-y-4">
          <Select
            label="When selecting a preset, adjust"
            selectedValue={values.solveFor}
            onValueChange={(v) => set('solveFor', v as SolveFor)}
            items={solveForOptions}
            ariaLabel="Value to solve for"
          />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {EV_PRESETS.map((preset) => (
              <EVPresetButton
                key={preset.ev}
                ev={preset.ev}
                label={preset.label}
                description={preset.description}
                onClick={onPresetClick}
              />
            ))}
          </div>
        </div>
      )}
    </CalculatorCard>
  );
}

type UseCameraExposureCalculator = ReturnType<
  typeof useCameraExposureCalculator
>;

export default function CameraExposureCalculatorPage() {
  const [presetsOpen, setPresetsOpen] = useState(false);

  const {
    values,
    set,
    applyPreset,
    exposureValue,
    equivalentExposures,
    comparison,
  } = useCameraExposureCalculator();

  const results = useMemo(
    () => (
      <div className="space-y-6">
        {/* EV Result — desktop right column only */}
        <div className="hidden md:block">
          <EVResultCard exposureValue={exposureValue} values={values} />
        </div>

        {/* Equivalent Exposures — desktop right column only */}
        <div className="hidden md:block">
          <EquivalentExposuresCard
            equivalentExposures={equivalentExposures}
            exposureValue={exposureValue}
            iso={values.iso}
          />
        </div>

        {/* EV Presets — desktop right column only */}
        <div className="hidden md:block">
          <EVPresetsCard
            values={values}
            set={set}
            presetsOpen={presetsOpen}
            onToggle={() => setPresetsOpen((prev) => !prev)}
            onPresetClick={applyPreset}
          />
        </div>
      </div>
    ),
    [values, set, applyPreset, exposureValue, equivalentExposures, presetsOpen]
  );

  return (
    <CalculatorLayout
      title="Camera Exposure Calculator"
      icon={getRouteIcon('/exposure')}
      accentTone="teal"
      description={
        <>
          Balance aperture, shutter speed, and ISO for correct exposure.
          <br />
          Find equivalent exposures and compare settings across different
          lighting conditions.
        </>
      }
      sidebar={<CameraExposureSidebar />}
      results={results}
    >
      {/* Exposure Settings — always visible */}
      <ExposureSettingsCard values={values} set={set} />

      {/* EV Result — mobile only; on desktop this lives in the results column */}
      <div className="md:hidden">
        <EVResultCard exposureValue={exposureValue} values={values} />
      </div>

      {/* Equivalent Exposures — mobile only; on desktop this lives in the results column */}
      <div className="md:hidden">
        <EquivalentExposuresCard
          equivalentExposures={equivalentExposures}
          exposureValue={exposureValue}
          iso={values.iso}
        />
      </div>

      {/* Exposure Comparison — always visible */}
      <ExposureComparisonCard
        values={values}
        set={set}
        comparison={comparison}
      />

      {/* EV Presets — mobile only; on desktop this lives in the results column */}
      <div className="md:hidden">
        <EVPresetsCard
          values={values}
          set={set}
          presetsOpen={presetsOpen}
          onToggle={() => setPresetsOpen((prev) => !prev)}
          onPresetClick={applyPreset}
        />
      </div>
    </CalculatorLayout>
  );
}
